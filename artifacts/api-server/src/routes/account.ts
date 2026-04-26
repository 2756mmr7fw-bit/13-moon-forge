import { Router } from "express";
import { db, userTptsLinks } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/account/tpts-email — return the stored TPTS email for this user
router.get("/account/tpts-email", async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [row] = await db
      .select({ tptsEmail: userTptsLinks.tptsEmail, linkedAt: userTptsLinks.linkedAt })
      .from(userTptsLinks)
      .where(eq(userTptsLinks.userId, userId))
      .limit(1);

    res.json({ tptsEmail: row?.tptsEmail ?? null, linkedAt: row?.linkedAt ?? null });
  } catch (err) {
    req.log.error({ err }, "account: failed to fetch tpts email");
    res.status(500).json({ error: "Failed to load" });
  }
});

// POST /api/account/tpts-email — save or update the TPTS email for this user
router.post("/account/tpts-email", async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { tptsEmail } = req.body ?? {};
  if (!tptsEmail || typeof tptsEmail !== "string") {
    return res.status(400).json({ error: "tptsEmail required" });
  }

  const email = tptsEmail.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  try {
    await db
      .insert(userTptsLinks)
      .values({ userId, tptsEmail: email })
      .onConflictDoUpdate({
        target: userTptsLinks.userId,
        set: { tptsEmail: email, updatedAt: new Date() },
      });

    res.json({ ok: true, tptsEmail: email });
  } catch (err) {
    req.log.error({ err }, "account: failed to save tpts email");
    res.status(500).json({ error: "Failed to save" });
  }
});

// DELETE /api/account/tpts-email — remove the linked TPTS email
router.delete("/account/tpts-email", async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    await db.delete(userTptsLinks).where(eq(userTptsLinks.userId, userId));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "account: failed to remove tpts email");
    res.status(500).json({ error: "Failed to remove" });
  }
});

export default router;
