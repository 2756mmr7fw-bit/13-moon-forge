import { Router } from "express";
import { db, messageUsageTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const PLAN_LIMITS: Record<string, number> = {
  free:    10,
  basic:   150,
  pro:     500,
  forge:   150,
  creator: 150,
  studio:  500,
  team:    500,
};

function limitForPlan(plan: string | null): number {
  if (!plan) return PLAN_LIMITS["free"]!;
  return PLAN_LIMITS[plan.toLowerCase()] ?? PLAN_LIMITS["free"]!;
}

router.get("/quota", async (req, res) => {
  try {
    const userId = req.userId;
    const month = currentMonth();

    const [row] = await db
      .select()
      .from(messageUsageTable)
      .where(and(eq(messageUsageTable.userId, userId), eq(messageUsageTable.month, month)));

    const used = row?.count ?? 0;
    const plan = "free";
    const limit = limitForPlan(plan);
    const remaining = Math.max(0, limit - used);
    const percent = Math.min(100, Math.round((used / limit) * 100));

    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);
    resetDate.setDate(1);
    resetDate.setHours(0, 0, 0, 0);

    res.json({ used, limit, remaining, percent, plan, resetDate: resetDate.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to get quota");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

export async function incrementUsage(userId: string): Promise<void> {
  const month = currentMonth();
  await db
    .insert(messageUsageTable)
    .values({ userId, month, count: 1 })
    .onConflictDoUpdate({
      target: [messageUsageTable.userId, messageUsageTable.month],
      set: { count: sql`${messageUsageTable.count} + 1`, updatedAt: new Date() },
    })
    .catch(() => {});
}
