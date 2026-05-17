import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { sql, eq, count, desc, asc, and, ne } from "drizzle-orm";
import { db, siteBuildRequestsTable, ACTIVE_SITE_BUILD_CAPACITY } from "@workspace/db";
import { sendEmail } from "../lib/email";
import { isAdmin } from "./admin";

const router = Router();

const REQUEST_TO = "ezekiel@thepeoplestownsq.com";
const SITE_BUILD_LOCK_KEY = 6913_2026_0517;

const RequestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().min(7).max(40).optional().or(z.literal("")),
  tier: z.enum(["starter", "standard", "custom", "hardship"]),
  description: z.string().trim().min(50, "Please describe what you need (at least 50 characters)").max(5000),
  hasGithub: z.boolean().optional().default(false),
  githubUsername: z.string().trim().max(120).optional().or(z.literal("")),
  hasDomain: z.boolean().optional().default(false),
  domain: z.string().trim().max(255).optional().or(z.literal("")),
  website: z.string().max(200).optional(),
});

const requestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from your network. Please try again in an hour, or email ezekiel@thepeoplestownsq.com directly." },
});

async function requireAdminMw(req: any, res: any, next: any) {
  const ok = await isAdmin(req.userId, req.user?.email);
  if (!ok) return res.status(403).json({ error: "Forbidden" });
  next();
}

// ─── Public ──────────────────────────────────────────────────────────────────

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
  const { name, email, phone, tier, description, hasGithub, githubUsername, hasDomain, domain, website } = parsed.data;

  if (website && website.length > 0) {
    return res.status(200).json({ ok: true, status: "active", position: null });
  }
  if (!email && !phone) {
    return res.status(400).json({ error: "Please provide an email or a phone number." });
  }

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
        hasGithub: !!hasGithub,
        githubUsername: githubUsername || null,
        hasDomain: !!hasDomain,
        domain: domain || null,
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

  const subject =
    status === "active"
      ? `[BUILD ${tier.toUpperCase()}] ${name} — new active request`
      : `[WAITLIST #${waitlistPosition}] ${name} — ${tier}`;

  const text = [
    status === "active" ? "STATUS: Active slot" : `STATUS: Waitlist #${waitlistPosition}`,
    ``,
    `Name: ${name}`,
    `Email: ${email || "(not provided)"}`,
    `Phone: ${phone || "(not provided)"}`,
    `Tier: ${tierLabel}`,
    `GitHub: ${hasGithub ? githubUsername || "(yes, no username given)" : "no — needs help setting one up"}`,
    `Domain: ${hasDomain ? domain || "(yes, no domain given)" : "no — needs help picking one"}`,
    ``,
    `What they need:`,
    description,
    ``,
    `---`,
    `13moonforge.ai/build-my-site · request id ${insertedId}`,
    `Manage: 13moonforge.ai/admin/build-requests`,
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
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">GitHub</td><td>${hasGithub ? escapeHtml(githubUsername || "(yes — no username given)") : '<em style="color:#92400e">no — needs help setting one up</em>'}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">Domain</td><td>${hasDomain ? escapeHtml(domain || "(yes — no domain given)") : '<em style="color:#92400e">no — needs help picking one</em>'}</td></tr>
      </table>
      <h3 style="margin:20px 0 8px">What they need</h3>
      <pre style="white-space:pre-wrap;background:#f1f5f9;padding:12px;border-radius:8px;font-family:inherit;font-size:14px">${escapeHtml(description)}</pre>
      <p style="color:#64748b;font-size:12px;margin-top:24px">request id ${insertedId} · <a href="https://13moonforge.ai/admin/build-requests">manage</a></p>
    </div>
  `;

  const emailed = await sendEmail(REQUEST_TO, subject, text, html, [
    { name: "type", value: "build-my-site-request" },
    { name: "tier", value: tier },
    { name: "queue_status", value: status },
  ]);

  if (emailed) {
    await db.update(siteBuildRequestsTable).set({ notifiedEmail: true }).where(eq(siteBuildRequestsTable.id, insertedId));
  } else {
    req.log.error({ requestId: insertedId }, "Build-my-site email failed to send");
  }

  return res.status(200).json({ ok: true, status, position: waitlistPosition, notified: emailed });
});

// ─── Admin ───────────────────────────────────────────────────────────────────

router.get("/admin/build-requests", requireAdminMw, async (_req, res) => {
  const rows = await db
    .select()
    .from(siteBuildRequestsTable)
    .orderBy(
      sql`CASE ${siteBuildRequestsTable.status} WHEN 'active' THEN 0 WHEN 'waitlist' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END`,
      asc(siteBuildRequestsTable.waitlistPosition),
      desc(siteBuildRequestsTable.createdAt),
    );
  const [activeRow] = await db.select({ c: count() }).from(siteBuildRequestsTable).where(eq(siteBuildRequestsTable.status, "active"));
  return res.status(200).json({
    requests: rows,
    capacity: ACTIVE_SITE_BUILD_CAPACITY,
    active: Number(activeRow?.c ?? 0),
  });
});

const OptionalUrl = z.string().trim().max(500).url().optional().or(z.literal(""));
const UpdateSchema = z.object({
  repoUrl: OptionalUrl,
  hostingUrl: OptionalUrl,
  adminNotes: z.string().trim().max(5000).optional().or(z.literal("")),
});

router.patch("/admin/build-requests/:id", requireAdminMw, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
  const parsed = UpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  const patch: Record<string, unknown> = {};
  if (parsed.data.repoUrl !== undefined) patch.repoUrl = parsed.data.repoUrl || null;
  if (parsed.data.hostingUrl !== undefined) patch.hostingUrl = parsed.data.hostingUrl || null;
  if (parsed.data.adminNotes !== undefined) patch.adminNotes = parsed.data.adminNotes || null;
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: "Nothing to update" });
  const [updated] = await db.update(siteBuildRequestsTable).set(patch).where(eq(siteBuildRequestsTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  return res.status(200).json({ ok: true, request: updated });
});

async function promoteNextWaitlist(tx: typeof db) {
  const [activeRow] = await tx
    .select({ c: count() })
    .from(siteBuildRequestsTable)
    .where(eq(siteBuildRequestsTable.status, "active"));
  const active = Number(activeRow?.c ?? 0);
  if (active >= ACTIVE_SITE_BUILD_CAPACITY) return null;
  const [next] = await tx
    .select()
    .from(siteBuildRequestsTable)
    .where(eq(siteBuildRequestsTable.status, "waitlist"))
    .orderBy(asc(siteBuildRequestsTable.waitlistPosition), asc(siteBuildRequestsTable.createdAt))
    .limit(1);
  if (!next) return null;
  const [promoted] = await tx
    .update(siteBuildRequestsTable)
    .set({ status: "active", waitlistPosition: null, startedAt: new Date() })
    .where(eq(siteBuildRequestsTable.id, next.id))
    .returning();
  // Renumber remaining waitlist
  await tx.execute(sql`
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY waitlist_position ASC, created_at ASC) AS rn
      FROM site_build_requests WHERE status = 'waitlist'
    )
    UPDATE site_build_requests s SET waitlist_position = ranked.rn
    FROM ranked WHERE s.id = ranked.id
  `);
  return promoted;
}

router.post("/admin/build-requests/:id/complete", requireAdminMw, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${SITE_BUILD_LOCK_KEY})`);
    const [done] = await tx
      .update(siteBuildRequestsTable)
      .set({ status: "completed", completedAt: new Date(), waitlistPosition: null })
      .where(and(eq(siteBuildRequestsTable.id, id), ne(siteBuildRequestsTable.status, "completed")))
      .returning();
    if (!done) return { done: null, promoted: null };
    const promoted = await promoteNextWaitlist(tx as unknown as typeof db);
    return { done, promoted };
  });
  if (!result.done) return res.status(404).json({ error: "Not found or already completed" });
  return res.status(200).json({ ok: true, completed: result.done, promoted: result.promoted });
});

