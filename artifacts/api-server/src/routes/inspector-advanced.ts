import { Router } from "express";
import { createHmac, randomBytes, createHash } from "crypto";
import {
  db,
  inspectorAppsTable,
  inspectorReportsTable,
  inspectorIssuesTable,
  inspectorBaselinesTable,
  inspectorSchedulesTable,
  inspectorCiRunsTable,
} from "@workspace/db";
import { eq, and, desc, asc, lte } from "drizzle-orm";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function verifyCliToken(token: string): string | null {
  try {
    const secret = process.env.SESSION_SECRET ?? "forge-agent-secret";
    const decoded = Buffer.from(token, "base64url").toString();
    const lastColon = decoded.lastIndexOf(":");
    const sig = decoded.slice(lastColon + 1);
    const payload = decoded.slice(0, lastColon);
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    if (sig !== expected) return null;
    const parts = payload.split(":");
    if (parts.length < 2) return null;
    const ts = parseInt(parts[parts.length - 1]);
    if (Date.now() - ts > 365 * 24 * 60 * 60 * 1000) return null;
    return parts.slice(0, -1).join(":");
  } catch { return null; }
}

function getCliUserId(req: any): string | null {
  const auth = req.headers?.authorization as string | undefined;
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyCliToken(auth.slice(7));
}

function uid(req: any): string {
  return (req.user as { id: string }).id;
}

function authed(req: any): string | null {
  return req.user ? uid(req) : getCliUserId(req);
}

function nanoid(len = 16): string {
  return randomBytes(len).toString("base64url").slice(0, len);
}

// ── Alert sender ──────────────────────────────────────────────────────────────

async function sendAlerts(
  schedule: { alertEmail?: string | null; alertSlackWebhook?: string | null },
  appName: string,
  appUrl: string,
  errorCount: number,
  warnCount: number,
  reportId: string,
): Promise<void> {
  const reportUrl = `https://13moonforge.ai/app-inspector?report=${reportId}`;
  const summary = `${errorCount} error${errorCount !== 1 ? "s" : ""}${warnCount > 0 ? `, ${warnCount} warning${warnCount !== 1 ? "s" : ""}` : ""}`;

  // Email via Resend
  if (schedule.alertEmail && process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Forge Inspector <noreply@13moonforge.ai>",
        to: schedule.alertEmail,
        subject: `🚨 [Forge Inspector] ${appName} — ${summary}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h2 style="color:#e8611a;margin:0 0 16px">Forge Inspector Alert</h2>
            <p style="font-size:16px;margin:0 0 8px"><strong>${appName}</strong> has issues:</p>
            <p style="font-size:24px;font-weight:bold;margin:0 0 16px">${summary}</p>
            <p style="color:#666;margin:0 0 24px">Inspected: <a href="${appUrl}">${appUrl}</a></p>
            <a href="${reportUrl}" style="background:#e8611a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">View full report →</a>
            <p style="color:#999;font-size:12px;margin-top:24px">
              This alert was sent by Forge Inspector because issues were found during an inspection.<br>
              Manage alerts at <a href="https://13moonforge.ai/app-inspector">13moonforge.ai/app-inspector</a>
            </p>
          </div>
        `,
      }),
    }).catch(() => {});
  }

  // Slack via incoming webhook
  if (schedule.alertSlackWebhook) {
    await fetch(schedule.alertSlackWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `🚨 *${appName}* — ${summary}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `🚨 *Forge Inspector Alert*\n*${appName}* has ${summary}`,
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*URL:*\n<${appUrl}|${appUrl}>` },
              { type: "mrkdwn", text: `*Errors:* ${errorCount}\n*Warnings:* ${warnCount}` },
            ],
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "View Report →" },
                url: reportUrl,
                style: "danger",
              },
            ],
          },
        ],
      }),
    }).catch(() => {});
  }
}

// ── Compute diff between two reports ─────────────────────────────────────────

