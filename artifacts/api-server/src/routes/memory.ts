import { Router } from "express";
import { db } from "@workspace/db";
import { userMemory } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/user/memory
router.get("/user/memory", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const [row] = await db.select().from(userMemory).where(eq(userMemory.userId, userId));
  res.json(row ?? { userId, name: null, building: null, role: null, preferences: null });
});

// PUT /api/user/memory
router.put("/user/memory", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { name, building, role, preferences } = req.body as {
    name?: string; building?: string; role?: string; preferences?: string;
  };

  await db
    .insert(userMemory)
    .values({ userId, name, building, role, preferences, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userMemory.userId,
      set: { name, building, role, preferences, updatedAt: new Date() },
    });

  res.json({ success: true });
});

export default router;
