import { Router } from "express";
import { db, registryAppsTable, paymentsTable, hostedUsersTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const FORGE_COOLIFY_URL = process.env.FORGE_COOLIFY_URL ?? "http://5.78.154.21:8000";
const FORGE_COOLIFY_KEY = process.env.FORGE_COOLIFY_API_KEY ?? "";

async function coolifyFetch(path: string, options: RequestInit = {}) {
  return fetch(`${FORGE_COOLIFY_URL}/api/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${FORGE_COOLIFY_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}

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

// ─── Per-user admin cache (userId → { result, expiresAt }) ───────────────────

const adminCache = new Map<string, { result: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function isAdmin(userId: string, userEmail?: string): Promise<boolean> {
  if (!userId || userId.startsWith("anon-")) return false;

  // Fast path: check by ID
  if (ADMIN_IDS.has(userId.toLowerCase())) return true;

  // No email list configured — skip email lookup
  if (ADMIN_EMAILS.size === 0) return false;

  // Check cache
  const cached = adminCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  // Check email from session (provided by Replit Auth / authMiddleware)
  if (userEmail) {
    const result = ADMIN_EMAILS.has(userEmail.toLowerCase());
    adminCache.set(userId, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  return false;
}

async function requireAdmin(req: any, res: any, next: any) {
  const ok = await isAdmin(req.userId, req.user?.email);
  if (!ok) return res.status(403).json({ error: "Forbidden" });
  next();
}

// ─── GET /api/admin/check ────────────────────────────────────────────────────
router.get("/admin/check", async (req, res) => {
  const email = req.user?.email ?? undefined;
  const ok = await isAdmin(req.userId, email);
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

// ─── GET /api/admin/hosted-users ─────────────────────────────────────────────
router.get("/admin/hosted-users", requireAdmin, async (req, res) => {
  try {
    const users = await db.select().from(hostedUsersTable).orderBy(desc(hostedUsersTable.requestedAt));
    return res.json(users);
  } catch (err) {
    req.log.error({ err }, "admin/hosted-users GET failed");
    return res.status(500).json({ error: "Failed to load hosted users" });
  }
});

// ─── POST /api/admin/hosted-users/:userId/provision ──────────────────────────
router.post("/admin/hosted-users/:userId/provision", requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { subdomain, notes } = req.body as { subdomain?: string; notes?: string };

  try {
    const [existing] = await db.select().from(hostedUsersTable).where(eq(hostedUsersTable.userId, userId));
    if (!existing) return res.status(404).json({ error: "User hosting request not found" });

    let coolifyTeamId = existing.coolifyTeamId;

    // Create a Coolify team for this user if not already done
    if (!coolifyTeamId && FORGE_COOLIFY_KEY) {
      const shortId = userId.replace(/[^a-z0-9]/gi, "").slice(0, 12).toLowerCase();
      const teamName = `forge-${shortId}`;
      try {
        const r = await coolifyFetch("/teams", {
          method: "POST",
          body: JSON.stringify({ name: teamName, description: `Forge managed hosting for ${userId}` }),
        });
        if (r.ok) {
          const data = await r.json() as { id?: number | string };
          coolifyTeamId = String(data.id ?? "");
        }
      } catch {
        // Non-fatal — proceed without team ID so admin can set it manually
      }
    }

    const cleanSubdomain = subdomain?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 30) || existing.subdomain;

    const [updated] = await db
      .update(hostedUsersTable)
      .set({
        status: "active",
        coolifyTeamId: coolifyTeamId ?? null,
        subdomain: cleanSubdomain,
        notes: notes?.trim() ?? existing.notes,
        provisionedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(hostedUsersTable.userId, userId))
      .returning();

    return res.json({ ok: true, user: updated });
  } catch (err) {
    req.log.error({ err }, "admin/hosted-users provision failed");
    return res.status(500).json({ error: "Failed to provision user" });
  }
});

// ─── POST /api/admin/hosted-users/:userId/suspend ────────────────────────────
router.post("/admin/hosted-users/:userId/suspend", requireAdmin, async (req, res) => {
  try {
    const [row] = await db
      .update(hostedUsersTable)
      .set({ status: "suspended", updatedAt: new Date() })
      .where(eq(hostedUsersTable.userId, req.params.userId))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "admin/hosted-users suspend failed");
    return res.status(500).json({ error: "Failed" });
  }
});

// ─── POST /api/admin/hosted-users/:userId/activate ───────────────────────────
router.post("/admin/hosted-users/:userId/activate", requireAdmin, async (req, res) => {
  try {
    const [row] = await db
      .update(hostedUsersTable)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(hostedUsersTable.userId, req.params.userId))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "admin/hosted-users activate failed");
    return res.status(500).json({ error: "Failed" });
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
