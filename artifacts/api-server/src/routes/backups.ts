import { Router } from "express";
import { db, backupsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execAsync = promisify(exec);
const router = Router();

// GET /api/backups
router.get("/backups", async (req, res) => {
  const rows = await db
    .select()
    .from(backupsTable)
    .where(eq(backupsTable.userId, req.userId))
    .orderBy(desc(backupsTable.createdAt));
  return res.json(rows);
});

// POST /api/backups — create a new backup
router.post("/backups", async (req, res) => {
  const { label } = req.body as { label?: string };

  const [backup] = await db.insert(backupsTable).values({
    userId: req.userId,
    label: label?.trim() || `Backup — ${new Date().toISOString()}`,
    status: "pending",
  }).returning();

  // Run pg_dump in background
  const dbUrl = process.env.DATABASE_URL ?? "";
  const tmpPath = join(tmpdir(), `forge-backup-${backup.id}.sql`);

  (async () => {
    try {
      await db.update(backupsTable).set({ status: "running" }).where(eq(backupsTable.id, backup.id));
      await execAsync(`pg_dump "${dbUrl}" -f "${tmpPath}" --no-password`, { timeout: 120000 });
      const buf = await readFile(tmpPath);
      const size = buf.length;

      // Store path reference (in a real deployment, upload to object storage)
      await db.update(backupsTable).set({
        status: "complete",
        size,
        storagePath: tmpPath,
        completedAt: new Date(),
      }).where(eq(backupsTable.id, backup.id));
    } catch (err) {
      await db.update(backupsTable).set({
        status: "error",
        errorMsg: String(err),
      }).where(eq(backupsTable.id, backup.id));
    }
  })().catch(() => {});

  return res.json(backup);
});

// GET /api/backups/:id/download
router.get("/backups/:id/download", async (req, res) => {
  const id = Number(req.params.id);
  const [backup] = await db
    .select()
    .from(backupsTable)
    .where(and(eq(backupsTable.id, id), eq(backupsTable.userId, req.userId)));

  if (!backup || backup.status !== "complete" || !backup.storagePath) {
    return res.status(404).json({ error: "Backup not available" });
  }

  try {
    const buf = await readFile(backup.storagePath);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="backup-${id}.sql"`);
    return res.send(buf);
  } catch {
    return res.status(404).json({ error: "Backup file not found on disk" });
  }
});

// POST /api/backups/:id/restore
router.post("/backups/:id/restore", async (req, res) => {
  const id = Number(req.params.id);
  const [backup] = await db
    .select()
    .from(backupsTable)
    .where(and(eq(backupsTable.id, id), eq(backupsTable.userId, req.userId)));

  if (!backup || backup.status !== "complete" || !backup.storagePath) {
    return res.status(404).json({ error: "Backup not available" });
  }

  try {
    const dbUrl = process.env.DATABASE_URL ?? "";
    await execAsync(`psql "${dbUrl}" -f "${backup.storagePath}" --no-password`, { timeout: 120000 });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "restore failed");
    return res.status(500).json({ error: "Restore failed — check server logs" });
  }
});

// DELETE /api/backups/:id
router.delete("/backups/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [backup] = await db
    .select()
    .from(backupsTable)
    .where(and(eq(backupsTable.id, id), eq(backupsTable.userId, req.userId)));

  if (backup?.storagePath) {
    unlink(backup.storagePath).catch(() => {});
  }

  await db.delete(backupsTable).where(and(eq(backupsTable.id, id), eq(backupsTable.userId, req.userId)));
  return res.json({ ok: true });
});

export default router;
