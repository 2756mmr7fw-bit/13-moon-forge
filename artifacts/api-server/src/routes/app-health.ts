import { Router } from "express";
import { db, forgeUsersTable, projectsTable, chatSessions, inspectorReportsTable, messageUsageTable, paymentsTable } from "@workspace/db";
import { sql, gte, desc } from "drizzle-orm";
import os from "os";
import { execSync } from "child_process";

const router = Router();

router.get("/app-health", async (req, res) => {
  const start = Date.now();

  const checks: Record<string, { status: "ok" | "warn" | "error"; latencyMs?: number; detail?: string; pct?: number }> = {};

  const dbStart = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks.database = { status: "error", latencyMs: Date.now() - dbStart, detail: String(err) };
  }

  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const memPct = Math.round(((totalMemory - freeMemory) / totalMemory) * 100);
  checks.memory = {
    status: memPct > 90 ? "error" : memPct > 75 ? "warn" : "ok",
    detail: `${memPct}% used — ${Math.round((totalMemory - freeMemory) / 1024 / 1024)} MB of ${Math.round(totalMemory / 1024 / 1024)} MB`,
    pct: memPct,
  };

  const loadAvg = os.loadavg()[0];
  const cpuCount = os.cpus().length;
  const cpuPct = Math.min(100, Math.round((loadAvg / cpuCount) * 100));
  checks.cpu = {
    status: cpuPct > 90 ? "error" : cpuPct > 70 ? "warn" : "ok",
    detail: `${cpuPct}% load — avg ${loadAvg.toFixed(2)} across ${cpuCount} core${cpuCount > 1 ? "s" : ""}`,
    pct: cpuPct,
  };

  try {
    const dfOut = execSync("df -k / 2>/dev/null", { timeout: 3000 }).toString().trim().split("\n")[1];
    const parts = dfOut.split(/\s+/);
    const totalKb  = parseInt(parts[1]);
    const usedKb   = parseInt(parts[2]);
    const diskPct  = Math.round((usedKb / totalKb) * 100);
    const usedGb   = (usedKb  / 1024 / 1024).toFixed(1);
    const totalGb  = (totalKb / 1024 / 1024).toFixed(1);
    checks.disk = {
      status: diskPct > 90 ? "error" : diskPct > 75 ? "warn" : "ok",
      detail: `${diskPct}% used — ${usedGb} GB of ${totalGb} GB`,
      pct: diskPct,
    };
  } catch {
    checks.disk = { status: "ok", detail: "Disk info unavailable" };
  }

  const uptimeSeconds = Math.round(process.uptime());
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  checks.uptime = {
    status: "ok",
    detail: `${hours}h ${minutes}m`,
  };

  const apiLatency = Date.now() - start;
  checks.api = {
    status: apiLatency > 2000 ? "warn" : "ok",
    latencyMs: apiLatency,
  };

  const overall = Object.values(checks).some(c => c.status === "error")
    ? "error"
    : Object.values(checks).some(c => c.status === "warn")
    ? "warn"
    : "ok";

  return res.json({
    status: overall,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "unknown",
    nodeVersion: process.version,
    checks,
  });
});

router.get("/app-health/metrics", async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersWeek,
      totalProjects,
      totalChats,
      totalInspections,
      totalPaid,
      recentUsage,
    ] = await Promise.all([
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(forgeUsersTable),
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(forgeUsersTable).where(gte(forgeUsersTable.createdAt, sevenDaysAgo)),
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(projectsTable),
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(chatSessions),
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(inspectorReportsTable),
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(paymentsTable).where(sql`paid = true`),
      db.select({
        month: messageUsageTable.month,
        total: sql<number>`cast(sum(count) as int)`,
      }).from(messageUsageTable).where(gte(messageUsageTable.updatedAt, thirtyDaysAgo)).groupBy(messageUsageTable.month).orderBy(desc(messageUsageTable.month)).limit(6),
    ]);

    return res.json({
      users: {
        total: totalUsers[0]?.count ?? 0,
        newThisWeek: newUsersWeek[0]?.count ?? 0,
        paying: totalPaid[0]?.count ?? 0,
      },
      projects: totalProjects[0]?.count ?? 0,
      chatSessions: totalChats[0]?.count ?? 0,
      inspections: totalInspections[0]?.count ?? 0,
      messageUsage: recentUsage,
    });
  } catch (err) {
    req.log.error({ err }, "app-health metrics failed");
    return res.status(500).json({ error: "Failed to load metrics" });
  }
});

export default router;
