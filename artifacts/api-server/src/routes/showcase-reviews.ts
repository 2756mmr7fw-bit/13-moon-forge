import { Router } from "express";
import { db, showcaseReviewsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";

const router = Router();

// GET /api/showcase/:id/reviews — get upvote count + comments for an app
router.get("/showcase/:id/reviews", async (req, res) => {
  const appId = Number(req.params.id);
  try {
    const rows = await db
      .select()
      .from(showcaseReviewsTable)
      .where(eq(showcaseReviewsTable.appId, appId));

    const upvotes = rows.filter(r => r.upvoted).length;
    const comments = rows.filter(r => r.comment).map(r => ({
      id: r.id,
      comment: r.comment,
      createdAt: r.createdAt,
    }));

    const myVote = req.userId
      ? rows.find(r => r.userId === req.userId)?.upvoted ?? false
      : false;

    return res.json({ upvotes, comments, myVote });
  } catch (err) {
    req.log.error({ err }, "showcase reviews GET failed");
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/showcase/:id/upvote — toggle upvote
router.post("/showcase/:id/upvote", async (req, res) => {
  const appId = Number(req.params.id);
  if (!req.userId || req.userId.startsWith("anon-")) {
    return res.status(401).json({ error: "Sign in to upvote" });
  }

  try {
    const [existing] = await db
      .select()
      .from(showcaseReviewsTable)
      .where(and(eq(showcaseReviewsTable.appId, appId), eq(showcaseReviewsTable.userId, req.userId)));

    if (existing) {
      const [updated] = await db
        .update(showcaseReviewsTable)
        .set({ upvoted: !existing.upvoted })
        .where(eq(showcaseReviewsTable.id, existing.id))
        .returning();
      return res.json({ upvoted: updated.upvoted });
    } else {
      await db.insert(showcaseReviewsTable).values({
        appId,
        userId: req.userId,
        upvoted: true,
      });
      return res.json({ upvoted: true });
    }
  } catch (err) {
    req.log.error({ err }, "showcase upvote failed");
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/showcase/:id/comment — add a comment
router.post("/showcase/:id/comment", async (req, res) => {
  const appId = Number(req.params.id);
  const { comment } = req.body as { comment?: string };
  if (!comment?.trim()) return res.status(400).json({ error: "comment required" });
  if (!req.userId || req.userId.startsWith("anon-")) {
    return res.status(401).json({ error: "Sign in to comment" });
  }

  try {
    const [existing] = await db
      .select()
      .from(showcaseReviewsTable)
      .where(and(eq(showcaseReviewsTable.appId, appId), eq(showcaseReviewsTable.userId, req.userId)));

    if (existing) {
      const [updated] = await db
        .update(showcaseReviewsTable)
        .set({ comment: comment.trim() })
        .where(eq(showcaseReviewsTable.id, existing.id))
        .returning();
      return res.json(updated);
    } else {
      const [row] = await db.insert(showcaseReviewsTable).values({
        appId,
        userId: req.userId,
        upvoted: false,
        comment: comment.trim(),
      }).returning();
      return res.json(row);
    }
  } catch (err) {
    req.log.error({ err }, "showcase comment failed");
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
