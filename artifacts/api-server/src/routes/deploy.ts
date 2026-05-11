import { Router } from "express";
import { db } from "@workspace/db";
import { serverConnectionsTable, registryAppsTable, showcaseAppsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

function isAdminUser(userId: string): boolean {
  const ids = (process.env.ADMIN_USER_IDS ?? "").split(",").map(s => s.trim()).filter(Boolean);
  return ids.includes(userId);
}

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeUrl(url: string) {
  return url.replace(/\/+$/, "");
}

async function coolifyFetch(coolifyUrl: string, apiKey: string, path: string, options: RequestInit = {}) {
  const base = normalizeUrl(coolifyUrl);
  const res  = await fetch(`${base}/api/v1${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(options.headers ?? {}),
    },
  });
  return res;
}

async function getConnection(userId: string) {
  const [conn] = await db
    .select()
    .from(serverConnectionsTable)
    .where(eq(serverConnectionsTable.userId, userId));
  return conn ?? null;
}

// ─── GET /api/deploy/server ─────────────────────────────────────────────────
router.get("/deploy/server", async (req, res) => {
  try {
    const conn = await getConnection(req.userId);
    if (!conn) return res.json({ connected: false });

    // Mask the API key — never return raw key to client
    const maskedKey = conn.coolifyApiKey.slice(0, 8) + "••••••••••••••••";
    return res.json({
      connected: true,
      name: conn.name,
      coolifyUrl: conn.coolifyUrl,
      apiKeyPreview: maskedKey,
      connectedAt: conn.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "deploy/server GET failed");
    return res.status(500).json({ error: "Could not load server connection" });
  }
});

// ─── POST /api/deploy/connect ───────────────────────────────────────────────
router.post("/deploy/connect", async (req, res) => {
  const { name, coolifyUrl, coolifyApiKey } = req.body as Record<string, string>;
  if (!coolifyUrl?.trim() || !coolifyApiKey?.trim()) {
    return res.status(400).json({ error: "Coolify URL and API key are required" });
  }

  // Test the connection before saving — try multiple endpoints across Coolify versions
  try {
    const url = coolifyUrl.trim();
    const key = coolifyApiKey.trim();

    // Try /healthcheck first (Coolify v4+), then /version (v3), then root ping
    const checks = [
      () => coolifyFetch(url, key, "/healthcheck"),
      () => coolifyFetch(url, key, "/version"),
      () => fetch(normalizeUrl(url), { signal: AbortSignal.timeout(8000) }),
    ];

    let reached = false;
    for (const check of checks) {
      try {
        const r = await check();
        // Any HTTP response (even 401/403) means the server is up
        if (r.status < 500) { reached = true; break; }
      } catch { /* try next */ }
    }

    if (!reached) {
      return res.status(400).json({
        error: "Could not reach your Coolify server. Make sure the URL is correct and Coolify is running.",
      });
    }
  } catch {
    return res.status(400).json({
      error: "Could not reach your Coolify server. Make sure the URL is correct and Coolify is running.",
    });
  }

  try {
    const existing = await getConnection(req.userId);
    if (existing) {
      await db
        .update(serverConnectionsTable)
        .set({
          name: name?.trim() || "My Server",
          coolifyUrl: normalizeUrl(coolifyUrl.trim()),
          coolifyApiKey: coolifyApiKey.trim(),
          updatedAt: new Date(),
        })
        .where(and(eq(serverConnectionsTable.userId, req.userId)));
    } else {
      await db.insert(serverConnectionsTable).values({
        userId: req.userId,
        name: name?.trim() || "My Server",
        coolifyUrl: normalizeUrl(coolifyUrl.trim()),
        coolifyApiKey: coolifyApiKey.trim(),
      });
    }
    return res.json({ ok: true, message: "Server connected successfully" });
  } catch (err) {
    req.log.error({ err }, "deploy/connect failed");
    return res.status(500).json({ error: "Failed to save server connection" });
  }
});

// ─── DELETE /api/deploy/server ──────────────────────────────────────────────
router.delete("/deploy/server", async (req, res) => {
  try {
    await db
      .delete(serverConnectionsTable)
      .where(eq(serverConnectionsTable.userId, req.userId));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "deploy/server DELETE failed");
    return res.status(500).json({ error: "Failed to disconnect server" });
  }
});

// ─── GET /api/deploy/health ─────────────────────────────────────────────────
router.get("/deploy/health", async (req, res) => {
  try {
    const conn = await getConnection(req.userId);
    if (!conn) return res.status(404).json({ error: "No server connected" });

    const testRes = await coolifyFetch(conn.coolifyUrl, conn.coolifyApiKey, "/healthcheck");
    const body    = await testRes.json().catch(() => ({}));
    return res.json({ ok: testRes.ok, status: testRes.status, body });
  } catch {
    return res.json({ ok: false, error: "Server unreachable" });
  }
});

// ─── GET /api/deploy/apps ───────────────────────────────────────────────────
router.get("/deploy/apps", async (req, res) => {
  try {
    const conn = await getConnection(req.userId);
    if (!conn) return res.status(404).json({ error: "No server connected" });

    const appsRes  = await coolifyFetch(conn.coolifyUrl, conn.coolifyApiKey, "/applications");
    if (!appsRes.ok) return res.status(appsRes.status).json({ error: "Failed to fetch apps from Coolify" });
    const apps = await appsRes.json();
    return res.json(apps);
  } catch (err) {
    req.log.error({ err }, "deploy/apps GET failed");
    return res.status(500).json({ error: "Failed to fetch apps" });
  }
});

// ─── POST /api/deploy/redeploy/:uuid ────────────────────────────────────────
router.post("/deploy/redeploy/:uuid", async (req, res) => {
  try {
    const conn = await getConnection(req.userId);
    if (!conn) return res.status(404).json({ error: "No server connected" });

    const deployRes = await coolifyFetch(
      conn.coolifyUrl,
      conn.coolifyApiKey,
      `/applications/${req.params.uuid}/deploy`,
      { method: "POST" },
    );
    const body = await deployRes.json().catch(() => ({}));
    return res.json({ ok: deployRes.ok, ...body });
  } catch (err) {
    req.log.error({ err }, "deploy/redeploy failed");
    return res.status(500).json({ error: "Failed to trigger redeploy" });
  }
});

// ─── GET /api/deploy/servers-list ───────────────────────────────────────────
router.get("/deploy/servers-list", async (req, res) => {
  try {
    const conn = await getConnection(req.userId);
    if (!conn) return res.status(404).json({ error: "No server connected" });
    const r = await coolifyFetch(conn.coolifyUrl, conn.coolifyApiKey, "/servers");
    const body = await r.json().catch(() => ([]));
    return res.json(Array.isArray(body) ? body : []);
  } catch (err) {
    req.log.error({ err }, "deploy/servers-list failed");
    return res.status(500).json({ error: "Failed to fetch servers" });
  }
});

// ─── GET /api/deploy/projects-list ──────────────────────────────────────────
router.get("/deploy/projects-list", async (req, res) => {
  try {
    const conn = await getConnection(req.userId);
    if (!conn) return res.status(404).json({ error: "No server connected" });
    const r = await coolifyFetch(conn.coolifyUrl, conn.coolifyApiKey, "/projects");
    const body = await r.json().catch(() => ([]));
    return res.json(Array.isArray(body) ? body : []);
  } catch (err) {
    req.log.error({ err }, "deploy/projects-list failed");
    return res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// ─── POST /api/deploy/provision ─────────────────────────────────────────────
// Body: { dockerImage, appName, serverUuid, projectUuid, domain?, portsExposes?, envVars? }
router.post("/deploy/provision", async (req, res) => {
  const { dockerImage, appName, serverUuid, projectUuid, domain, portsExposes, envVars } =
    req.body as Record<string, string>;

  if (!dockerImage?.trim() || !appName?.trim() || !serverUuid?.trim() || !projectUuid?.trim()) {
    return res.status(400).json({ error: "dockerImage, appName, serverUuid and projectUuid are required" });
  }

  try {
    const conn = await getConnection(req.userId);
    if (!conn) return res.status(404).json({ error: "No server connected" });

    const payload: Record<string, unknown> = {
      docker_image:       dockerImage.trim(),
      name:               appName.trim(),
      server_uuid:        serverUuid.trim(),
      project_uuid:       projectUuid.trim(),
      environment_name:   "production",
      instant_deploy:     true,
      ports_exposes:      portsExposes?.trim() || "80",
    };
    if (domain?.trim()) payload.domains = domain.startsWith("http") ? domain.trim() : `https://${domain.trim()}`;
    if (envVars?.trim()) payload.environment_variables = envVars.trim();

    const r = await coolifyFetch(conn.coolifyUrl, conn.coolifyApiKey, "/applications/dockerimage", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(r.status).json({ ok: false, error: body.message ?? body.error ?? `Coolify returned ${r.status}` });
    }

    // Auto-add to Showcase — every Forge-hosted app gets broadcast automatically
    try {
      const adminActive = isAdminUser(req.userId ?? "");
      const websiteUrl = domain?.trim()
        ? (domain.startsWith("http") ? domain.trim() : `https://${domain.trim()}`)
        : null;
      const domainClean = websiteUrl ? websiteUrl.replace(/^https?:\/\//, "") : null;
      const screenshotUrl = domainClean
        ? `https://image.thum.io/get/width/600/crop/500/noanimate/https://${domainClean}`
        : null;
      await db.insert(showcaseAppsTable).values({
        name: appName.trim(),
        tagline: "Hosted on 13 Moon Forge",
        description: "This app is hosted on 13 Moon Forge. Description coming soon.",
        websiteUrl,
        screenshotUrl,
        listingType: "hosted",
        isFeatured: false,
        isActive: adminActive,
        isPlaceholder: false,
        submittedBy: req.userId ?? null,
      });
    } catch (_e) {
      // Non-fatal
    }

    return res.json({ ok: true, ...body });
  } catch (err) {
    req.log.error({ err }, "deploy/provision failed");
    return res.status(500).json({ error: "Failed to provision app" });
  }
});

// ─── GET /api/registry ──────────────────────────────────────────────────────
router.get("/registry", async (req, res) => {
  try {
    const apps = await db
      .select()
      .from(registryAppsTable)
      .where(eq(registryAppsTable.status, "approved"))
      .orderBy(desc(registryAppsTable.createdAt));
    return res.json(apps);
  } catch (err) {
    req.log.error({ err }, "registry GET failed");
    return res.status(500).json({ error: "Failed to load registry" });
  }
});

// ─── POST /api/registry ─────────────────────────────────────────────────────
router.post("/registry", async (req, res) => {
  const { name, tagline, description, stack, githubUrl, dockerImage, submittedByName } =
    req.body as Record<string, string>;

  if (!name?.trim() || !tagline?.trim() || !description?.trim() || !stack?.trim()) {
    return res.status(400).json({ error: "name, tagline, description and stack are required" });
  }

  try {
    const [row] = await db
      .insert(registryAppsTable)
      .values({
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        stack: stack.trim(),
        githubUrl: githubUrl?.trim() || null,
        dockerImage: dockerImage?.trim() || null,
        submittedByUserId: req.userId,
        submittedByName: submittedByName?.trim() || null,
        status: "pending",
      })
      .returning();

    // ─── Webhook notification (Discord / Slack / custom) ──────────────────
    const webhookUrl = process.env.ADMIN_WEBHOOK_URL;
    if (webhookUrl) {
      const by = submittedByName?.trim() || req.userId;
      const payload = {
        // Discord-compatible format; Slack ignores unknown fields
        username: "13 Moon Forge",
        content: null,
        embeds: [{
          title: `📦 New App Submission: ${name.trim()}`,
          description: description.trim().slice(0, 300),
          color: 0xE8580A, // brand orange
          fields: [
            { name: "Tagline",  value: tagline.trim(),        inline: false },
            { name: "Stack",    value: stack.trim(),          inline: true  },
            { name: "Submitted by", value: by,                inline: true  },
            ...(githubUrl?.trim() ? [{ name: "GitHub", value: githubUrl.trim(), inline: false }] : []),
          ],
          footer: { text: `ID #${row.id} · status: pending` },
          timestamp: new Date().toISOString(),
        }],
      };
      // Fire-and-forget — don't block the response
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      }).catch((err) => req.log.warn({ err }, "registry webhook failed"));
    }

    return res.json({ ok: true, id: row.id });
  } catch (err) {
    req.log.error({ err }, "registry POST failed");
    return res.status(500).json({ error: "Failed to submit app" });
  }
});

export default router;
