import { Router } from "express";
import { db, registryAppsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

export const router = Router();

const ADMIN_IDS = new Set(
  (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

function isAdmin(userId: string): boolean {
  if (ADMIN_IDS.size > 0 && ADMIN_IDS.has(userId)) return true;
  return false;
}

function requireAdmin(req: any, res: any, next: any) {
  if (!isAdmin(req.userId)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// ─── GET /api/admin/check ────────────────────────────────────────────────────
router.get("/admin/check", (req, res) => {
  return res.json({ isAdmin: isAdmin(req.userId) });
});

// ─── GET /api/admin/registry ─────────────────────────────────────────────────
// Returns ALL apps (pending, approved, rejected) for admin review
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
    await db
      .delete(registryAppsTable)
      .where(eq(registryAppsTable.id, id));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "admin/registry DELETE failed");
    return res.status(500).json({ error: "Failed to delete app" });
  }
});

// ─── PATCH /api/admin/registry/:id ──────────────────────────────────────────
// Update sovereign certified flag or other fields
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
