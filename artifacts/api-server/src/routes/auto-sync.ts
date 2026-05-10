import { Router } from "express";
import { createCipheriv, randomBytes, createHash } from "crypto";
import { db, appSecretsTable, serverConnectionsTable, reposTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// ── Encryption (mirrors secrets.ts) ──────────────────────────────────────────

function getEncKey(): Buffer {
  const raw = process.env.SESSION_SECRET ?? "forge-default-secret-change-in-prod";
  return createHash("sha256").update(raw).digest();
}

function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), encrypted.toString("hex"), tag.toString("hex")].join(":");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function coolifyGet(coolifyUrl: string, apiKey: string, path: string) {
  try {
    const r = await fetch(`${coolifyUrl}/api/v1${path}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch {
    return null;
  }
}

async function getUserCoolify(userId: string) {
  const [conn] = await db
    .select()
    .from(serverConnectionsTable)
    .where(eq(serverConnectionsTable.userId, userId));
  return conn ?? null;
}

async function upsertSecret(
  userId: string,
  appName: string,
  serviceName: string,
  keyName: string,
  value: string,
  note: string,
  force: boolean,
): Promise<"saved" | "skipped"> {
  const key = keyName.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  const existing = await db
    .select()
    .from(appSecretsTable)
    .where(and(
      eq(appSecretsTable.userId, userId),
      eq(appSecretsTable.appName, appName),
      eq(appSecretsTable.keyName, key),
    ))
    .then(r => r[0] ?? null);

  if (existing && !force) return "skipped";

  const encryptedValue = encrypt(value);
  if (existing) {
    await db.update(appSecretsTable)
      .set({ encryptedValue, notes: note, updatedAt: new Date() })
      .where(eq(appSecretsTable.id, existing.id));
  } else {
    await db.insert(appSecretsTable).values({
      userId,
      appName,
      serviceName,
      keyName: key,
      encryptedValue,
      notes: note,
    });
  }
  return "saved";
}

// ── GET /api/auto-sync/status ─────────────────────────────────────────────────

router.get("/auto-sync/status", async (req, res) => {
  const userId = req.userId;
  try {
    const conn = await getUserCoolify(userId);
    const secrets = await db
      .select()
      .from(appSecretsTable)
      .where(eq(appSecretsTable.userId, userId));

    const fromCoolify = secrets.filter(s => s.notes?.includes("Coolify")).length;
    const repos = await db.select().from(reposTable);

    let coolifyAppCount = 0;
    if (conn) {
      const [apps, services] = await Promise.all([
        coolifyGet(conn.coolifyUrl, conn.coolifyApiKey, "/applications"),
        coolifyGet(conn.coolifyUrl, conn.coolifyApiKey, "/services"),
      ]);
      coolifyAppCount =
        (Array.isArray(apps) ? apps.length : 0) +
        (Array.isArray(services) ? services.length : 0);
    }

    return res.json({
      coolify: {
        connected: !!conn,
        url: conn?.coolifyUrl ?? null,
        name: conn?.name ?? null,
        appCount: coolifyAppCount,
      },
      vault: {
        totalRepos: repos.length,
      },
      secrets: {
        total: secrets.length,
        fromCoolify,
      },
    });
  } catch (err) {
    req.log.error({ err }, "auto-sync status failed");
    return res.status(500).json({ error: "Status check failed" });
  }
});

// ── POST /api/auto-sync/pull-coolify-envs ─────────────────────────────────────
// Pull env vars from ALL Coolify apps + services → save to Secrets Vault

router.post("/auto-sync/pull-coolify-envs", async (req, res) => {
  const userId = req.userId;
  const { force = false } = req.body as { force?: boolean };

  const conn = await getUserCoolify(userId);
  if (!conn) return res.status(404).json({ error: "No Coolify server connected" });

  const { coolifyUrl, coolifyApiKey } = conn;

  const [appsRaw, servicesRaw] = await Promise.all([
    coolifyGet(coolifyUrl, coolifyApiKey, "/applications"),
    coolifyGet(coolifyUrl, coolifyApiKey, "/services"),
  ]);

  type CoolifyApp = { uuid: string; name: string };
  const allApps: Array<CoolifyApp & { kind: "application" | "service" }> = [];

  if (Array.isArray(appsRaw)) {
    for (const a of appsRaw as CoolifyApp[]) {
      if (a.uuid && a.name) allApps.push({ ...a, kind: "application" });
    }
  }
  if (Array.isArray(servicesRaw)) {
    for (const s of servicesRaw as CoolifyApp[]) {
      if (s.uuid && s.name) allApps.push({ ...s, kind: "service" });
    }
  }

  let totalSaved = 0;
  let totalSkipped = 0;
  const results: Array<{ app: string; saved: number; skipped: number }> = [];

  for (const app of allApps) {
    const envs = await coolifyGet(coolifyUrl, coolifyApiKey, `/applications/${app.uuid}/envs`);
    if (!Array.isArray(envs)) continue;

    let appSaved = 0;
    let appSkipped = 0;

    for (const env of envs as Array<{ key?: string; name?: string; value?: string; real_value?: string }>) {
      const keyName = env.key ?? env.name ?? "";
      const value = env.value ?? env.real_value ?? "";
      if (!keyName || !value) continue;

      const outcome = await upsertSecret(
        userId,
        app.name,
        "Coolify",
        keyName,
        value,
        `Auto-synced from Coolify (${app.kind})`,
        force,
      );

      if (outcome === "saved") appSaved++;
      else appSkipped++;
    }

    totalSaved += appSaved;
    totalSkipped += appSkipped;
    results.push({ app: app.name, saved: appSaved, skipped: appSkipped });
  }

  req.log.info({ userId, totalSaved, totalSkipped, apps: allApps.length }, "Coolify env pull complete");
  return res.json({ ok: true, totalApps: allApps.length, saved: totalSaved, skipped: totalSkipped, results });
});

// ── POST /api/auto-sync/pull-coolify-envs/:appUuid ────────────────────────────
// Pull env vars for one specific Coolify app UUID

router.post("/auto-sync/pull-coolify-envs/:appUuid", async (req, res) => {
  const userId = req.userId;
  const { appUuid } = req.params as { appUuid: string };
  const { appName, force = false } = req.body as { appName?: string; force?: boolean };

  const conn = await getUserCoolify(userId);
  if (!conn) return res.status(404).json({ error: "No Coolify server connected" });

  const envs = await coolifyGet(conn.coolifyUrl, conn.coolifyApiKey, `/applications/${appUuid}/envs`);
  if (!Array.isArray(envs)) {
    return res.status(502).json({ error: "Could not fetch env vars from Coolify" });
  }

  const name = appName || appUuid;
  let saved = 0;
  let skipped = 0;

  for (const env of envs as Array<{ key?: string; name?: string; value?: string; real_value?: string }>) {
    const keyName = env.key ?? env.name ?? "";
    const value = env.value ?? env.real_value ?? "";
    if (!keyName || !value) continue;

    const outcome = await upsertSecret(userId, name, "Coolify", keyName, value, "Auto-synced from Coolify", force);
    if (outcome === "saved") saved++;
    else skipped++;
  }

  return res.json({ ok: true, saved, skipped, appName: name });
});

// ── POST /api/auto-sync/register-webhooks ─────────────────────────────────────
// Auto-register Code Vault push webhooks on all Forgejo repos

router.post("/auto-sync/register-webhooks", async (req, res) => {
  const FORGEJO_URL = process.env["FORGEJO_URL"] ?? process.env["FORGEJO_WRITE_TOKEN"] ? "" : "";
  const FORGEJO_TOKEN = process.env["FORGEJO_TOKEN"] ?? "";
  const FORGEJO_WRITE_TOKEN = process.env["FORGEJO_WRITE_TOKEN"] ?? FORGEJO_TOKEN;
  const TPTS_INBOUND_KEY = process.env["TPTS_INBOUND_KEY"] ?? "";
  const APP_URL = process.env["APP_URL"] ?? "https://13moonforge.ai";
  const FORGEJO_BASE = process.env["FORGEJO_URL"] ?? "https://git.13moonforge.ai";

  const token = FORGEJO_WRITE_TOKEN || FORGEJO_TOKEN;
  if (!FORGEJO_BASE || !token) {
    return res.status(503).json({ error: "Forgejo not configured (FORGEJO_URL / FORGEJO_TOKEN missing)" });
  }

  const repos = await db.select().from(reposTable);
  const webhookUrl = `${APP_URL}/api/code-vault/webhook`;

  let registered = 0;
  let skipped = 0;
  const results: Array<{ repo: string; status: "registered" | "exists" | "failed" }> = [];

  for (const repo of repos) {
    if (!repo.forgejoOwner || !repo.forgejoFullName) continue;
    const repoName = repo.name;
    const owner = repo.forgejoOwner;

    // Check existing hooks
    const hooksRes = await fetch(`${FORGEJO_BASE}/api/v1/repos/${owner}/${repoName}/hooks`, {
      headers: { Authorization: `token ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    }).catch(() => null);

    if (hooksRes?.ok) {
      const hooks = await hooksRes.json().catch(() => []) as Array<{ config?: { url?: string } }>;
      const alreadyHasHook = Array.isArray(hooks) && hooks.some(h => h.config?.url === webhookUrl);
      if (alreadyHasHook) {
        skipped++;
        results.push({ repo: repo.forgejoFullName, status: "exists" });
        continue;
      }
    }

    // Register the webhook
    const createRes = await fetch(`${FORGEJO_BASE}/api/v1/repos/${owner}/${repoName}/hooks`, {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        type: "forgejo",
        config: {
          url: webhookUrl,
          content_type: "json",
          secret: TPTS_INBOUND_KEY,
        },
        events: ["push"],
        active: true,
      }),
      signal: AbortSignal.timeout(8000),
    }).catch(() => null);

    if (createRes?.ok) {
      registered++;
      results.push({ repo: repo.forgejoFullName, status: "registered" });
    } else {
      results.push({ repo: repo.forgejoFullName, status: "failed" });
    }
  }

  req.log.info({ registered, skipped }, "Forgejo webhooks registered");
  return res.json({ ok: true, registered, skipped, results });
});

