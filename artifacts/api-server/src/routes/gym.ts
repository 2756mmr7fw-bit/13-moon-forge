import { Router } from "express";
import { db } from "@workspace/db";
import { gymAttempts, learningProfiles } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { checkSageAccess } from "../lib/moonApi";

const router = Router();

// ── Save a completed attempt ──────────────────────────────────────────────────
router.post("/gym/attempt", async (req, res) => {
  const access = await checkSageAccess(req.userId);
  if (!access.allowed) return res.status(403).json({ error: access.error });

  const {
    exerciseId, tier, category, passed,
    testsPassed, testsTotal, runsBeforePass,
    timeToFirstEditMs, timeTakenMs, hintsUsed,
    viewedSolution, studentCode,
  } = req.body as {
    exerciseId: string; tier: number; category: string; passed: boolean;
    testsPassed: number; testsTotal: number; runsBeforePass: number;
    timeToFirstEditMs?: number; timeTakenMs: number; hintsUsed: number;
    viewedSolution: boolean; studentCode?: string;
  };

  try {
    await db.insert(gymAttempts).values({
      userId: req.userId, exerciseId, tier, category, passed,
      testsPassed, testsTotal, runsBeforePass,
      timeToFirstEditMs, timeTakenMs, hintsUsed,
      viewedSolution, studentCode,
    });
    await updateLearningProfile(req.userId);
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "gym/attempt failed");
    return res.status(500).json({ error: "Failed to save attempt" });
  }
});

// ── Get user's gym progress ───────────────────────────────────────────────────
router.get("/gym/progress", async (req, res) => {
  try {
    const attempts = await db.select().from(gymAttempts)
      .where(eq(gymAttempts.userId, req.userId))
      .orderBy(desc(gymAttempts.createdAt));

    const profile = await db.select().from(learningProfiles)
      .where(eq(learningProfiles.userId, req.userId));

    // Compute per-exercise best result
    const exerciseBest: Record<string, { passed: boolean; attempts: number; bestTimeMs: number }> = {};
    for (const a of attempts) {
      const ex = exerciseBest[a.exerciseId];
      if (!ex) {
        exerciseBest[a.exerciseId] = { passed: a.passed, attempts: 1, bestTimeMs: a.timeTakenMs };
      } else {
        ex.attempts++;
        if (a.passed) ex.passed = true;
        if (a.timeTakenMs < ex.bestTimeMs) ex.bestTimeMs = a.timeTakenMs;
      }
    }

    const totalPassed  = Object.values(exerciseBest).filter(v => v.passed).length;
    const totalAttempted = Object.keys(exerciseBest).length;

    return res.json({
      exerciseBest,
      totalPassed,
      totalAttempted,
      recentAttempts: attempts.slice(0, 10),
      learningProfile: profile[0] ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "gym/progress failed");
    return res.status(500).json({ error: "Failed to load progress" });
  }
});

// ── Get learning profile ──────────────────────────────────────────────────────
router.get("/gym/learning-profile", async (req, res) => {
  try {
    const profile = await db.select().from(learningProfiles)
      .where(eq(learningProfiles.userId, req.userId));
    return res.json(profile[0] ?? null);
  } catch (err) {
    req.log.error({ err }, "gym/learning-profile failed");
    return res.status(500).json({ error: "Failed to load profile" });
  }
});

// ── Internal: recompute learning profile ─────────────────────────────────────
async function updateLearningProfile(userId: string) {
  const attempts = await db.select().from(gymAttempts)
    .where(eq(gymAttempts.userId, userId))
    .orderBy(desc(gymAttempts.createdAt))
    .limit(50);

  if (attempts.length < 3) return; // need minimum data

  let visualScore = 0, handsOnScore = 0, conceptualScore = 0, patternScore = 0;

  // Category accuracy for strongest/weakest
  const catStats: Record<string, { correct: number; total: number }> = {};
  for (const a of attempts) {
    if (!catStats[a.category]) catStats[a.category] = { correct: 0, total: 0 };
    catStats[a.category]!.total++;
    if (a.passed) catStats[a.category]!.correct++;
  }

  // Score signals
  for (const a of attempts) {
    const readRatio = a.timeToFirstEditMs && a.timeTakenMs
      ? a.timeToFirstEditMs / a.timeTakenMs : 0.2;
    const runsNorm  = Math.min(a.runsBeforePass / 10, 1); // 0–1

    // Hands-on: codes fast, runs many times, low read ratio
    handsOnScore += (1 - readRatio) * 0.5 + runsNorm * 0.5;

    // Conceptual: reads longer, fewer runs, high first-attempt accuracy
    conceptualScore += readRatio * 0.5 + (1 - runsNorm) * 0.5;

    // Visual: uses hints, views solution, responds to examples
    visualScore += (a.hintsUsed > 0 ? 0.4 : 0) + (a.viewedSolution ? 0.6 : 0);

    // Pattern: improves on later attempts (tracked by reducing runs over time)
    patternScore += a.passed && a.runsBeforePass === 1 && a.hintsUsed === 0 ? 1 : 0;
  }

  const n = attempts.length;
  visualScore     = Math.min(visualScore     / n, 1) * 100;
  handsOnScore    = Math.min(handsOnScore    / n, 1) * 100;
  conceptualScore = Math.min(conceptualScore / n, 1) * 100;
  patternScore    = Math.min(patternScore    / n, 1) * 100;

  const scores: Record<string, number> = { visual: visualScore, "hands-on": handsOnScore, conceptual: conceptualScore, pattern: patternScore };
  const dominantStyle = Object.entries(scores).sort(([, a], [, b]) => b - a)[0]![0];

  // Best/worst category
  const catEntries = Object.entries(catStats).map(([cat, s]) => ({
    cat, pct: s.total > 0 ? s.correct / s.total : 0, total: s.total,
  })).filter(e => e.total >= 2);

  const strongest = catEntries.sort((a, b) => b.pct - a.pct)[0]?.cat ?? null;
  const weakest   = catEntries.sort((a, b) => a.pct - b.pct)[0]?.cat ?? null;

  await db.insert(learningProfiles).values({
    userId, dominantStyle,
    visualScore, handsOnScore, conceptualScore, patternScore,
    totalAttempts: attempts.length,
    strongestCategory: strongest,
    weakestCategory: weakest,
    lastUpdated: new Date(),
  }).onConflictDoUpdate({
    target: learningProfiles.userId,
    set: { dominantStyle, visualScore, handsOnScore, conceptualScore, patternScore, totalAttempts: attempts.length, strongestCategory: strongest, weakestCategory: weakest, lastUpdated: new Date() },
  });
}

export default router;
