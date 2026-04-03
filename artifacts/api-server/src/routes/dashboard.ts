import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, pagesTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const [totalProjects] = await db.select({ count: count() }).from(projectsTable);
    const [publishedProjects] = await db
      .select({ count: count() })
      .from(projectsTable)
      .where(eq(projectsTable.status, "published"));
    const [draftProjects] = await db
      .select({ count: count() })
      .from(projectsTable)
      .where(eq(projectsTable.status, "draft"));
    const [totalPages] = await db.select({ count: count() }).from(pagesTable);

    res.json({
      totalProjects: totalProjects?.count ?? 0,
      publishedProjects: publishedProjects?.count ?? 0,
      draftProjects: draftProjects?.count ?? 0,
      totalPages: totalPages?.count ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/recent-projects", async (req, res) => {
  try {
    const projectRows = await db
      .select()
      .from(projectsTable)
      .orderBy(desc(projectsTable.updatedAt))
      .limit(6);

    const pageCounts = await db
      .select({ projectId: pagesTable.projectId, count: count() })
      .from(pagesTable)
      .groupBy(pagesTable.projectId);

    const pageCountMap = new Map(pageCounts.map((pc) => [pc.projectId, pc.count]));

    const projects = projectRows.map((p) => ({
      ...p,
      pageCount: pageCountMap.get(p.id) ?? 0,
    }));

    res.json(projects);
  } catch (err) {
    req.log.error({ err }, "Failed to get recent projects");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
