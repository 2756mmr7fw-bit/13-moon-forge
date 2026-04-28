import { Router } from "express";
import { db, sharedOutputs, projectsTable, messageUsageTable } from "@workspace/db";
import { eq, sum, count } from "drizzle-orm";

const router = Router();

const TIERS = [
  { min: 500, label: "Sovereign",   color: "#f97316" },
  { min: 300, label: "Forgemaster", color: "#a855f7" },
  { min: 150, label: "Craftsman",   color: "#3b82f6" },
  { min: 50,  label: "Builder",     color: "#22c55e" },
  { min: 0,   label: "Apprentice",  color: "#6b7280" },
];

function getTier(score: number) {
  return TIERS.find(t => score >= t.min) ?? TIERS[TIERS.length - 1];
}

// GET /api/score — compute and return Forge Score for the current user
router.get("/score", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [usageRow] = await db
      .select({ total: sum(messageUsageTable.count) })
      .from(messageUsageTable)
      .where(eq(messageUsageTable.userId, userId));

    const [projectRow] = await db
      .select({ count: count() })
      .from(projectsTable);

    const [outputRow] = await db
      .select({ count: count() })
      .from(sharedOutputs)
      .where(eq(sharedOutputs.userId, userId));

    const messages = Number(usageRow?.total ?? 0);
    const projects = Number(projectRow?.count ?? 0);
    const outputs = Number(outputRow?.count ?? 0);

    const score = messages + (projects * 10) + (outputs * 5);
    const tier = getTier(score);

    res.json({
      score,
      messages,
      projects,
      outputs,
      tier: tier.label,
      tierColor: tier.color,
      nextTier: TIERS.find(t => t.min > score) ? TIERS[TIERS.findIndex(t => t.min <= score) - 1] : null,
    });
  } catch (err) {
    req.log?.error({ err }, "score: failed");
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
