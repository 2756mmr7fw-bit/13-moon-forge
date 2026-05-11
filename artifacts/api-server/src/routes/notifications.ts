import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// GET /api/notifications — list user's notifications (latest 50)
router.get("/notifications", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, req.userId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);
    return res.json(rows);
  } catch (err) {
    req.log.error({ err }, "notifications GET failed");
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// GET /api/notifications/unread-count
router.get("/notifications/unread-count", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(and(eq(notificationsTable.userId, req.userId), eq(notificationsTable.read, false)));
    return res.json({ count: rows.length });
  } catch (err) {
    req.log.error({ err }, "notifications unread-count failed");
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/notifications — create a notification (internal use)
router.post("/notifications", async (req, res) => {
  const { type, title, message, link } = req.body as {
    type?: string; title?: string; message?: string; link?: string;
  };
  if (!type || !title || !message) {
    return res.status(400).json({ error: "type, title, and message are required" });
  }
  try {
    const [row] = await db.insert(notificationsTable).values({
      userId: req.userId,
      type,
      title,
      message,
      link: link ?? null,
    }).returning();
    return res.json(row);
  } catch (err) {
    req.log.error({ err }, "notifications POST failed");
    return res.status(500).json({ error: "Failed to create notification" });
  }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch("/notifications/:id/read", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [row] = await db
      .update(notificationsTable)
      .set({ read: true })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.userId)))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (err) {
    req.log.error({ err }, "notifications PATCH failed");
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/notifications/read-all — mark all as read
router.post("/notifications/read-all", async (req, res) => {
  try {
    await db
      .update(notificationsTable)
      .set({ read: true })
      .where(and(eq(notificationsTable.userId, req.userId), eq(notificationsTable.read, false)));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "notifications read-all failed");
    return res.status(500).json({ error: "Failed" });
  }
});

// DELETE /api/notifications/:id
router.delete("/notifications/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await db
      .delete(notificationsTable)
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.userId)));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "notifications DELETE failed");
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;

// Helper to emit a notification from other routes
export async function emitNotification(userId: string, type: string, title: string, message: string, link?: string) {
  try {
    await db.insert(notificationsTable).values({ userId, type, title, message, link: link ?? null });
  } catch { /* non-fatal */ }
}