router.post("/admin/build-requests/:id/promote", requireAdminMw, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${SITE_BUILD_LOCK_KEY})`);
    const [activeRow] = await tx.select({ c: count() }).from(siteBuildRequestsTable).where(eq(siteBuildRequestsTable.status, "active"));
    if (Number(activeRow?.c ?? 0) >= ACTIVE_SITE_BUILD_CAPACITY) return { error: "capacity-full" as const };
    const [target] = await tx.select().from(siteBuildRequestsTable).where(eq(siteBuildRequestsTable.id, id));
    if (!target) return { error: "not-found" as const };
    if (target.status !== "waitlist") return { error: "not-on-waitlist" as const };
    const [promoted] = await tx
      .update(siteBuildRequestsTable)
      .set({ status: "active", waitlistPosition: null, startedAt: new Date() })
      .where(eq(siteBuildRequestsTable.id, id))
      .returning();
    await tx.execute(sql`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY waitlist_position ASC, created_at ASC) AS rn
        FROM site_build_requests WHERE status = 'waitlist'
      )
      UPDATE site_build_requests s SET waitlist_position = ranked.rn
      FROM ranked WHERE s.id = ranked.id
    `);
    return { promoted };
  });
  if ("error" in result) {
    if (result.error === "capacity-full") return res.status(409).json({ error: "Active slots are full. Complete one first." });
    if (result.error === "not-found") return res.status(404).json({ error: "Not found" });
    return res.status(400).json({ error: "Not on waitlist" });
  }
  return res.status(200).json({ ok: true, promoted: result.promoted });
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
