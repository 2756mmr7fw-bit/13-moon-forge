import { Router } from "express";
import { db } from "@workspace/db";
import { uptimeMonitorsTable, uptimeChecksTable, userAppsTable } from "@workspace/db";
import { eq, and, desc, gte, sql } from "drizzle-orm";

const router = Router();

const FORGE_DOMAIN = process.env.FORGE_DOMAIN ?? "13moonforge.ai";
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";

// ─── Uptime checker (runs in background) ─────────────────────────────────────

async function checkMonitor(monitor: typeof uptimeMonitorsTable.$inferSelect) {
  const start = Date.now();
  let status: "up" | "down" | "timeout" | "error" = "up";
  let statusCode: number | null = null;
  let error: string | null = null;
  let responseMs: number | null = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), monitor.timeoutMs);
    const res = await fetch(monitor.url, {
      method: monitor.method,
      signal: controller.signal,
      headers: { "User-Agent": "ForgeUptime/1.0" },
    });
    clearTimeout(timer);
    responseMs = Date.now() - start;
    statusCode = res.status;
    status = statusCode === monitor.expectedStatus ? "up" : "down";
    if (status === "down") error = `Expected ${monitor.expectedStatus}, got ${statusCode}`;
  } catch (e: unknown) {
    responseMs = Date.now() - start;
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("abort") || msg.includes("timeout")) {
      status = "timeout";
      error = `Timed out after ${monitor.timeoutMs}ms`;
    } else {
      status = "error";
      error = msg.slice(0, 200);
    }
  }

  // Store result
  await db.insert(uptimeChecksTable).values({
    monitorId: monitor.id,
    status,
    responseMs,
    statusCode,
    error,
  });

  // Compute rolling uptime % from last 100 checks
  const checks = await db
    .select({ status: uptimeChecksTable.status, responseMs: uptimeChecksTable.responseMs })
    .from(uptimeChecksTable)
    .where(eq(uptimeChecksTable.monitorId, monitor.id))
    .orderBy(desc(uptimeChecksTable.checkedAt))
    .limit(100);

  const upCount = checks.filter(c => c.status === "up").length;
  const uptimePercent = checks.length > 0 ? (upCount / checks.length) * 100 : null;
  const validMs = checks.map(c => c.responseMs).filter((v): v is number => v !== null);
  const avgResponseMs = validMs.length > 0
    ? Math.round(validMs.reduce((a, b) => a + b, 0) / validMs.length)
    : null;

  const wasDown = monitor.status === "down" || monitor.status === "unknown";
  const isNowUp = status === "up";
  const isNowDown = status !== "up";

  await db.update(uptimeMonitorsTable).set({
    status,
    lastCheckedAt: new Date(),
    uptimePercent,
    avgResponseMs,
    updatedAt: new Date(),
  }).where(eq(uptimeMonitorsTable.id, monitor.id));

  // Send email alert on status change
  if (monitor.alertOnDown && monitor.alertEmail && RESEND_API_KEY) {
    if (isNowDown && !wasDown) {
      await sendAlert(monitor.alertEmail, monitor.name, monitor.url, "down", error ?? "");
    } else if (isNowUp && wasDown) {
      await sendAlert(monitor.alertEmail, monitor.name, monitor.url, "up", "");
    }
  }
}