// ── POST /api/auto-sync/run-all ───────────────────────────────────────────────
// Run everything: pull Coolify envs + register webhooks

router.post("/auto-sync/run-all", async (req, res) => {
  const userId = req.userId;
  const { force = false } = req.body as { force?: boolean };

  const conn = await getUserCoolify(userId);

  let envsResult: { totalApps: number; saved: number; skipped: number } | null = null;
  let webhooksResult: { registered: number; skipped: number } | null = null;

  // Pull Coolify envs
  if (conn) {
    const [appsRaw, servicesRaw] = await Promise.all([
      coolifyGet(conn.coolifyUrl, conn.coolifyApiKey, "/applications"),
      coolifyGet(conn.coolifyUrl, conn.coolifyApiKey, "/services"),
    ]);

    type CoolifyApp = { uuid: string; name: string };
    const allApps: Array<CoolifyApp & { kind: string }> = [];
    if (Array.isArray(appsRaw)) for (const a of appsRaw as CoolifyApp[]) { if (a.uuid && a.name) allApps.push({ ...a, kind: "application" }); }
    if (Array.isArray(servicesRaw)) for (const s of servicesRaw as CoolifyApp[]) { if (s.uuid && s.name) allApps.push({ ...s, kind: "service" }); }

    let totalSaved = 0;
    let totalSkipped = 0;

    for (const app of allApps) {
      const envs = await coolifyGet(conn.coolifyUrl, conn.coolifyApiKey, `/applications/${app.uuid}/envs`);
      if (!Array.isArray(envs)) continue;
      for (const env of envs as Array<{ key?: string; name?: string; value?: string; real_value?: string }>) {
        const keyName = env.key ?? env.name ?? "";
        const value = env.value ?? env.real_value ?? "";
        if (!keyName || !value) continue;
        const outcome = await upsertSecret(userId, app.name, "Coolify", keyName, value, `Auto-synced from Coolify (${app.kind})`, force);
        if (outcome === "saved") totalSaved++; else totalSkipped++;
      }
    }
    envsResult = { totalApps: allApps.length, saved: totalSaved, skipped: totalSkipped };
  }

  // Register Forgejo webhooks
  const FORGEJO_BASE = process.env["FORGEJO_URL"] ?? "https://git.13moonforge.ai";
  const FORGEJO_TOKEN = process.env["FORGEJO_WRITE_TOKEN"] ?? process.env["FORGEJO_TOKEN"] ?? "";
  const TPTS_INBOUND_KEY = process.env["TPTS_INBOUND_KEY"] ?? "";
  const APP_URL = process.env["APP_URL"] ?? "https://13moonforge.ai";
  const webhookUrl = `${APP_URL}/api/code-vault/webhook`;

  if (FORGEJO_BASE && FORGEJO_TOKEN) {
    const repos = await db.select().from(reposTable);
    let registered = 0;
    let webhooksSkipped = 0;

    for (const repo of repos) {
      if (!repo.forgejoOwner || !repo.name) continue;
      const hooksRes = await fetch(`${FORGEJO_BASE}/api/v1/repos/${repo.forgejoOwner}/${repo.name}/hooks`, {
        headers: { Authorization: `token ${FORGEJO_TOKEN}`, Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);

      if (hooksRes?.ok) {
        const hooks = await hooksRes.json().catch(() => []) as Array<{ config?: { url?: string } }>;
        if (Array.isArray(hooks) && hooks.some(h => h.config?.url === webhookUrl)) {
          webhooksSkipped++;
          continue;
        }
      }

      const r = await fetch(`${FORGEJO_BASE}/api/v1/repos/${repo.forgejoOwner}/${repo.name}/hooks`, {
        method: "POST",
        headers: { Authorization: `token ${FORGEJO_TOKEN}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ type: "forgejo", config: { url: webhookUrl, content_type: "json", secret: TPTS_INBOUND_KEY }, events: ["push"], active: true }),
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);

      if (r?.ok) registered++;
    }
    webhooksResult = { registered, skipped: webhooksSkipped };
  }

  req.log.info({ envsResult, webhooksResult }, "auto-sync run-all complete");
  return res.json({ ok: true, envs: envsResult, webhooks: webhooksResult });
});

export default router;
