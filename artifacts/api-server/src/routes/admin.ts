import { Router } from "express";
import { createClerkClient } from "@clerk/express";
import { db, registryAppsTable, paymentsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

export const router = Router();

// ─── Admin identity sets ──────────────────────────────────────────────────────

const ADMIN_IDS = new Set(
  (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

// ─── Clerk client (only needed when ADMIN_EMAILS is set) ─────────────────────

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY ?? "",
});

// ─── Per-user admin cache (userId → { result, expiresAt }) ───────────────────

const adminCache = new Map<string, { result: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function isAdmin(userId: string): Promise<boolean> {
  if (!userId || userId.startsWith("anon-")) return false;

  // Fast path: check by ID
  if (ADMIN_IDS.has(userId.toLowerCase())) return true;

  // No email list configured — skip the Clerk lookup
  if (ADMIN_EMAILS.size === 0) return false;

  // Check cache
  const cached = adminCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  // Resolve email via Clerk backend API
  try {
    const user = await clerkClient.users.getUser(userId);
    const emails = (user.emailAddresses ?? []).map((e) => e.emailAddress.toLowerCase());
    const result = emails.some((email) => ADMIN_EMAILS.has(email));
    adminCache.set(userId, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch {
    // Clerk lookup failed (user not found, network issue, etc.) — deny
    return false;
  }
}

async function requireAdmin(req: any, res: any, next: any) {
  const ok = await isAdmin(req.userId);
  if (!ok) return res.status(403).json({ error: "Forbidden" });
  next();
}

// ─── GET /api/admin/check ────────────────────────────────────────────────────
router.get("/admin/check", async (req, res) => {
  const ok = await isAdmin(req.userId);
  return res.json({ isAdmin: ok });
});

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [planRows, registryRows] = await Promise.all([
      db
        .select({ plan: paymentsTable.plan, count: sql<number>`cast(count(*) as int)` })
        .from(paymentsTable)
        .where(eq(paymentsTable.paid, true))
        .groupBy(paymentsTable.plan),
      db
        .select()
        .from(registryAppsTable)
        .orderBy(desc(registryAppsTable.createdAt)),
    ]);

    const planDistribution: Record<string, number> = {};
    let totalPaid = 0;
    for (const row of planRows) {
      planDistribution[row.plan] = row.count;
      totalPaid += row.count;
    }

    const pending = registryRows.filter(r => r.status === "pending");
    const approved = registryRows.filter(r => r.status === "approved");
    const oldest = pending.length > 0
      ? pending.reduce((a, b) => new Date(a.createdAt) < new Date(b.createdAt) ? a : b)
      : null;

    const oldestDays = oldest
      ? Math.floor((Date.now() - new Date(oldest.createdAt).getTime()) / 86_400_000)
      : null;

    return res.json({
      planDistribution,
      totalPaid,
      pendingCount: pending.length,
      approvedCount: approved.length,
      oldestPendingDays: oldestDays,
      oldestPendingName: oldest?.name ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "admin/stats GET failed");
    return res.status(500).json({ error: "Failed to load admin stats" });
  }
});

// ─── GET /api/admin/registry ─────────────────────────────────────────────────
router.get("/admin/registry", requireAdmin, async (req, res) => {
  try {
    const apps = await db
      .select()
      .from(registryAppsTable)
      .orderBy(desc(registryAppsTable.createdAt));
    return res.json(apps);
  } catch (err) {
    req.log.error({ err }, "admin/registry GET failed");
    return res.status(500).json({ error: "Failed to load registry apps" });
  }
});

// ─── POST /api/admin/registry/:id/approve ───────────────────────────────────
router.post("/admin/registry/:id/approve", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [row] = await db
      .update(registryAppsTable)
      .set({ status: "approved", sovereignCertified: true })
      .where(eq(registryAppsTable.id, id))
      .returning();

    if (!row) return res.status(404).json({ error: "App not found" });
    return res.json({ ok: true, app: row });
  } catch (err) {
    req.log.error({ err }, "admin/registry approve failed");
    return res.status(500).json({ error: "Failed to approve app" });
  }
});

// ─── POST /api/admin/registry/:id/reject ────────────────────────────────────
router.post("/admin/registry/:id/reject", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [row] = await db
      .update(registryAppsTable)
      .set({ status: "rejected", sovereignCertified: false })
      .where(eq(registryAppsTable.id, id))
      .returning();

    if (!row) return res.status(404).json({ error: "App not found" });
    return res.json({ ok: true, app: row });
  } catch (err) {
    req.log.error({ err }, "admin/registry reject failed");
    return res.status(500).json({ error: "Failed to reject app" });
  }
});

// ─── DELETE /api/admin/registry/:id ─────────────────────────────────────────
router.delete("/admin/registry/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    await db.delete(registryAppsTable).where(eq(registryAppsTable.id, id));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "admin/registry DELETE failed");
    return res.status(500).json({ error: "Failed to delete app" });
  }
});

// ─── PATCH /api/admin/registry/:id ──────────────────────────────────────────
router.patch("/admin/registry/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { sovereignCertified, minRam } = req.body as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (typeof sovereignCertified === "boolean") patch.sovereignCertified = sovereignCertified;
  if (typeof minRam === "number") patch.minRam = minRam;

  try {
    const [row] = await db
      .update(registryAppsTable)
      .set(patch)
      .where(eq(registryAppsTable.id, id))
      .returning();

    if (!row) return res.status(404).json({ error: "App not found" });
    return res.json({ ok: true, app: row });
  } catch (err) {
    req.log.error({ err }, "admin/registry PATCH failed");
    return res.status(500).json({ error: "Failed to update app" });
  }
});
