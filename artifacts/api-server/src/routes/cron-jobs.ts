import { Router } from "express";
import { db, cronJobsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// GET /api/cron-jobs
router.get("/cron-jobs", async (req, res) => {
  const jobs = await db.select().from(cronJobsTable).where(eq(cronJobsTable.userId, req.userId));
  return res.json(jobs);
});

// POST /api/cron-jobs
router.post("/cron-jobs", async (req, res) => {
  const { name, schedule, command } = req.body as { name?: string; schedule?: string; command?: string };
  if (!name?.trim() || !schedule?.trim() || !command?.trim()) {
    return res.status(400).json({ error: "name, schedule, and command are required" });
  }
  const [job] = await db.insert(cronJobsTable).values({
    userId: req.userId,
    name: name.trim(),
    schedule: schedule.trim(),
    command: command.trim(),
    enabled: true,
  }).returning();
  return res.json(job);
});

// PATCH /api/cron-jobs/:id
router.patch("/cron-jobs/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { enabled, name, schedule, command } = req.body as Partial<{
    enabled: boolean; name: string; schedule: string; command: string;
  }>;

  const updates: Partial<typeof cronJobsTable.$inferInsert> = {};
  if (enabled !== undefined) updates.enabled = enabled;
  if (name) updates.name = name;
  if (schedule) updates.schedule = schedule;
  if (command) updates.command = command;

  const [updated] = await db
    .update(cronJobsTable)
    .set(updates)
    .where(and(eq(cronJobsTable.id, id), eq(cronJobsTable.userId, req.userId)))
    .returning();

  if (!updated) return res.status(404).json({ error: "Not found" });
  return res.json(updated);
});

// DELETE /api/cron-jobs/:id
router.delete("/cron-jobs/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(cronJobsTable).where(and(eq(cronJobsTable.id, id), eq(cronJobsTable.userId, req.userId)));
  return res.json({ ok: true });
});

// POST /api/cron-jobs/:id/run — trigger immediate run
router.post("/cron-jobs/:id/run", async (req, res) => {
  const id = Number(req.params.id);
  const [job] = await db
    .select()
    .from(cronJobsTable)
    .where(and(eq(cronJobsTable.id, id), eq(cronJobsTable.userId, req.userId)));

  if (!job) return res.status(404).json({ error: "Not found" });

  // Mark as running
  await db.update(cronJobsTable)
    .set({ lastRun: new Date(), lastStatus: "running" })
    .where(eq(cronJobsTable.id, id));

  // Fire-and-forget execution
  import("child_process").then(({ exec }) => {
    exec(job.command, { timeout: 30000 }, async (err) => {
      await db.update(cronJobsTable)
        .set({ lastStatus: err ? "error" : "success" })
        .where(eq(cronJobsTable.id, id));
    });
  }).catch(() => {});

  return res.json({ ok: true, message: "Job triggered" });
});

export default router;
