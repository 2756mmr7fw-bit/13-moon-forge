import { Router } from "express";
import { db } from "@workspace/db";
import { debugTestSessions, debugTestResults, debugLevelProgress } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { checkSageAccess } from "../lib/moonApi";

const router = Router();

const CHALLENGES_PER_LEVEL: Record<number, number> = {
  1: 5, 2: 5, 3: 5, 4: 5,
  5: 7, 6: 7, 7: 7, 8: 7,
  9: 8, 10: 8, 11: 8,
  12: 15,
};

const LEVEL_SPEC: Record<number, string> = {
  1:  "HTML only. Bug: missing closing tag, wrong tag name, or unclosed attribute.",
  2:  "CSS only. Bug: wrong property name, missing semicolon, or wrong unit.",
  3:  "JavaScript. Bug: syntax error — missing bracket, wrong quote type, typo in keyword.",
  4:  "JavaScript. Bug: wrong variable name (typo), simple off-by-one error in a loop.",
  5:  "JavaScript. Bug: flipped comparison operator (< vs >, === vs !==) causing wrong logic.",
  6:  "JavaScript. Bug: variable scoping issue — var vs let, or closure capturing wrong value.",
  7:  "JavaScript. Bug: missing await on an async function call causing incorrect behavior.",
  8:  "JavaScript. Bug: wrong array method used (e.g., map vs forEach, splice vs slice).",
  9:  "JavaScript/Node.js. Bug: API response mishandled — wrong status check or JSON not parsed.",
  10: "JavaScript. Bug: incorrect 'this' binding in a method or callback.",
  11: "JavaScript/Node.js. Bug: security flaw — SQL injection vector, or secret exposed in response.",
  12: "Any language. Bug: architectural — N+1 query, race condition, or O(n²) when O(n) is possible.",
};

const MIN_SESSIONS_TO_ADVANCE = 3;

async function generateChallenge(level: number): Promise<{
  description: string; brokenCode: string; bugType: string;
} | null> {
  const spec = LEVEL_SPEC[level] ?? LEVEL_SPEC[1];
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a coding instructor creating test challenges. Generate a broken code snippet.
Return JSON with:
- "description": 1-2 sentences what the code SHOULD do
- "brokenCode": realistic broken code (5-20 lines), ONE bug embedded naturally
- "bugType": one of: "Syntax Error"|"Logic Error"|"Scope Bug"|"Async Bug"|"Type Error"|"Security Flaw"|"Performance Bug"|"Runtime Error"
No comments pointing at the bug. Make it look like real developer code.`,
        },
        { role: "user", content: `Level ${level}/12: ${spec}` },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    return JSON.parse(raw) as { description: string; brokenCode: string; bugType: string };
  } catch {
    return null;
  }
}

async function checkAnswer(description: string, brokenCode: string, userFix: string): Promise<{
  correct: boolean; explanation: string;
}> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 300,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a senior developer evaluating a student's bug fix.
Return JSON with:
- "correct": boolean — true if the fix resolves the core bug
- "explanation": 1-2 sentences. If correct: what the bug was and why the fix works. If wrong: what's still broken (no full answer).`,
        },
        {
          role: "user",
          content: `Code should: ${description}
BROKEN:\n${brokenCode}
STUDENT FIX:\n${userFix}`,
        },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    return JSON.parse(raw) as { correct: boolean; explanation: string };
  } catch {
    return { correct: false, explanation: "Could not evaluate. Try again." };
  }
}

// ── Generate test challenges for a level ────────────────────────────────────
router.post("/debug-test/generate", async (req, res) => {
  const { level } = req.body as { level?: unknown };
  const testLevel = Math.min(Math.max(Number(level) || 1, 1), 12);

  const access = await checkSageAccess(req.userId);
  if (!access.allowed) {
    return res.status(403).json({ error: access.error, subscribeUrl: access.subscribeUrl });
  }

  const count = CHALLENGES_PER_LEVEL[testLevel] ?? 5;

  // For cumulative levels (5+), mix in some from earlier levels
  const levelPool: number[] = [];
  if (testLevel >= 5) {
    const prevCount = Math.floor(count * 0.3);
    const newCount = count - prevCount;
    for (let i = 0; i < prevCount; i++) {
      levelPool.push(Math.ceil(Math.random() * (testLevel - 1)));
    }
    for (let i = 0; i < newCount; i++) levelPool.push(testLevel);
  } else {
    for (let i = 0; i < count; i++) levelPool.push(testLevel);
  }

  // Shuffle pool
  for (let i = levelPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [levelPool[i], levelPool[j]] = [levelPool[j]!, levelPool[i]!];
  }

  try {
    const challenges = await Promise.all(levelPool.map(l => generateChallenge(l)));
    const valid = challenges
      .map((c, i) => c ? { ...c, challengeLevel: levelPool[i]! } : null)
      .filter(Boolean);

    if (valid.length === 0) {
      return res.status(500).json({ error: "Failed to generate challenges. Try again." });
    }

    return res.json({ level: testLevel, challenges: valid, total: valid.length });
  } catch (err) {
    req.log.error({ err }, "/debug-test/generate failed");
    return res.status(500).json({ error: "Failed to generate challenges." });
  }
});

