import { Router } from "express";
import { createHmac } from "crypto";
import { db, inspectorAppsTable, inspectorReportsTable, inspectorIssuesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

// ── CLI token verification ─────────────────────────────────────────────────────
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

function userId(req: any): string {
  return (req.user as { id: string }).id;
}

// ── Quill doc generator ────────────────────────────────────────────────────────
async function generateQuillDoc(
  appName: string,
  appUrl: string,
  findings: { type: string; message: string; page?: string; detail?: string }[],
): Promise<string> {
  const errors = findings.filter(f => f.type === "error");
  const warns = findings.filter(f => f.type === "warn");
  const oks = findings.filter(f => f.type === "ok");

  if (errors.length === 0 && warns.length === 0) {
    return `# ${appName} — Inspection Report\n\n**Status:** ✅ All clear — no issues found.\n\n**Inspected:** ${appUrl}\n**Pages passed:** ${oks.length}`;
  }

  const findingsList = [...errors, ...warns].map(f =>
    `- [${f.type.toUpperCase()}]${f.page ? ` ${f.page}` : ""}: ${f.message}${f.detail ? ` — ${f.detail}` : ""}`
  ).join("\n");

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 600,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `You are Quill, a precise technical scribe. Write a structured issue report for a web app inspection. Be concise and actionable. Use plain markdown. No fluff. Format: title, status summary, then a numbered list of issues with what the problem is and what to check. End with a "Next Steps" section.`,
        },
        {
          role: "user",
          content: `App: ${appName} (${appUrl})\n\nFindings:\n${findingsList}\n\nWrite the issue report.`,
        },
      ],
    });
    return resp.choices[0]?.message?.content ?? `# ${appName} — Issues Found\n\n${findingsList}`;
  } catch {
    return `# ${appName} — Inspection Report\n\n**Errors:** ${errors.length} | **Warnings:** ${warns.length}\n\n${findingsList}`;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ── APPS — Clerk-authenticated (web UI) ──────────────────────────────────────
// These are mounted at /api via app.use("/api", router), so paths omit /api
// ══════════════════════════════════════════════════════════════════════════════

router.get("/inspector/apps", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const uid = userId(req);
  const apps = await db
    .select()
    .from(inspectorAppsTable)
    .where(eq(inspectorAppsTable.userId, uid))
    .orderBy(desc(inspectorAppsTable.createdAt));
  res.json({ apps });
});

