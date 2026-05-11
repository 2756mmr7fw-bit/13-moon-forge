import { Router } from "express";
import { db, teamMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// GET /api/team
router.get("/team", async (req, res) => {
  const members = await db
    .select()
    .from(teamMembersTable)
    .where(eq(teamMembersTable.ownerId, req.userId));
  return res.json(members);
});

// POST /api/team/invite
router.post("/team/invite", async (req, res) => {
  const { email, role } = req.body as { email?: string; role?: "editor" | "viewer" };
  if (!email?.trim()) return res.status(400).json({ error: "email is required" });
  if (!["editor", "viewer"].includes(role ?? "")) return res.status(400).json({ error: "role must be editor or viewer" });

  try {
    const [member] = await db.insert(teamMembersTable).values({
      ownerId: req.userId,
      email: email.trim().toLowerCase(),
      role: role!,
      status: "pending",
    }).onConflictDoUpdate({
      target: [teamMembersTable.ownerId, teamMembersTable.email],
      set: { role: role!, status: "pending" },
    }).returning();

    // In a full implementation, send an invite email via Resend/SendGrid here
    req.log.info({ email: member.email, role: member.role }, "team invite created");
    return res.json({ member });
  } catch (err) {
    req.log.error({ err }, "team invite failed");
    return res.status(500).json({ error: "Failed to create invite" });
  }
});

// PATCH /api/team/:id — change role
router.patch("/team/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { role } = req.body as { role?: "editor" | "viewer" };
  if (!["editor", "viewer"].includes(role ?? "")) return res.status(400).json({ error: "Invalid role" });

  const [updated] = await db
    .update(teamMembersTable)
    .set({ role: role! })
    .where(and(eq(teamMembersTable.id, id), eq(teamMembersTable.ownerId, req.userId)))
    .returning();

  if (!updated) return res.status(404).json({ error: "Member not found" });
  return res.json(updated);
});

// DELETE /api/team/:id
router.delete("/team/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(teamMembersTable).where(
    and(eq(teamMembersTable.id, id), eq(teamMembersTable.ownerId, req.userId))
  );
  return res.json({ ok: true });
});

export default router;
