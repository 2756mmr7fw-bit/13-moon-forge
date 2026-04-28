import { Router } from "express";
import { db, sharedOutputs, projectsTable } from "@workspace/db";
import { gte, count } from "drizzle-orm";

const router = Router();

// GET /api/pulse — count of builders active today (public, no auth)
router.get("/pulse", async (req, res) => {
  try {
    const since = new Date();
    since.setHours(0, 0, 0, 0);

    const [outputsToday] = await db
      .select({ count: count() })
      .from(sharedOutputs)
      .where(gte(sharedOutputs.createdAt, since));

    const [totalProjects] = await db
      .select({ count: count() })
      .from(projectsTable);

    const today = outputsToday?.count ?? 0;
    const projects = totalProjects?.count ?? 0;

    // Add a small base number so new platforms don't show zero
    const displayCount = Math.max(today + Math.floor(projects / 3), 1);

    res.json({
      buildersToday: displayCount,
      outputsToday: today,
    });
  } catch (err) {
    req.log?.error({ err }, "pulse: failed");
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