router.post("/inspector/apps", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const uid = userId(req);
  const body = req.body as {
    id?: string; name?: string; url?: string; loginUrl?: string;
    username?: string; usernameField?: string; passwordField?: string;
    loginMethod?: string; pages?: string[]; description?: string;
  };
  if (!body.name || !body.url) { res.status(400).json({ error: "name and url required" }); return; }
  const id = body.id ?? `app_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(inspectorAppsTable).values({
    id, userId: uid,
    name: body.name.trim(),
    url: body.url.trim().replace(/\/$/, ""),
    loginUrl: body.loginUrl?.trim() || null,
    username: body.username?.trim() || null,
    usernameField: body.usernameField?.trim() || "username",
    passwordField: body.passwordField?.trim() || "password",
    loginMethod: (body.loginMethod as "form" | "none") || "form",
    pages: body.pages ?? [],
    description: body.description?.trim() || null,
  });
  res.json({ ok: true, id });
});

router.put("/inspector/apps/:id", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const uid = userId(req);
  const body = req.body;
  await db.update(inspectorAppsTable)
    .set({
      name: body.name?.trim(),
      url: body.url?.trim().replace(/\/$/, ""),
      loginUrl: body.loginUrl?.trim() || null,
      username: body.username?.trim() || null,
      usernameField: body.usernameField?.trim() || "username",
      passwordField: body.passwordField?.trim() || "password",
      loginMethod: body.loginMethod || "form",
      pages: body.pages ?? [],
      description: body.description?.trim() || null,
      updatedAt: new Date(),
    })
    .where(and(eq(inspectorAppsTable.id, req.params.id), eq(inspectorAppsTable.userId, uid)));
  res.json({ ok: true });
});

router.delete("/inspector/apps/:id", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const uid = userId(req);
  await db.delete(inspectorAppsTable)
    .where(and(eq(inspectorAppsTable.id, req.params.id), eq(inspectorAppsTable.userId, uid)));
  res.json({ ok: true });
});

// Bulk sync from localStorage
router.post("/inspector/apps/sync", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const uid = userId(req);
  const { apps } = req.body as { apps: { id: string; name: string; url: string; loginUrl?: string; username?: string; usernameField?: string; passwordField?: string; loginMethod?: string; pages?: string[]; description?: string }[] };
  if (!Array.isArray(apps)) { res.status(400).json({ error: "apps array required" }); return; }
  for (const app of apps) {
    await db.insert(inspectorAppsTable)
      .values({
        id: app.id, userId: uid, name: app.name, url: app.url,
        loginUrl: app.loginUrl || null, username: app.username || null,
        usernameField: app.usernameField || "username", passwordField: app.passwordField || "password",
        loginMethod: (app.loginMethod as "form" | "none") || "form",
        pages: app.pages ?? [], description: app.description || null,
      })
      .onConflictDoUpdate({
        target: inspectorAppsTable.id,
        set: { name: app.name, url: app.url, updatedAt: new Date() },
      });
  }
  res.json({ ok: true, synced: apps.length });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── REPORTS — Clerk-authenticated ────────────────────────────────════════════
// ══════════════════════════════════════════════════════════════════════════════

router.get("/inspector/reports", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const uid = userId(req);
  const reports = await db
    .select({
      id: inspectorReportsTable.id, appId: inspectorReportsTable.appId,
      appName: inspectorReportsTable.appName, appUrl: inspectorReportsTable.appUrl,
      source: inspectorReportsTable.source, status: inspectorReportsTable.status,
      inspectedAt: inspectorReportsTable.inspectedAt, pagesChecked: inspectorReportsTable.pagesChecked,
      errorCount: inspectorReportsTable.errorCount, warnCount: inspectorReportsTable.warnCount,
      quillDoc: inspectorReportsTable.quillDoc, recheckOf: inspectorReportsTable.recheckOf,
    })
    .from(inspectorReportsTable)
    .where(eq(inspectorReportsTable.userId, uid))
    .orderBy(desc(inspectorReportsTable.inspectedAt))
    .limit(20);
  res.json({ reports });
});

router.get("/inspector/reports/:id", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const uid = userId(req);
  const [report] = await db
    .select()
    .from(inspectorReportsTable)
    .where(and(eq(inspectorReportsTable.id, req.params.id), eq(inspectorReportsTable.userId, uid)));
  if (!report) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ report });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── CLI-AUTHENTICATED ENDPOINTS ───────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// CLI fetches saved apps list
router.get("/inspector/cli-apps", async (req, res) => {
  const uid = getCliUserId(req);
  if (!uid) { res.status(401).json({ error: "Invalid CLI token" }); return; }
  const apps = await db
    .select()
    .from(inspectorAppsTable)
    .where(eq(inspectorAppsTable.userId, uid))
    .orderBy(inspectorAppsTable.name);
  res.json({ apps });
});

// CLI/mobile fetches recent reports list
router.get("/inspector/cli-reports", async (req, res) => {
  const uid = getCliUserId(req);
  if (!uid) { res.status(401).json({ error: "Invalid CLI token" }); return; }
  const reports = await db
    .select({
      id: inspectorReportsTable.id, appId: inspectorReportsTable.appId,
      appName: inspectorReportsTable.appName, appUrl: inspectorReportsTable.appUrl,
      inspectedAt: inspectorReportsTable.inspectedAt, pagesChecked: inspectorReportsTable.pagesChecked,
      errorCount: inspectorReportsTable.errorCount, warnCount: inspectorReportsTable.warnCount,
      source: inspectorReportsTable.source, quillDoc: inspectorReportsTable.quillDoc,
    })
    .from(inspectorReportsTable)
    .where(eq(inspectorReportsTable.userId, uid))
    .orderBy(desc(inspectorReportsTable.inspectedAt))
    .limit(15);
  res.json({ reports });
});

// CLI/mobile fetch single report by ID
router.get("/inspector/cli-reports/:id", async (req, res) => {
  const uid = getCliUserId(req);
  if (!uid) { res.status(401).json({ error: "Invalid CLI token" }); return; }
  const [report] = await db
    .select()
    .from(inspectorReportsTable)
    .where(and(eq(inspectorReportsTable.id, req.params.id), eq(inspectorReportsTable.userId, uid)));
  if (!report) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ report });
});

// CLI submits a completed inspection report
router.post("/inspector/cli-report", async (req, res) => {
  const uid = getCliUserId(req);
  if (!uid) { res.status(401).json({ error: "Invalid CLI token" }); return; }

  const body = req.body as {
    appName: string; appUrl: string; appId?: string;
    findings: { type: string; message: string; page?: string; detail?: string }[];
    screenshots?: { page: string; label: string; data: string }[];
    inspectedAt: string; pagesChecked: number; errorCount: number; warnCount: number;
    recheckOf?: string;
  };

  if (!body.appUrl || !Array.isArray(body.findings)) {
    res.status(400).json({ error: "appUrl and findings required" });
    return;
  }

  const id = `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const quillDoc = await generateQuillDoc(body.appName ?? body.appUrl, body.appUrl, body.findings);

  const screenshotsMapped = (body.screenshots ?? []).map((s: any) => ({
    page: s.page,
    label: s.label,
    viewport: s.viewport ?? "desktop",
    hash: s.hash ?? null,
    dataUrl: s.data ? `data:image/png;base64,${s.data}` : (s.dataUrl ?? null),
  }));

  const healthScore = Math.max(0, 100 - body.errorCount * 20 - body.warnCount * 5);

  await db.insert(inspectorReportsTable).values({
    id, userId: uid,
    appId: body.appId ?? null,
    appName: body.appName ?? body.appUrl,
    appUrl: body.appUrl,
    source: "cli", status: "done",
    environment: (body as any).environment ?? "production",
    buildSha: (body as any).buildSha ?? null,
    ciRunId: (body as any).ciRunId ?? null,
    inspectedAt: new Date(body.inspectedAt),
    pagesChecked: body.pagesChecked,
    errorCount: body.errorCount,
    warnCount: body.warnCount,
    findings: body.findings as any,
    screenshots: screenshotsMapped as any,
    consoleErrors: (body as any).consoleErrors ?? null,
    networkFailures: (body as any).networkFailures ?? null,
    performanceMetrics: (body as any).performanceMetrics ?? null,
    accessibilityViolations: (body as any).accessibilityViolations ?? null,
    assertionResults: (body as any).assertionResults ?? null,
    visualDiffs: (body as any).visualDiffs ?? null,
    quillDoc,
    recheckOf: body.recheckOf ?? null,
  });

  // Update app's lastInspectedAt + healthScore
  if (body.appId) {
    await db.update(inspectorAppsTable)
      .set({ lastInspectedAt: new Date(body.inspectedAt), healthScore, updatedAt: new Date() })
      .where(and(eq(inspectorAppsTable.id, body.appId), eq(inspectorAppsTable.userId, uid)));
  }

  // Save individual issues
  for (const issue of body.findings.filter(f => f.type === "error" || f.type === "warn")) {
    const priority = issue.type === "error" ? "high" : "medium";
    await db.insert(inspectorIssuesTable).values({
      id: `issue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      reportId: id, userId: uid,
      appId: body.appId ?? null,
      appName: body.appName ?? body.appUrl,
      page: issue.page ?? null,
      type: issue.type, message: issue.message,
      detail: issue.detail ?? null, status: "open",
      priority,
    });
  }

  // Fire-and-forget alert check if errors found
  if (body.errorCount > 0 && body.appId) {
    fetch(`http://localhost:${process.env.PORT ?? 3000}/api/inspector/internal/check-alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: uid, appId: body.appId, appName: body.appName ?? body.appUrl,
        appUrl: body.appUrl, reportId: id,
        errorCount: body.errorCount, warnCount: body.warnCount,
      }),
    }).catch(() => {});
  }

  res.json({ ok: true, reportId: id, quillDoc });
});

