import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { sql, eq, count } from "drizzle-orm";
import { db, siteBuildRequestsTable, ACTIVE_SITE_BUILD_CAPACITY } from "@workspace/db";
import { sendEmail } from "../lib/email";

const router = Router();

const REQUEST_TO = "ezekiel@thepeoplestownsq.com";

const RequestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().min(7).max(40).optional().or(z.literal("")),
  tier: z.enum(["starter", "standard", "custom", "hardship"]),
  description: z.string().trim().min(50, "Please describe what you need (at least 50 characters)").max(5000),
  website: z.string().max(200).optional(),
});

const requestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from your network. Please try again in an hour, or email ezekiel@thepeoplestownsq.com directly." },
});

const SITE_BUILD_LOCK_KEY = 6913_2026_0517;

router.get("/build-my-site/availability", async (_req, res) => {
  const [activeRow] = await db
    .select({ c: count() })
    .from(siteBuildRequestsTable)
    .where(eq(siteBuildRequestsTable.status, "active"));
  const [waitRow] = await db
    .select({ c: count() })
    .from(siteBuildRequestsTable)
    .where(eq(siteBuildRequestsTable.status, "waitlist"));
  const active = Number(activeRow?.c ?? 0);
  const waitlist = Number(waitRow?.c ?? 0);
  const openSlots = Math.max(0, ACTIVE_SITE_BUILD_CAPACITY - active);
  return res.status(200).json({
    capacity: ACTIVE_SITE_BUILD_CAPACITY,
    active,
    waitlist,
    openSlots,
    accepting: openSlots > 0 ? "active" : "waitlist",
  });
});

router.post("/build-my-site/request", requestLimiter, async (req, res) => {
  const parsed = RequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const { name, email, phone, tier, description, website } = parsed.data;

  if (website && website.length > 0) {
    return res.status(200).json({ ok: true, status: "active", position: null });
  }

  if (!email && !phone) {
    return res.status(400).json({ error: "Please provide an email or a phone number." });
  }

  // Atomic capacity + waitlist position assignment via Postgres advisory lock.
  const { status, waitlistPosition, insertedId } = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${SITE_BUILD_LOCK_KEY})`);

    const [activeRow] = await tx
      .select({ c: count() })
      .from(siteBuildRequestsTable)
      .where(eq(siteBuildRequestsTable.status, "active"));
    const active = Number(activeRow?.c ?? 0);

    let s: "active" | "waitlist";
    let pos: number | null = null;
    if (active < ACTIVE_SITE_BUILD_CAPACITY) {
      s = "active";
    } else {
      s = "waitlist";
      const [waitRow] = await tx
        .select({ c: count() })
        .from(siteBuildRequestsTable)
        .where(eq(siteBuildRequestsTable.status, "waitlist"));
      pos = Number(waitRow?.c ?? 0) + 1;
    }

    const [inserted] = await tx
      .insert(siteBuildRequestsTable)
      .values({
        name,
        email: email || null,
        phone: phone || null,
        tier,
        description,
        status: s,
        waitlistPosition: pos,
        startedAt: s === "active" ? new Date() : null,
      })
      .returning({ id: siteBuildRequestsTable.id });

    return { status: s, waitlistPosition: pos, insertedId: inserted!.id };
  });

  const tierLabel = {
    starter: "Starter Site — $199 + $9/mo hosting",
    standard: "Standard Site — $499 + $19/mo hosting",
    custom: "Custom — quoted per project",
    hardship: "Forge Student / Hardship — free",
  }[tier];

  const statusLine =
    status === "active"
      ? "STATUS: Active slot — start when ready"
      : `STATUS: Waitlist position #${waitlistPosition}`;

  const subject =
    status === "active"
      ? `[BUILD ${tier.toUpperCase()}] ${name} — new active request`
      : `[WAITLIST #${waitlistPosition}] ${name} — ${tier}`;

  const text = [
    statusLine,
    ``,
    `Name: ${name}`,
    `Email: ${email || "(not provided)"}`,
    `Phone: ${phone || "(not provided)"}`,
    `Tier: ${tierLabel}`,
    ``,
    `What they need:`,
    description,
    ``,
    `---`,
    `Sent from 13moonforge.ai/build-my-site (request id ${insertedId})`,
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a">
      <p style="display:inline-block;padding:6px 12px;border-radius:999px;font-weight:600;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;background:${status === "active" ? "#dcfce7" : "#fef3c7"};color:${status === "active" ? "#166534" : "#92400e"}">${status === "active" ? "Active slot" : `Waitlist #${waitlistPosition}`}</p>
      <h2 style="margin:8px 0 12px">New Build My Site request</h2>
      <table style="border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Name</td><td><strong>${escapeHtml(name)}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Email</td><td>${escapeHtml(email || "(not provided)")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Phone</td><td>${escapeHtml(phone || "(not provided)")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Tier</td><td>${escapeHtml(tierLabel)}</td></tr>
      </table>
      <h3 style="margin:20px 0 8px">What they need</h3>
      <pre style="white-space:pre-wrap;background:#f1f5f9;padding:12px;border-radius:8px;font-family:inherit;font-size:14px">${escapeHtml(description)}</pre>
      <p style="color:#64748b;font-size:12px;margin-top:24px">Sent from 13moonforge.ai/build-my-site · request id ${insertedId}</p>
    </div>
  `;

  const emailed = await sendEmail(REQUEST_TO, subject, text, html, [
    { name: "type", value: "build-my-site-request" },
    { name: "tier", value: tier },
    { name: "queue_status", value: status },
  ]);

  if (!emailed) {
    req.log.error({ requestId: insertedId }, "Build-my-site email failed to send");
  }

  return res.status(200).json({
    ok: true,
    status,
    position: waitlistPosition,
    notified: emailed,
  });
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default router;
