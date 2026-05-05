import { Router } from "express";
import { createHmac } from "crypto";

const router = Router();

// ── In-memory store keyed by userId (last 5 reports per user) ─────────────────
interface InspectionReport {
  appName: string;
  appUrl: string;
  findings: { type: string; message: string; page?: string; detail?: string }[];
  screenshots: { page: string; label: string; data: string }[];
  inspectedAt: string;
  pagesChecked: number;
  errorCount: number;
  warnCount: number;
}

const reportStore = new Map<string, InspectionReport[]>();

// ── Token verification (same as help.ts) ──────────────────────────────────────
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

// ── POST /api/agent/cli-inspect — receive report from CLI ─────────────────────
router.post("/api/agent/cli-inspect", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Bearer token required" });
    return;
  }

  const userId = verifyCliToken(authHeader.slice(7));
  if (!userId) {
    res.status(401).json({ error: "Invalid or expired CLI token" });
    return;
  }

  const report = req.body as InspectionReport;
  if (!report.appUrl || !Array.isArray(report.findings)) {
    res.status(400).json({ error: "appUrl and findings required" });
    return;
  }

  const existing = reportStore.get(userId) ?? [];
  const updated = [report, ...existing].slice(0, 5);
  reportStore.set(userId, updated);

  res.json({ ok: true, reportId: Date.now() });
});

// ── GET /api/agent/cli-inspect/latest — fetch latest report for logged-in user ─
router.get("/api/agent/cli-inspect/latest", (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const userId = (req.user as { id: string }).id;
  const reports = reportStore.get(userId) ?? [];

  if (reports.length === 0) {
    res.json({ report: null });
    return;
  }

  // Send report without screenshot pixel data (too large) — just metadata
  const latest = reports[0];
  res.json({
    report: {
      ...latest,
      screenshots: latest.screenshots.map(s => ({
        page: s.page,
        label: s.label,
        dataUrl: `data:image/png;base64,${s.data}`,
      })),
    },
  });
});

// ── GET /api/agent/cli-inspect/all — list all reports for user ────────────────
router.get("/api/agent/cli-inspect/all", (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const userId = (req.user as { id: string }).id;
  const reports = (reportStore.get(userId) ?? []).map(r => ({
    appName: r.appName,
    appUrl: r.appUrl,
    inspectedAt: r.inspectedAt,
    pagesChecked: r.pagesChecked,
    errorCount: r.errorCount,
    warnCount: r.warnCount,
    screenshotCount: r.screenshots.length,
    findingCount: r.findings.length,
  }));

  res.json({ reports });
});

export default router;
