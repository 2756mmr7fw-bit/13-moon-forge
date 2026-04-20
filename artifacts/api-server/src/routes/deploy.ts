import { Router } from "express";
import { db } from "@workspace/db";
import { serverConnectionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

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

  // Test the connection before saving
  try {
    const testRes = await coolifyFetch(coolifyUrl.trim(), coolifyApiKey.trim(), "/healthcheck");
    if (!testRes.ok) {
      return res.status(400).json({
        error: `Could not reach your Coolify server (status ${testRes.status}). Check the URL and try again.`,
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

export default router;
