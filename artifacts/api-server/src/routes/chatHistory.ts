import { Router } from "express";
import { db, chatSessions } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

const VALID_MOONS = new Set(["forge", "flint", "sage", "hawk", "quill", "creed",
  "brainstorm", "code-forge", "legal", "computer-advisor", "screen-coach",
  "launch", "game-doc", "game-studio", "site-forge", "migration"]);

// GET /api/chat-history/:moonId — latest session for this user+moon
router.get("/chat-history/:moonId", async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { moonId } = req.params;
  if (!VALID_MOONS.has(moonId)) return res.status(400).json({ error: "Unknown moon" });

  try {
    const [row] = await db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.userId, userId), eq(chatSessions.moonId, moonId)))
      .orderBy(desc(chatSessions.updatedAt))
      .limit(1);

    res.json(row ?? null);
  } catch (err) {
    req.log.error({ err }, "chat-history: get failed");
    res.status(500).json({ error: "Failed to load" });
  }
});

// GET /api/chat-history — all moons with saved sessions (for command palette)
router.get("/chat-history", async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const rows = await db
      .select({
        id: chatSessions.id,
        moonId: chatSessions.moonId,
        title: chatSessions.title,
        updatedAt: chatSessions.updatedAt,
      })
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt))
      .limit(50);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "chat-history: list failed");
    res.status(500).json({ error: "Failed to load" });
  }
});

// POST /api/chat-history/:moonId — save/update session
router.post("/chat-history/:moonId", async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { moonId } = req.params;
  if (!VALID_MOONS.has(moonId)) return res.status(400).json({ error: "Unknown moon" });

  const { messages, title } = req.body ?? {};
  if (!Array.isArray(messages)) return res.status(400).json({ error: "messages array required" });

  const sessionTitle = title
    ?? (messages[0]?.content as string | undefined)?.slice(0, 80)
    ?? "Session";

  try {
    // Find existing session
    const [existing] = await db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(and(eq(chatSessions.userId, userId), eq(chatSessions.moonId, moonId)))
      .orderBy(desc(chatSessions.updatedAt))
      .limit(1);

    if (existing) {
      await db
        .update(chatSessions)
        .set({ messages, title: sessionTitle, updatedAt: new Date() })
        .where(eq(chatSessions.id, existing.id));
      res.json({ ok: true, id: existing.id });
    } else {
      const [created] = await db
        .insert(chatSessions)
        .values({ userId, moonId, messages, title: sessionTitle })
        .returning({ id: chatSessions.id });
      res.json({ ok: true, id: created.id });
    }
  } catch (err) {
    req.log.error({ err }, "chat-history: save failed");
    res.status(500).json({ error: "Failed to save" });
  }
});

// DELETE /api/chat-history/:moonId — clear session
router.delete("/chat-history/:moonId", async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { moonId } = req.params;

  try {
    await db
      .delete(chatSessions)
      .where(and(eq(chatSessions.userId, userId), eq(chatSessions.moonId, moonId)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "chat-history: delete failed");
    res.status(500).json({ error: "Failed to delete" });
  }
});

export default router;