// CLI fetches failing pages from last report (for recheck)
router.get("/inspector/cli-recheck-data", async (req, res) => {
  const uid = getCliUserId(req);
  if (!uid) { res.status(401).json({ error: "Invalid CLI token" }); return; }

  const { appName } = req.query as { appName?: string };

  const conditions = [eq(inspectorReportsTable.userId, uid)];
  if (appName) conditions.push(eq(inspectorReportsTable.appName, appName));

  const [latest] = await db
    .select()
    .from(inspectorReportsTable)
    .where(and(...conditions))
    .orderBy(desc(inspectorReportsTable.inspectedAt))
    .limit(1);

  if (!latest) { res.json({ found: false }); return; }

  const findings = (latest.findings as any[]) ?? [];
  const failingPages = [...new Set(
    findings
      .filter(f => f.type === "error" || f.type === "warn")
      .map(f => f.page)
      .filter(Boolean),
  )];

  res.json({
    found: true, reportId: latest.id,
    appName: latest.appName, appUrl: latest.appUrl, appId: latest.appId,
    inspectedAt: latest.inspectedAt,
    errorCount: latest.errorCount, warnCount: latest.warnCount,
    failingPages,
  });
});

// Mark issue as fixed / wont-fix / open
router.patch("/inspector/issues/:id", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const uid = userId(req);
  const { status } = req.body as { status: "fixed" | "wont-fix" | "open" };
  await db.update(inspectorIssuesTable)
    .set({ status, fixedAt: status === "fixed" ? new Date() : null })
    .where(and(eq(inspectorIssuesTable.id, req.params.id), eq(inspectorIssuesTable.userId, uid)));
  res.json({ ok: true });
});

export default router;
