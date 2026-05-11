import { Router } from "express";
import { db, serverConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function normalizeUrl(url: string) {
  return url.replace(/\/+$/, "");
}

async function getConn(userId: string) {
  const [conn] = await db
    .select()
    .from(serverConnectionsTable)
    .where(eq(serverConnectionsTable.userId, userId));
  return conn ?? null;
}

function coolifyFetch(coolifyUrl: string, apiKey: string, path: string, options?: RequestInit) {
  const base = normalizeUrl(coolifyUrl);
  return fetch(`${base}/api/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    signal: AbortSignal.timeout(8000),
  });
}

// GET /api/coolify/envs/:appId — list env vars for an app
router.get("/coolify/envs/:appId", async (req, res) => {
  const conn = await getConn(req.userId);
  if (!conn) return res.status(400).json({ error: "No Coolify connection" });

  const { appId } = req.params;
  const kind = (req.query.kind as string) ?? "app";

  try {
    const path = kind === "service"
      ? `/services/${appId}/envs`
      : `/applications/${appId}/envs`;

    const r = await coolifyFetch(conn.coolifyUrl, conn.coolifyApiKey, path);
    if (!r.ok) {
      req.log.warn({ status: r.status }, "coolify envs fetch failed");
      return res.status(r.status).json({ error: `Coolify returned ${r.status}` });
    }

    const data = await r.json() as unknown;
    return res.json(data);
  } catch (err) {
    req.log.error({ err }, "coolify envs GET failed");
    return res.status(500).json({ error: "Failed to fetch env vars" });
  }
});

// POST /api/coolify/envs/:appId — bulk save env vars
router.post("/coolify/envs/:appId", async (req, res) => {
  const conn = await getConn(req.userId);
  if (!conn) return res.status(400).json({ error: "No Coolify connection" });

  const { appId } = req.params;
  const kind = (req.query.kind as string) ?? "app";
  const { envs } = req.body as { envs?: Array<{ id?: number; key: string; value: string }> };

  if (!Array.isArray(envs)) return res.status(400).json({ error: "envs array required" });

  try {
    const basePath = kind === "service"
      ? `/services/${appId}/envs`
      : `/applications/${appId}/envs`;

    // Coolify uses PUT for bulk update (replaces all envs)
    const r = await coolifyFetch(conn.coolifyUrl, conn.coolifyApiKey, `${basePath}/bulk`, {
      method: "PUT",
      body: JSON.stringify({
        data: envs.map(e => ({ key: e.key, value: e.value, is_preview: false, is_build_time: false })),
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      req.log.warn({ status: r.status, text }, "coolify envs save failed");
      return res.status(r.status).json({ error: `Coolify returned ${r.status}` });
    }

    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "coolify envs POST failed");
    return res.status(500).json({ error: "Failed to save env vars" });
  }
});

export default router;