async function sendAlert(to: string, name: string, url: string, state: "up" | "down", detail: string) {
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Forge Monitor <alerts@${FORGE_DOMAIN}>`,
        to,
        subject: state === "down" ? `🔴 ${name} is DOWN` : `🟢 ${name} is back UP`,
        html: state === "down"
          ? `<p><strong>${name}</strong> (<code>${url}</code>) is <strong>DOWN</strong>.</p><p>Error: ${detail}</p>`
          : `<p><strong>${name}</strong> (<code>${url}</code>) is back <strong>UP</strong>.</p>`,
      }),
    });
  } catch { /* ignore email errors */ }
}

// Background polling loop
export function startUptimePoller() {
  setInterval(async () => {
    try {
      const monitors = await db
        .select()
        .from(uptimeMonitorsTable)
        .where(eq(uptimeMonitorsTable.paused, false));

      const now = Date.now();
      for (const monitor of monitors) {
        const lastCheck = monitor.lastCheckedAt ? monitor.lastCheckedAt.getTime() : 0;
        if (now - lastCheck >= monitor.intervalSeconds * 1000) {
          checkMonitor(monitor).catch(() => {});
        }
      }
    } catch { /* ignore */ }
  }, 30_000); // check every 30s which monitors are due
}

// ─── GET /api/uptime/monitors ─────────────────────────────────────────────────
router.get("/uptime/monitors", async (req, res) => {
  const monitors = await db
    .select()
    .from(uptimeMonitorsTable)
    .where(eq(uptimeMonitorsTable.userId, req.userId))
    .orderBy(desc(uptimeMonitorsTable.createdAt));
  return res.json({ monitors });
});

// ─── POST /api/uptime/monitors ────────────────────────────────────────────────
router.post("/uptime/monitors", async (req, res) => {
  const { name, url, method = "GET", intervalSeconds = 60, alertEmail, appId } = req.body as {
    name: string; url: string; method?: string;
    intervalSeconds?: number; alertEmail?: string; appId?: number;
  };

  if (!name || !url) return res.status(400).json({ error: "name and url required" });

  const [monitor] = await db.insert(uptimeMonitorsTable).values({
    userId: req.userId,
    name,
    url,
    method,
    intervalSeconds: Math.max(30, Math.min(3600, intervalSeconds)),
    alertEmail: alertEmail ?? null,
    appId: appId ?? null,
  }).returning();

  // Run first check immediately
  checkMonitor(monitor).catch(() => {});

  return res.json({ ok: true, monitor });
});

// ─── PATCH /api/uptime/monitors/:id ──────────────────────────────────────────
router.patch("/uptime/monitors/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { paused, alertEmail, intervalSeconds } = req.body as {
    paused?: boolean; alertEmail?: string; intervalSeconds?: number;
  };

  const update: Partial<typeof uptimeMonitorsTable.$inferInsert> = { updatedAt: new Date() };
  if (paused !== undefined) update.paused = paused;
  if (alertEmail !== undefined) update.alertEmail = alertEmail;
  if (intervalSeconds !== undefined) update.intervalSeconds = Math.max(30, Math.min(3600, intervalSeconds));

  await db.update(uptimeMonitorsTable)
    .set(update)
    .where(and(eq(uptimeMonitorsTable.id, id), eq(uptimeMonitorsTable.userId, req.userId)));

  return res.json({ ok: true });
});

// ─── DELETE /api/uptime/monitors/:id ─────────────────────────────────────────
router.delete("/uptime/monitors/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(uptimeChecksTable).where(eq(uptimeChecksTable.monitorId, id));
  await db.delete(uptimeMonitorsTable)
    .where(and(eq(uptimeMonitorsTable.id, id), eq(uptimeMonitorsTable.userId, req.userId)));
  return res.json({ ok: true });
});

// ─── GET /api/uptime/monitors/:id/checks ─────────────────────────────────────
router.get("/uptime/monitors/:id/checks", async (req, res) => {
  const id = parseInt(req.params.id);
  const [monitor] = await db
    .select()
    .from(uptimeMonitorsTable)
    .where(and(eq(uptimeMonitorsTable.id, id), eq(uptimeMonitorsTable.userId, req.userId)));
  if (!monitor) return res.status(404).json({ error: "Not found" });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h
  const checks = await db
    .select()
    .from(uptimeChecksTable)
    .where(and(eq(uptimeChecksTable.monitorId, id), gte(uptimeChecksTable.checkedAt, since)))
    .orderBy(desc(uptimeChecksTable.checkedAt))
    .limit(200);

  return res.json({ checks });
});

// ─── POST /api/uptime/monitors/:id/check ─────────────────────────────────────
// Manual ping
router.post("/uptime/monitors/:id/check", async (req, res) => {
  const id = parseInt(req.params.id);
  const [monitor] = await db
    .select()
    .from(uptimeMonitorsTable)
    .where(and(eq(uptimeMonitorsTable.id, id), eq(uptimeMonitorsTable.userId, req.userId)));
  if (!monitor) return res.status(404).json({ error: "Not found" });

  await checkMonitor(monitor);
  const [updated] = await db.select().from(uptimeMonitorsTable).where(eq(uptimeMonitorsTable.id, id));
  return res.json({ ok: true, monitor: updated });
});

// ─── GET /api/status/:subdomain  (PUBLIC status page) ────────────────────────
router.get("/status/:subdomain", async (req, res) => {
  const { subdomain } = req.params;

  const [app] = await db
    .select()
    .from(userAppsTable)
    .where(eq(userAppsTable.subdomain, subdomain));

  if (!app) return res.status(404).json({ error: "App not found" });

  const monitors = await db
    .select()
    .from(uptimeMonitorsTable)
    .where(and(eq(uptimeMonitorsTable.userId, app.userId), eq(uptimeMonitorsTable.appId, app.id)));

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // last 7 days
  const monitorsWithChecks = await Promise.all(monitors.map(async m => {
    const checks = await db
      .select({ status: uptimeChecksTable.status, checkedAt: uptimeChecksTable.checkedAt, responseMs: uptimeChecksTable.responseMs })
      .from(uptimeChecksTable)
      .where(and(eq(uptimeChecksTable.monitorId, m.id), gte(uptimeChecksTable.checkedAt, since)))
      .orderBy(desc(uptimeChecksTable.checkedAt))
      .limit(168); // 1 check per hour for 7 days
    return { ...m, recentChecks: checks };
  }));

  const allUp = monitorsWithChecks.every(m => m.status === "up");
  const anyDown = monitorsWithChecks.some(m => m.status === "down");
  const overallStatus = anyDown ? "down" : allUp ? "operational" : "degraded";

  return res.json({
    app: { name: app.name, subdomain: app.subdomain, url: app.url },
    status: overallStatus,
    monitors: monitorsWithChecks,
    generatedAt: new Date().toISOString(),
  });
});

// ─── GET /api/uptime/summary ──────────────────────────────────────────────────
router.get("/uptime/summary", async (req, res) => {
  const monitors = await db
    .select()
    .from(uptimeMonitorsTable)
    .where(eq(uptimeMonitorsTable.userId, req.userId));

  const total = monitors.length;
  const up    = monitors.filter(m => m.status === "up").length;
  const down  = monitors.filter(m => m.status === "down").length;

  return res.json({ total, up, down, unknown: total - up - down });
});

export default router;