function computeDiff(
  prev: any[] | null,
  curr: any[],
): { newErrors: number; fixed: number; persistent: number; newItems: any[]; fixedItems: any[] } {
  if (!prev) return { newErrors: 0, fixed: 0, persistent: 0, newItems: [], fixedItems: [] };
  const sig = (f: any) => `${f.type}:${f.page ?? ""}:${f.message}`;
  const prevSet = new Set(prev.filter(f => f.type === "error" || f.type === "warn").map(sig));
  const currSet = new Set(curr.filter(f => f.type === "error" || f.type === "warn").map(sig));
  const newItems = curr.filter(f => (f.type === "error" || f.type === "warn") && !prevSet.has(sig(f)));
  const fixedItems = prev.filter(f => (f.type === "error" || f.type === "warn") && !currSet.has(sig(f)));
  const persistent = curr.filter(f => (f.type === "error" || f.type === "warn") && prevSet.has(sig(f))).length;
  return { newErrors: newItems.length, fixed: fixedItems.length, persistent, newItems, fixedItems };
}

// ══════════════════════════════════════════════════════════════════════════════
// ── VISUAL REGRESSION BASELINES ───────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/inspector/baselines/:appId
router.get("/inspector/baselines/:appId", async (req, res) => {
  const userId = authed(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const baselines = await db
    .select()
    .from(inspectorBaselinesTable)
    .where(and(eq(inspectorBaselinesTable.appId, req.params.appId), eq(inspectorBaselinesTable.userId, userId)))
    .orderBy(inspectorBaselinesTable.page, inspectorBaselinesTable.viewport);
  res.json({ baselines });
});

// POST /api/inspector/baselines — approve current screenshot as baseline
router.post("/inspector/baselines", async (req, res) => {
  const userId = authed(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { appId, page, viewport = "desktop", screenshotData } = req.body as {
    appId: string; page: string; viewport?: string; screenshotData: string;
  };
  if (!appId || !page || !screenshotData) { res.status(400).json({ error: "appId, page, screenshotData required" }); return; }

  const screenshotHash = createHash("sha256").update(screenshotData).digest("hex");
  const id = `bl_${nanoid()}`;

  // Upsert — one baseline per app × page × viewport
  const existing = await db
    .select({ id: inspectorBaselinesTable.id })
    .from(inspectorBaselinesTable)
    .where(and(
      eq(inspectorBaselinesTable.appId, appId),
      eq(inspectorBaselinesTable.userId, userId),
      eq(inspectorBaselinesTable.page, page),
      eq(inspectorBaselinesTable.viewport, viewport),
    ))
    .limit(1);

  if (existing.length > 0) {
    await db.update(inspectorBaselinesTable)
      .set({ screenshotHash, screenshotData, approvedAt: new Date() })
      .where(eq(inspectorBaselinesTable.id, existing[0].id));
    res.json({ ok: true, id: existing[0].id, updated: true });
  } else {
    await db.insert(inspectorBaselinesTable).values({
      id, userId, appId, page, viewport, screenshotHash, screenshotData,
    });
    res.json({ ok: true, id, updated: false });
  }
});

// GET /api/inspector/baselines-for-compare — CLI fetches baselines to compare against
router.get("/inspector/baselines-for-compare", async (req, res) => {
  const userId = getCliUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { appId } = req.query as { appId?: string };
  if (!appId) { res.json({ baselines: [] }); return; }
  const baselines = await db
    .select({ id: inspectorBaselinesTable.id, page: inspectorBaselinesTable.page, viewport: inspectorBaselinesTable.viewport, screenshotHash: inspectorBaselinesTable.screenshotHash })
    .from(inspectorBaselinesTable)
    .where(and(eq(inspectorBaselinesTable.appId, appId), eq(inspectorBaselinesTable.userId, userId)));
  res.json({ baselines });
});

// DELETE /api/inspector/baselines/:id
router.delete("/inspector/baselines/:id", async (req, res) => {
  const userId = uid(req);
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.delete(inspectorBaselinesTable)
    .where(and(eq(inspectorBaselinesTable.id, req.params.id), eq(inspectorBaselinesTable.userId, userId)));
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── SCHEDULES ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/inspector/schedules
router.get("/inspector/schedules", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const schedules = await db
    .select()
    .from(inspectorSchedulesTable)
    .where(eq(inspectorSchedulesTable.userId, uid(req)))
    .orderBy(desc(inspectorSchedulesTable.createdAt));
  res.json({ schedules });
});

// POST /api/inspector/schedules
router.post("/inspector/schedules", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { appId, intervalMinutes = 60, alertEmail, alertSlackWebhook, enabled = true } = req.body as {
    appId: string; intervalMinutes?: number; alertEmail?: string; alertSlackWebhook?: string; enabled?: boolean;
  };
  if (!appId) { res.status(400).json({ error: "appId required" }); return; }

  const nextRunAt = new Date(Date.now() + intervalMinutes * 60 * 1000);
  const id = `sched_${nanoid()}`;

  // Upsert per app
  const existing = await db
    .select({ id: inspectorSchedulesTable.id })
    .from(inspectorSchedulesTable)
    .where(and(eq(inspectorSchedulesTable.appId, appId), eq(inspectorSchedulesTable.userId, uid(req))))
    .limit(1);

  if (existing.length > 0) {
    await db.update(inspectorSchedulesTable)
      .set({ intervalMinutes, alertEmail: alertEmail ?? null, alertSlackWebhook: alertSlackWebhook ?? null, enabled, nextRunAt, updatedAt: new Date() })
      .where(eq(inspectorSchedulesTable.id, existing[0].id));
    res.json({ ok: true, id: existing[0].id });
  } else {
    await db.insert(inspectorSchedulesTable).values({
      id, userId: uid(req), appId, intervalMinutes, alertEmail: alertEmail ?? null,
      alertSlackWebhook: alertSlackWebhook ?? null, enabled, nextRunAt,
    });
    res.json({ ok: true, id });
  }
});

// DELETE /api/inspector/schedules/:id
router.delete("/inspector/schedules/:id", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.delete(inspectorSchedulesTable)
    .where(and(eq(inspectorSchedulesTable.id, req.params.id), eq(inspectorSchedulesTable.userId, uid(req))));
  res.json({ ok: true });
});

// GET /api/inspector/cli-schedules — CLI fetches pending scheduled runs
router.get("/inspector/cli-schedules", async (req, res) => {
  const userId = getCliUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const now = new Date();
  const due = await db
    .select()
    .from(inspectorSchedulesTable)
    .where(and(
      eq(inspectorSchedulesTable.userId, userId),
      eq(inspectorSchedulesTable.enabled, true),
      lte(inspectorSchedulesTable.nextRunAt, now),
    ));
  // Also fetch app details for each
  const apps = await db.select().from(inspectorAppsTable).where(eq(inspectorAppsTable.userId, userId));
  const appMap = Object.fromEntries(apps.map(a => [a.id, a]));
  const result = due.map(s => ({ ...s, app: appMap[s.appId] ?? null })).filter(s => s.app);
  res.json({ due: result });
});

// POST /api/inspector/cli-schedule-done — CLI marks a scheduled run as complete, advances nextRunAt
router.post("/inspector/cli-schedule-done", async (req, res) => {
  const userId = getCliUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { scheduleId, hadErrors } = req.body as { scheduleId: string; hadErrors: boolean };
  if (!scheduleId) { res.status(400).json({ error: "scheduleId required" }); return; }
  const [sched] = await db.select().from(inspectorSchedulesTable)
    .where(and(eq(inspectorSchedulesTable.id, scheduleId), eq(inspectorSchedulesTable.userId, userId)));
  if (!sched) { res.status(404).json({ error: "Not found" }); return; }

  await db.update(inspectorSchedulesTable).set({
    lastRunAt: new Date(),
    nextRunAt: new Date(Date.now() + sched.intervalMinutes * 60 * 1000),
    consecutiveFailures: hadErrors ? (sched.consecutiveFailures ?? 0) + 1 : 0,
    updatedAt: new Date(),
  }).where(eq(inspectorSchedulesTable.id, scheduleId));

  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── TRENDS ────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/inspector/trends/:appId
router.get("/inspector/trends/:appId", async (req, res) => {
  const userId = authed(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const reports = await db
    .select({
      id: inspectorReportsTable.id,
      inspectedAt: inspectorReportsTable.inspectedAt,
      errorCount: inspectorReportsTable.errorCount,
      warnCount: inspectorReportsTable.warnCount,
      pagesChecked: inspectorReportsTable.pagesChecked,
    })
    .from(inspectorReportsTable)
    .where(and(eq(inspectorReportsTable.userId, userId), eq(inspectorReportsTable.appId, req.params.appId)))
    .orderBy(asc(inspectorReportsTable.inspectedAt))
    .limit(30);
  res.json({ trends: reports });
});

// GET /api/inspector/all-trends — trend summary across all apps
router.get("/inspector/all-trends", async (req, res) => {
  const userId = authed(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const reports = await db
    .select({
      id: inspectorReportsTable.id,
      appId: inspectorReportsTable.appId,
      appName: inspectorReportsTable.appName,
      inspectedAt: inspectorReportsTable.inspectedAt,
      errorCount: inspectorReportsTable.errorCount,
      warnCount: inspectorReportsTable.warnCount,
    })
    .from(inspectorReportsTable)
    .where(eq(inspectorReportsTable.userId, userId))
    .orderBy(desc(inspectorReportsTable.inspectedAt))
    .limit(100);
  res.json({ trends: reports });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── REPORT SHARING ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/inspector/share/:reportId — generate shareable link
router.post("/inspector/share/:reportId", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [report] = await db
    .select({ id: inspectorReportsTable.id, shareId: inspectorReportsTable.shareId })
    .from(inspectorReportsTable)
    .where(and(eq(inspectorReportsTable.id, req.params.reportId), eq(inspectorReportsTable.userId, uid(req))));
  if (!report) { res.status(404).json({ error: "Not found" }); return; }

  let shareId = report.shareId;
  if (!shareId) {
    shareId = nanoid(20);
    await db.update(inspectorReportsTable).set({ shareId }).where(eq(inspectorReportsTable.id, report.id));
  }
  res.json({ ok: true, shareId, url: `https://13moonforge.ai/inspection/${shareId}` });
});

// GET /api/inspection/public/:shareId — public report (no auth)
router.get("/inspection/public/:shareId", async (req, res) => {
  const [report] = await db
    .select()
    .from(inspectorReportsTable)
    .where(eq(inspectorReportsTable.shareId, req.params.shareId));
  if (!report) { res.status(404).json({ error: "Not found or not shared" }); return; }
  // Return report minus userId
  const { userId: _uid, ...safe } = report;
  res.json({ report: safe });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── DIFF VIEW ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/inspector/diff/:reportId — diff this report vs previous for same app
router.get("/inspector/diff/:reportId", async (req, res) => {
  const userId = authed(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [report] = await db
    .select()
    .from(inspectorReportsTable)
    .where(and(eq(inspectorReportsTable.id, req.params.reportId), eq(inspectorReportsTable.userId, userId)));
  if (!report) { res.status(404).json({ error: "Not found" }); return; }

  // Find previous report for same app
  let prevFindings: any[] | null = null;
  if (report.appId) {
    const [prev] = await db
      .select({ findings: inspectorReportsTable.findings, inspectedAt: inspectorReportsTable.inspectedAt })
      .from(inspectorReportsTable)
      .where(and(
        eq(inspectorReportsTable.userId, userId),
        eq(inspectorReportsTable.appId, report.appId),
      ))
      .orderBy(desc(inspectorReportsTable.inspectedAt))
      .limit(2);
    // skip the current report itself — get 2 and pick the one that isn't this report
    const prevReports = await db
      .select({ id: inspectorReportsTable.id, findings: inspectorReportsTable.findings, inspectedAt: inspectorReportsTable.inspectedAt })
      .from(inspectorReportsTable)
      .where(and(
        eq(inspectorReportsTable.userId, userId),
        eq(inspectorReportsTable.appId, report.appId),
      ))
      .orderBy(desc(inspectorReportsTable.inspectedAt))
      .limit(10);
    const prevReport = prevReports.find(r => r.id !== report.id);
    if (prevReport) prevFindings = prevReport.findings as any[];
  }

  const diff = computeDiff(prevFindings, (report.findings as any[]) ?? []);
  res.json({ diff, reportId: report.id, appName: report.appName });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── WEBHOOK TRIGGER ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/inspector/webhook/:appId — trigger inspection via webhook (e.g. from Coolify/Vercel)
router.post("/inspector/webhook/:appId", async (req, res) => {
  const { secret } = req.body as { secret?: string };
  const [app] = await db
    .select()
    .from(inspectorAppsTable)
    .where(eq(inspectorAppsTable.id, req.params.appId));
  if (!app) { res.status(404).json({ error: "App not found" }); return; }
  if (app.webhookSecret && app.webhookSecret !== secret) {
    res.status(401).json({ error: "Invalid webhook secret" }); return;
  }

  // Return the CLI command for the deployment system to run
  res.json({
    ok: true,
    message: "Webhook received. Run the following CLI command on your computer to trigger inspection:",
    command: `node forge.js inspect "${app.name}"`,
    appName: app.name,
    appUrl: app.url,
  });
});

// POST /api/inspector/set-webhook-secret/:appId — generate a webhook secret
router.post("/inspector/set-webhook-secret/:appId", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const secret = randomBytes(24).toString("base64url");
  await db.update(inspectorAppsTable)
    .set({ webhookSecret: secret, updatedAt: new Date() })
    .where(and(eq(inspectorAppsTable.id, req.params.appId), eq(inspectorAppsTable.userId, uid(req))));
  res.json({ ok: true, secret });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── ALERT TRIGGER (called internally after report is saved) ──────────────────
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/inspector/internal/check-alerts — called by cli-report after saving
router.post("/inspector/internal/check-alerts", async (req, res) => {
  const { userId, appId, appName, appUrl, reportId, errorCount, warnCount } = req.body as {
    userId: string; appId?: string; appName: string; appUrl: string;
    reportId: string; errorCount: number; warnCount: number;
  };

  if (!appId || errorCount === 0) { res.json({ sent: false }); return; }

  const [schedule] = await db
    .select()
    .from(inspectorSchedulesTable)
    .where(and(eq(inspectorSchedulesTable.appId, appId), eq(inspectorSchedulesTable.userId, userId)))
    .limit(1);

  if (!schedule || (!schedule.alertEmail && !schedule.alertSlackWebhook)) {
    res.json({ sent: false }); return;
  }

  await sendAlerts(schedule, appName, appUrl, errorCount, warnCount, reportId);
  res.json({ sent: true });
});

// ── CI-run auth helper ─────────────────────────────────────────────────────────
function getCliUserId(req: any): string | null {
  const auth = req.headers?.authorization as string | undefined;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const secret = process.env.SESSION_SECRET ?? "forge-agent-secret";
    const decoded = Buffer.from(auth.slice(7), "base64url").toString();
    const lastColon = decoded.lastIndexOf(":");
    const sig = decoded.slice(lastColon + 1);
    const payload = decoded.slice(0, lastColon);
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    if (sig !== expected) return null;
    const parts = payload.split(":");
    if (parts.length < 2) return null;
    const ts = parseInt(parts[parts.length - 1]);
    if (Date.now() - ts > 365 * 24 * 60 * 60 * 1000) return null;
    return parts.slice(0, -1).join(":");
  } catch { return null; }
}

// ══════════════════════════════════════════════════════════════════════════════
// ── DASHBOARD — aggregate health across all apps ───────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/inspector/dashboard
router.get("/inspector/dashboard", async (req, res) => {
  const userId = authed(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const apps = await db.select().from(inspectorAppsTable).where(eq(inspectorAppsTable.userId, userId));
  const recentReports = await db
    .select({
      id: inspectorReportsTable.id,
      appId: inspectorReportsTable.appId,
      appName: inspectorReportsTable.appName,
      errorCount: inspectorReportsTable.errorCount,
      warnCount: inspectorReportsTable.warnCount,
      inspectedAt: inspectorReportsTable.inspectedAt,
      environment: inspectorReportsTable.environment,
    })
    .from(inspectorReportsTable)
    .where(eq(inspectorReportsTable.userId, userId))
    .orderBy(desc(inspectorReportsTable.inspectedAt))
    .limit(200);

  const openIssues = await db
    .select({ id: inspectorIssuesTable.id, appId: inspectorIssuesTable.appId, priority: inspectorIssuesTable.priority })
    .from(inspectorIssuesTable)
    .where(and(eq(inspectorIssuesTable.userId, userId), eq(inspectorIssuesTable.status, "open")));

  // Build per-app health summary
  const latestByApp: Record<string, typeof recentReports[0]> = {};
  for (const r of recentReports) {
    if (r.appId && !latestByApp[r.appId]) latestByApp[r.appId] = r;
  }

  const openByApp: Record<string, number> = {};
  for (const i of openIssues) {
    if (i.appId) openByApp[i.appId] = (openByApp[i.appId] ?? 0) + 1;
  }

  const appsHealth = apps.map(a => {
    const latest = latestByApp[a.id];
    const openCount = openByApp[a.id] ?? 0;
    const score = a.healthScore ?? (latest ? Math.max(0, 100 - (latest.errorCount ?? 0) * 20 - (latest.warnCount ?? 0) * 5) : null);
    return {
      id: a.id, name: a.name, url: a.url,
      healthScore: score,
      lastInspectedAt: latest?.inspectedAt ?? a.lastInspectedAt ?? null,
      lastErrors: latest?.errorCount ?? null,
      lastWarns: latest?.warnCount ?? null,
      openIssues: openCount,
      environment: latest?.environment ?? "production",
    };
  });

  const totalOpenIssues = openIssues.length;
  const criticalIssues = openIssues.filter(i => (i as any).priority === "critical").length;
  const appsAtRisk = appsHealth.filter(a => (a.healthScore ?? 100) < 60).length;
  const reportsThisWeek = recentReports.filter(r => Date.now() - new Date(r.inspectedAt).getTime() < 7 * 86400000).length;

  res.json({ appsHealth, totalOpenIssues, criticalIssues, appsAtRisk, reportsThisWeek, appCount: apps.length });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── APP REPORT HISTORY ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/inspector/app-reports/:appId — paginated report history for an app
router.get("/inspector/app-reports/:appId", async (req, res) => {
  const userId = authed(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const limit = Math.min(50, parseInt(req.query.limit as string ?? "20"));
  const reports = await db
    .select({
      id: inspectorReportsTable.id,
      appId: inspectorReportsTable.appId,
      appName: inspectorReportsTable.appName,
      appUrl: inspectorReportsTable.appUrl,
      source: inspectorReportsTable.source,
      status: inspectorReportsTable.status,
      environment: inspectorReportsTable.environment,
      buildSha: inspectorReportsTable.buildSha,
      inspectedAt: inspectorReportsTable.inspectedAt,
      pagesChecked: inspectorReportsTable.pagesChecked,
      errorCount: inspectorReportsTable.errorCount,
      warnCount: inspectorReportsTable.warnCount,
      shareId: inspectorReportsTable.shareId,
      recheckOf: inspectorReportsTable.recheckOf,
    })
    .from(inspectorReportsTable)
    .where(and(eq(inspectorReportsTable.userId, userId), eq(inspectorReportsTable.appId, req.params.appId)))
    .orderBy(desc(inspectorReportsTable.inspectedAt))
    .limit(limit);
  res.json({ reports });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── ISSUES LIST (cross-app) ────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/inspector/issues-list — cross-app issue tracker with filters
router.get("/inspector/issues-list", async (req, res) => {
  const userId = authed(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { appId, status, priority } = req.query as { appId?: string; status?: string; priority?: string };

  const conditions = [eq(inspectorIssuesTable.userId, userId)];
  if (appId) conditions.push(eq(inspectorIssuesTable.appId, appId));
  if (status) conditions.push(eq(inspectorIssuesTable.status, status));
  if (priority) conditions.push(eq(inspectorIssuesTable.priority, priority));

  const issues = await db
    .select()
    .from(inspectorIssuesTable)
    .where(and(...conditions))
    .orderBy(desc(inspectorIssuesTable.createdAt))
    .limit(100);

  res.json({ issues });
});

// PATCH /api/inspector/issues/:id — update status + priority
router.patch("/inspector/issues/:id", async (req, res) => {
  const userId = authed(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { status, priority } = req.body as { status?: string; priority?: string };
  const updates: Record<string, any> = {};
  if (status) {
    updates.status = status;
    updates.fixedAt = status === "fixed" ? new Date() : null;
  }
  if (priority) updates.priority = priority;
  await db.update(inspectorIssuesTable)
    .set(updates)
    .where(and(eq(inspectorIssuesTable.id, req.params.id), eq(inspectorIssuesTable.userId, userId)));
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── CI RUNS ───────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/inspector/ci-run — record a CI run result
router.post("/inspector/ci-run", async (req, res) => {
  const userId = getCliUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { appId, reportId, ciPlatform, branch, buildSha, prNumber, passed, errorCount, warnCount } = req.body as {
    appId: string; reportId?: string; ciPlatform?: string; branch?: string;
    buildSha?: string; prNumber?: string; passed: boolean; errorCount: number; warnCount: number;
  };
  if (!appId) { res.status(400).json({ error: "appId required" }); return; }

  const id = `ci_${randomBytes(8).toString("hex")}`;
  await db.insert(inspectorCiRunsTable).values({
    id, userId, appId,
    reportId: reportId ?? null,
    ciPlatform: ciPlatform ?? null,
    branch: branch ?? null,
    buildSha: buildSha ?? null,
    prNumber: prNumber ?? null,
    passed,
    errorCount: errorCount ?? 0,
    warnCount: warnCount ?? 0,
  });
  res.json({ ok: true, id });
});

// GET /api/inspector/ci-runs/:appId — CI run history for an app
router.get("/inspector/ci-runs/:appId", async (req, res) => {
  const userId = authed(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const runs = await db
    .select()
    .from(inspectorCiRunsTable)
    .where(and(eq(inspectorCiRunsTable.appId, req.params.appId), eq(inspectorCiRunsTable.userId, userId)))
    .orderBy(desc(inspectorCiRunsTable.createdAt))
    .limit(20);
  res.json({ runs });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── HEALTH SCORE ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/inspector/health/:appId — compute health score from recent reports
router.get("/inspector/health/:appId", async (req, res) => {
  const userId = authed(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const reports = await db
    .select({
      errorCount: inspectorReportsTable.errorCount,
      warnCount: inspectorReportsTable.warnCount,
      inspectedAt: inspectorReportsTable.inspectedAt,
    })
    .from(inspectorReportsTable)
    .where(and(eq(inspectorReportsTable.userId, userId), eq(inspectorReportsTable.appId, req.params.appId)))
    .orderBy(desc(inspectorReportsTable.inspectedAt))
    .limit(5);

  if (reports.length === 0) { res.json({ score: null, label: "No data" }); return; }

  const latest = reports[0];
  const score = Math.max(0, 100 - (latest.errorCount ?? 0) * 20 - (latest.warnCount ?? 0) * 5);
  const trend = reports.length >= 2
    ? (score > Math.max(0, 100 - (reports[1].errorCount ?? 0) * 20 - (reports[1].warnCount ?? 0) * 5) ? "up" : "down")
    : "stable";

  const label = score >= 90 ? "Healthy" : score >= 70 ? "Good" : score >= 50 ? "Fair" : score >= 30 ? "Poor" : "Critical";
  res.json({ score, label, trend, lastInspectedAt: latest.inspectedAt });
});

export default router;
