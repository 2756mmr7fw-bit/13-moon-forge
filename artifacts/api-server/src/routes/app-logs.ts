import { Router } from "express";
import { db, serverConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function getConn(userId: string) {
  const [conn] = await db
    .select()
    .from(serverConnectionsTable)
    .where(eq(serverConnectionsTable.userId, userId));
  return conn ?? null;
}

// ─── GET /api/app-logs/:uuid ──────────────────────────────────────────────────
// Fetches container logs for a specific Coolify app UUID.
router.get("/app-logs/:uuid", async (req, res) => {
  const { uuid } = req.params;
  const lines = Math.min(Number(req.query.lines ?? 100), 500);

  const conn = await getConn(req.userId);
  if (!conn) return res.status(400).json({ error: "No server connected" });

  try {
    const base = conn.coolifyUrl.replace(/\/+$/, "");
    const logsRes = await fetch(
      `${base}/api/v1/applications/${uuid}/logs?lines=${lines}`,
      {
        headers: {
          Authorization: `Bearer ${conn.coolifyApiKey}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!logsRes.ok) {
      return res.status(logsRes.status).json({ error: "Coolify returned error", logs: "" });
    }

    const data = await logsRes.json() as { logs?: string } | string;
    const logText = typeof data === "string" ? data : (data as { logs?: string }).logs ?? "";

    return res.json({ logs: logText, uuid });
  } catch (err) {
    req.log.error({ err }, "app-logs GET failed");
    return res.status(500).json({ error: "Failed to fetch logs", logs: "" });
  }
});

// ─── POST /api/app-logs/:uuid/restart ─────────────────────────────────────────
// Triggers a Coolify redeploy for the given app UUID.
router.post("/app-logs/:uuid/restart", async (req, res) => {
  const { uuid } = req.params;
  const conn = await getConn(req.userId);
  if (!conn) return res.status(400).json({ error: "No server connected" });

  try {
    const base = conn.coolifyUrl.replace(/\/+$/, "");
    const r = await fetch(
      `${base}/api/v1/deploy?uuid=${uuid}&force=false`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${conn.coolifyApiKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    );
    const data = await r.json() as unknown;
    return res.json(data);
  } catch (err) {
    req.log.error({ err }, "app restart failed");
    return res.status(500).json({ error: "Restart failed" });
  }
});

export default router;
