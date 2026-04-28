import { Router } from "express";
import { db, sharedOutputs } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

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

// GET /api/share/public — fetch all public shared outputs for gallery
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

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "share/public: fetch failed");
    res.status(500).json({ error: "Failed to load gallery" });
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
