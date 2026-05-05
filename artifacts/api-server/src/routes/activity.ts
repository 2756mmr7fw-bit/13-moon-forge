import { Router } from "express";
import { db } from "@workspace/db";
import { reposTable, importsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

// ── GET /api/activity ─────────────────────────────────────────────────────────
// Returns a unified timeline of recent activity: repos created, imports, etc.
router.get("/activity", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });

  try {
    const [repos, imports] = await Promise.all([
      db.select().from(reposTable).orderBy(desc(reposTable.createdAt)).limit(30),
      db.select().from(importsTable).orderBy(desc(importsTable.createdAt)).limit(30),
    ]);

    type EventType = "repo_created" | "import_started" | "import_done" | "import_error";

    interface ActivityEvent {
      id: string;
      type: EventType;
      title: string;
      subtitle: string | null;
      status: string | null;
      timestamp: string;
      meta: Record<string, unknown>;
    }

    const events: ActivityEvent[] = [];

    for (const repo of repos) {
      events.push({
        id: `repo-${repo.id}`,
        type: "repo_created",
        title: repo.name,
        subtitle: repo.description ?? null,
        status: repo.visibility,
        timestamp: repo.createdAt.toISOString(),
        meta: {
          repoId: repo.id,
          forgejoFullName: repo.forgejoFullName,
          cloneUrl: repo.cloneUrl,
          visibility: repo.visibility,
        },
      });
    }

    for (const imp of imports) {
      const type: EventType =
        imp.status === "done" ? "import_done" :
        imp.status === "error" ? "import_error" :
        "import_started";

      events.push({
        id: `import-${imp.id}`,
        type,
        title: imp.sourceRepoName ?? "Import",
        subtitle: imp.sourceUrl ?? null,
        status: imp.status,
        timestamp: imp.createdAt.toISOString(),
        meta: {
          importId: imp.id,
          source: imp.source,
          sourceUrl: imp.sourceUrl,
          errorMessage: imp.errorMessage,
          repoId: imp.repoId,
        },
      });
    }

    // Sort all events by timestamp descending
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ events: events.slice(0, 50) });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch activity");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
