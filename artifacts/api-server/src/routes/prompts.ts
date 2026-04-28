import { Router } from "express";
import { db, savedPrompts } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// GET /api/prompts — list all saved prompts for this user
router.get("/prompts", async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const rows = await db
      .select()
      .from(savedPrompts)
      .where(eq(savedPrompts.userId, userId))
      .orderBy(desc(savedPrompts.createdAt));

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "prompts: list failed");
    res.status(500).json({ error: "Failed to load" });
  }
});

// POST /api/prompts — save a new prompt
router.post("/prompts", async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { title, prompt, moonId, tags } = req.body ?? {};
  if (!title || typeof title !== "string") return res.status(400).json({ error: "title required" });
  if (!prompt || typeof prompt !== "string") return res.status(400).json({ error: "prompt required" });

  try {
    const [created] = await db
      .insert(savedPrompts)
      .values({
        userId,
        title: title.trim().slice(0, 120),
        prompt: prompt.trim(),
        moonId: moonId ?? null,
        tags: Array.isArray(tags) ? tags.map(String) : [],
      })
      .returning();

    res.json(created);
  } catch (err) {
    req.log.error({ err }, "prompts: create failed");
    res.status(500).json({ error: "Failed to save" });
  }
});

// DELETE /api/prompts/:id — delete a saved prompt
router.delete("/prompts/:id", async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    await db
      .delete(savedPrompts)
      .where(and(eq(savedPrompts.id, id), eq(savedPrompts.userId, userId)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "prompts: delete failed");
    res.status(500).json({ error: "Failed to delete" });
  }
});

// PATCH /api/prompts/:id — rename a saved prompt
router.patch("/prompts/:id", async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { title } = req.body ?? {};
  if (!title || typeof title !== "string") return res.status(400).json({ error: "title required" });

  try {
    const [updated] = await db
      .update(savedPrompts)
      .set({ title: title.trim().slice(0, 120) })
      .where(and(eq(savedPrompts.id, id), eq(savedPrompts.userId, userId)))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "prompts: update failed");
    res.status(500).json({ error: "Failed to update" });
  }
});

export default router;
