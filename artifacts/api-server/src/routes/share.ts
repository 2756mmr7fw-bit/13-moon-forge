import { Router } from "express";
import { db, sharedOutputs, galleryReactions } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

// POST /api/share — create a shareable link for a Moon output
router.post("/share", async (req, res) => {
  const userId = req.userId;

  const { moonId, title, content } = req.body ?? {};
  if (!moonId || !title || !content) {
    return res.status(400).json({ error: "moonId, title, content required" });
  }

  try {
    const [row] = await db
      .insert(sharedOutputs)
      .values({
        userId,
        moonId: String(moonId).slice(0, 64),
        title:  String(title).slice(0, 200),
        content: String(content).slice(0, 100_000),
      })
      .returning({ id: sharedOutputs.id, createdAt: sharedOutputs.createdAt });

    const APP_DOMAIN =
      process.env.REPLIT_DOMAINS?.split(",")[0] ??
      process.env.APP_DOMAIN ??
      "13moonforge.ai";

    res.json({
      id: row.id,
      url: `https://${APP_DOMAIN}/share/${row.id}`,
      createdAt: row.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "share: create failed");
    res.status(500).json({ error: "Failed to create share" });
  }
});

// GET /api/share/public — fetch all public shared outputs with reaction counts
router.get("/share/public", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: sharedOutputs.id,
        moonId: sharedOutputs.moonId,
        title: sharedOutputs.title,
        content: sharedOutputs.content,
        createdAt: sharedOutputs.createdAt,
      })
      .from(sharedOutputs)
      .where(eq(sharedOutputs.isPublic, true))
      .orderBy(desc(sharedOutputs.createdAt))
      .limit(60);

    if (rows.length === 0) return res.json([]);

    const reactionRows = await db
      .select({
        outputId: galleryReactions.outputId,
        reaction: galleryReactions.reaction,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(galleryReactions)
      .groupBy(galleryReactions.outputId, galleryReactions.reaction);

    const reactionMap: Record<string, { fire: number; useful: number; saved: number }> = {};
    for (const r of reactionRows) {
      if (!reactionMap[r.outputId]) reactionMap[r.outputId] = { fire: 0, useful: 0, saved: 0 };
      const k = r.reaction as "fire" | "useful" | "saved";
      if (k in reactionMap[r.outputId]) reactionMap[r.outputId][k] = r.count;
    }

    res.json(rows.map(r => ({ ...r, reactions: reactionMap[r.id] ?? { fire: 0, useful: 0, saved: 0 } })));
  } catch (err) {
    req.log.error({ err }, "share/public: fetch failed");
    res.status(500).json({ error: "Failed to load gallery" });
  }
});

// POST /api/share/:id/react — toggle a reaction (fire | useful | saved)
router.post("/share/:id/react", async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { reaction } = req.body ?? {};

  if (!["fire", "useful", "saved"].includes(reaction)) {
    return res.status(400).json({ error: "reaction must be fire | useful | saved" });
  }

  try {
    const existing = await db
      .select()
      .from(galleryReactions)
      .where(and(
        eq(galleryReactions.outputId, id),
        eq(galleryReactions.userId, userId),
        eq(galleryReactions.reaction, reaction),
      ))
      .limit(1);

    if (existing.length > 0) {
      await db.delete(galleryReactions).where(eq(galleryReactions.id, existing[0].id));
      return res.json({ action: "removed", reaction });
    }
    await db.insert(galleryReactions).values({ outputId: id, userId, reaction });
    res.json({ action: "added", reaction });
  } catch (err) {
    req.log.error({ err }, "share: react failed");
    res.status(500).json({ error: "Failed to react" });
  }
});

// GET /api/share/:id — fetch a shared output (public — no auth required)
router.get("/share/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [row] = await db
      .select()
      .from(sharedOutputs)
      .where(eq(sharedOutputs.id, id))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Not found" });
    if (!row.isPublic) return res.status(403).json({ error: "This link is private" });

    res.json(row);
  } catch (err) {
    req.log.error({ err }, "share: fetch failed");
    res.status(500).json({ error: "Failed to load" });
  }
});

// DELETE /api/share/:id — revoke a share (owner only)
router.delete("/share/:id", async (req, res) => {
  const userId = req.userId;

  const { id } = req.params;
  try {
    await db
      .delete(sharedOutputs)
      .where(and(eq(sharedOutputs.id, id), eq(sharedOutputs.userId, userId)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "share: delete failed");
    res.status(500).json({ error: "Failed to delete" });
  }
});

export default router;