// ── Check a single answer (fast, non-streaming) ──────────────────────────────
router.post("/debug-test/check-answer", async (req, res) => {
  const { description, brokenCode, userFix } = req.body as Record<string, string>;
  if (!description || !brokenCode || !userFix) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const access = await checkSageAccess(req.userId);
  if (!access.allowed) {
    return res.status(403).json({ error: access.error });
  }

  try {
    const result = await checkAnswer(description, brokenCode, userFix);
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "/debug-test/check-answer failed");
    return res.status(500).json({ error: "Check failed. Try again." });
  }
});

// ── Complete a test session (save results) ───────────────────────────────────
router.post("/debug-test/complete", async (req, res) => {
  const { level, mode, totalSeconds, results } = req.body as {
    level: number;
    mode?: string;
    totalSeconds: number;
    results: { challengeLevel: number; bugType: string; correct: boolean; secondsTaken: number }[];
  };

  if (!level || !results?.length) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const correctCount = results.filter(r => r.correct).length;

    const [session] = await db.insert(debugTestSessions).values({
      userId:         req.userId,
      level,
      mode:           mode ?? "level",
      totalSeconds,
      challengeCount: results.length,
      correctCount,
      completedAt:    new Date(),
    }).returning();

    if (!session) return res.status(500).json({ error: "Failed to save session" });

    if (results.length > 0) {
      await db.insert(debugTestResults).values(
        results.map(r => ({
          sessionId:      session.id,
          userId:         req.userId,
          challengeLevel: r.challengeLevel,
          bugType:        r.bugType,
          correct:        r.correct,
          secondsTaken:   r.secondsTaken,
        }))
      );
    }

    // Update level progress
    const existing = await db.select().from(debugLevelProgress)
      .where(and(eq(debugLevelProgress.userId, req.userId), eq(debugLevelProgress.level, level)));

    const prevBest = existing[0]?.bestTotalSeconds ?? null;
    const newBest = prevBest === null || totalSeconds < prevBest ? totalSeconds : prevBest;
    const newCount = (existing[0]?.completedSessions ?? 0) + 1;

    await db.insert(debugLevelProgress).values({
      userId:            req.userId,
      level,
      completedSessions: newCount,
      bestTotalSeconds:  newBest,
    }).onConflictDoUpdate({
      target:  [debugLevelProgress.userId, debugLevelProgress.level],
      set: {
        completedSessions: sql`${debugLevelProgress.completedSessions} + 1`,
        bestTotalSeconds:  newBest,
        updatedAt:         new Date(),
      },
    });

    const unlockedNext = newCount >= MIN_SESSIONS_TO_ADVANCE;

    return res.json({
      sessionId:    session.id,
      correctCount,
      total:        results.length,
      totalSeconds,
      unlockedNext,
      completedSessions: newCount,
      minRequired:  MIN_SESSIONS_TO_ADVANCE,
    });
  } catch (err) {
    req.log.error({ err }, "/debug-test/complete failed");
    return res.status(500).json({ error: "Failed to save results." });
  }
});

// ── Get user progress across all levels ──────────────────────────────────────
router.get("/debug-test/progress", async (req, res) => {
  try {
    const progress = await db.select().from(debugLevelProgress)
      .where(eq(debugLevelProgress.userId, req.userId));

    const recentSessions = await db.select().from(debugTestSessions)
      .where(eq(debugTestSessions.userId, req.userId))
      .orderBy(desc(debugTestSessions.completedAt))
      .limit(10);

    return res.json({ progress, recentSessions, minRequired: MIN_SESSIONS_TO_ADVANCE });
  } catch (err) {
    req.log.error({ err }, "/debug-test/progress failed");
    return res.status(500).json({ error: "Failed to load progress." });
  }
});

// ── Get full session history for a level ─────────────────────────────────────
router.get("/debug-test/history", async (req, res) => {
  const level = req.query.level ? Number(req.query.level) : undefined;

  try {
    const query = db.select().from(debugTestSessions)
      .where(
        level !== undefined
          ? and(eq(debugTestSessions.userId, req.userId), eq(debugTestSessions.level, level))
          : eq(debugTestSessions.userId, req.userId)
      )
      .orderBy(desc(debugTestSessions.completedAt))
      .limit(50);

    const sessions = await query;
    return res.json({ sessions });
  } catch (err) {
    req.log.error({ err }, "/debug-test/history failed");
    return res.status(500).json({ error: "Failed to load history." });
  }
});

export default router;
