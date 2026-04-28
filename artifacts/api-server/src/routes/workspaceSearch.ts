import { Router } from "express";
import { db, workspaceItemsTable } from "@workspace/db";
import { and, eq, isNull, ilike, or } from "drizzle-orm";

const router = Router();

// GET /api/workspace/search?q=<query> — full-text search across user's workspace
router.get("/workspace/search", async (req, res) => {
  const userId = req.userId;

  const q = String(req.query.q ?? "").trim();
  if (!q || q.length < 2) return res.json([]);

  try {
    const term = `%${q}%`;
    const results = await db
      .select({
        id:        workspaceItemsTable.id,
        name:      workspaceItemsTable.name,
        type:      workspaceItemsTable.type,
        content:   workspaceItemsTable.content,
        parentId:  workspaceItemsTable.parentId,
        updatedAt: workspaceItemsTable.updatedAt,
      })
      .from(workspaceItemsTable)
      .where(
        and(
          eq(workspaceItemsTable.userId, userId),
          isNull(workspaceItemsTable.deletedAt),
          or(
            ilike(workspaceItemsTable.name, term),
            ilike(workspaceItemsTable.content, term),
          ),
        ),
      )
      .limit(30);

    // Add snippet of matching content
    const withSnippets = results.map(r => {
      let snippet = "";
      if (r.content) {
        const idx = r.content.toLowerCase().indexOf(q.toLowerCase());
        if (idx !== -1) {
          const start = Math.max(0, idx - 40);
          const end   = Math.min(r.content.length, idx + 80);
          snippet = (start > 0 ? "…" : "") + r.content.slice(start, end) + (end < r.content.length ? "…" : "");
        } else {
          snippet = r.content.slice(0, 100);
        }
      }
      return { ...r, snippet };
    });

    res.json(withSnippets);
  } catch (err) {
    req.log.error({ err }, "workspace-search: failed");
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
