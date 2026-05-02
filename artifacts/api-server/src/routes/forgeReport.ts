import { Router } from "express";
import { db, chatSessions, savedPrompts, workspaceItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

const router = Router();

let _resend: Resend | null = null;
function getResend(): Resend {
  if (_resend) return _resend;
  _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

// ─── Per-user cooldown ────────────────────────────────────────────────────────
// One report per user per 24 hours — prevents accidental or repeated sends
// from burning through the Resend daily quota.
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const lastSentAt = new Map<string, number>();

// POST /api/forge-report — send a Forge activity digest to the user's email
// Body: { email: string; firstName?: string }
router.post("/forge-report", async (req, res) => {
  const userId = req.userId;

  // ── Cooldown check ────────────────────────────────────────────────────────
  const last = lastSentAt.get(userId);
  if (last) {
    const elapsed = Date.now() - last;
    if (elapsed < COOLDOWN_MS) {
      const nextAvailableAt = last + COOLDOWN_MS;
      return res.status(429).json({
        error: "You already sent a Forge Report recently. One per day is the limit.",
        nextAvailableAt,
      });
    }
  }

  const { email, firstName } = req.body ?? {};
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "email required" });
  }

  try {
    const [sessions, prompts, files] = await Promise.all([
      db.select({ moonId: chatSessions.moonId, title: chatSessions.title })
        .from(chatSessions)
        .where(eq(chatSessions.userId, userId))
        .limit(10),
      db.select({ id: savedPrompts.id })
        .from(savedPrompts)
        .where(eq(savedPrompts.userId, userId)),
      db.select({ name: workspaceItemsTable.name, type: workspaceItemsTable.type })
        .from(workspaceItemsTable)
        .where(eq(workspaceItemsTable.userId, userId))
        .limit(5),
    ]);

    const name = firstName ?? "Builder";
    const moonCount = sessions.length;
    const promptCount = prompts.length;
    const fileCount = files.length;

    const recentMoons = [...new Set(sessions.map(s => s.moonId))].slice(0, 4);

    const moonColors: Record<string, string> = {
      forge: "#f97316", flint: "#ef4444", sage: "#22c55e",
      hawk: "#eab308", quill: "#8b5cf6", creed: "#3b82f6",
      brainstorm: "#f59e0b",
    };

    const moonDots = recentMoons.map(m => {
      const color = moonColors[m] ?? "#888";
      return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:4px;"></span><strong style="color:#fff">${m}</strong>`;
    }).join("&nbsp;&nbsp;");

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0f0f0f;color:#e5e5e5;font-family:system-ui,sans-serif;margin:0;padding:32px;">
  <div style="max-width:560px;margin:0 auto;">

    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:32px;margin-bottom:8px;">🔥</div>
      <h1 style="color:#f97316;font-size:24px;font-weight:900;letter-spacing:-0.5px;margin:0;">13 Moon Forge</h1>
      <p style="color:#888;font-size:12px;margin:4px 0 0;">Your Weekly Build Report</p>
    </div>

    <p style="font-size:16px;color:#ccc;">Hey <strong style="color:#fff">${name}</strong>,</p>
    <p style="font-size:14px;color:#aaa;line-height:1.7;">Here's a look at what you've been building in Forge this week.</p>

    <div style="background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:24px;margin:24px 0;">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;text-align:center;">
        <div>
          <div style="font-size:32px;font-weight:900;color:#f97316;">${moonCount}</div>
          <div style="font-size:11px;color:#888;margin-top:2px;">Moon Sessions</div>
        </div>
        <div>
          <div style="font-size:32px;font-weight:900;color:#8b5cf6;">${promptCount}</div>
          <div style="font-size:11px;color:#888;margin-top:2px;">Saved Prompts</div>
        </div>
        <div>
          <div style="font-size:32px;font-weight:900;color:#22c55e;">${fileCount}</div>
          <div style="font-size:11px;color:#888;margin-top:2px;">Workspace Files</div>
        </div>
      </div>
    </div>

    ${recentMoons.length > 0 ? `
    <div style="background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:20px;margin:16px 0;">
      <p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Moons Used</p>
      <div>${moonDots}</div>
    </div>` : ""}

    <div style="background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:20px;margin:16px 0;">
      <p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">This Week's Tip</p>
      <p style="font-size:13px;color:#ccc;line-height:1.7;margin:0;">
        Try pressing <strong style="color:#f97316">⌘K</strong> (or Ctrl+K) anywhere in Forge to jump to any Moon or run a saved prompt instantly — no mouse required.
      </p>
    </div>

    <div style="text-align:center;margin:32px 0;">
      <a href="https://13moonforge.ai/dashboard"
         style="background:#f97316;color:#000;font-weight:900;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;display:inline-block;">
        Back to the Forge →
      </a>
    </div>

    <p style="font-size:11px;color:#555;text-align:center;">
      You're receiving this because you're a Forge builder.<br>
      Powered by Sovereign Digital LLC · <a href="https://thepeoplestownsq.com" style="color:#f97316;text-decoration:none;">Town Square</a>
    </p>
  </div>
</body>
</html>`;

    const { error } = await getResend().emails.send({
      from:    "Forge <forge@13moonforge.ai>",
      to:      email,
      subject: `🔥 Your Forge Week — ${moonCount} sessions, ${fileCount} files`,
      html,
      tags: [
        { name: "app",      value: "the-forge" },
        { name: "email_type", value: "forge-report" },
        { name: "product",  value: "13-moon-forge" },
      ],
    });

    if (error) {
      req.log.error({ error }, "forge-report: resend error");
      return res.status(500).json({ error: "Failed to send email" });
    }

    // Record the send time only after a confirmed success
    lastSentAt.set(userId, Date.now());

    res.json({ ok: true, sentTo: email, nextAvailableAt: Date.now() + COOLDOWN_MS });
  } catch (err) {
    req.log.error({ err }, "forge-report: failed");
    res.status(500).json({ error: "Failed to generate report" });
  }
});

export default router;
