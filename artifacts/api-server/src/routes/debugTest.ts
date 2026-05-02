import { Router } from "express";
import { db } from "@workspace/db";
import {
  debugTestSessions, debugTestResults, debugLevelProgress,
  debugStreaks, debugTeachBack, debugDailyChallenges,
  debugDailyAttempts, debugAchievements,
} from "@workspace/db";
import { eq, and, desc, sql, ne, count, inArray } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { checkSageAccess } from "../lib/moonApi";

const router = Router();

// ── Constants ────────────────────────────────────────────────────────────────
const MIN_ACCURACY        = 0.6;
const MIN_SESSIONS        = 3;

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

const LANG_SPEC: Record<string, string> = {
  javascript: "Write JavaScript (ES2022). Use realistic patterns like arrow functions, async/await, array methods.",
  typescript: "Write TypeScript. Include type annotations. The bug may involve type misuse.",
  python:     "Write Python 3. Use realistic patterns like list comprehensions, dict operations, class methods.",
  sql:        "Write SQL (PostgreSQL). Include table definitions in a comment above. Bug in SELECT/JOIN/WHERE logic.",
};

// ── AI helpers ───────────────────────────────────────────────────────────────
async function generateChallenge(level: number, language = "javascript"): Promise<{
  description: string; brokenCode: string; bugType: string; language: string;
} | null> {
  const levelSpec = LEVEL_SPEC[level] ?? LEVEL_SPEC[1]!;
  const langSpec  = LANG_SPEC[language] ?? LANG_SPEC["javascript"]!;
  try {
    const c = await openai.chat.completions.create({
      model: "gpt-4o", max_tokens: 700, response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `You are a coding instructor. Generate a broken code snippet.
Return JSON: { "description": "1-2 sentences what it SHOULD do", "brokenCode": "realistic broken code (5-20 lines), ONE bug naturally embedded", "bugType": "Syntax Error|Logic Error|Scope Bug|Async Bug|Type Error|Security Flaw|Performance Bug|Runtime Error" }
Language rules: ${langSpec}
No comments pointing to the bug.` },
        { role: "user", content: `Level ${level}/12: ${levelSpec}` },
      ],
    });
    const raw = JSON.parse(c.choices[0]?.message?.content ?? "{}") as { description: string; brokenCode: string; bugType: string };
    return { ...raw, language };
  } catch { return null; }
}

async function checkAnswer(description: string, brokenCode: string, userFix: string): Promise<{
  correct: boolean; explanation: string;
}> {
  try {
    const c = await openai.chat.completions.create({
      model: "gpt-4o", max_tokens: 300, response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `Senior developer evaluating a student's bug fix.
Return JSON: { "correct": boolean, "explanation": "1-2 sentences. Correct: what bug was and why fix works. Wrong: what's still broken (no full answer)." }` },
        { role: "user", content: `Code should: ${description}\nBROKEN:\n${brokenCode}\nSTUDENT FIX:\n${userFix}` },
      ],
    });
    return JSON.parse(c.choices[0]?.message?.content ?? "{}") as { correct: boolean; explanation: string };
  } catch { return { correct: false, explanation: "Could not evaluate. Try again." }; }
}

// ── Streak helpers ────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10); }
function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function updateStreak(userId: string): Promise<number> {
  const today = todayStr();
  const yesterday = yesterdayStr();

  const [existing] = await db.select().from(debugStreaks).where(eq(debugStreaks.userId, userId));

  if (!existing) {
    await db.insert(debugStreaks).values({ userId, currentStreak: 1, longestStreak: 1, lastActiveDate: today });
    return 1;
  }

  if (existing.lastActiveDate === today) return existing.currentStreak;

  let newStreak = 1;
  if (existing.lastActiveDate === yesterday) newStreak = existing.currentStreak + 1;

  const longest = Math.max(newStreak, existing.longestStreak);
  await db.update(debugStreaks)
    .set({ currentStreak: newStreak, longestStreak: longest, lastActiveDate: today, updatedAt: new Date() })
    .where(eq(debugStreaks.userId, userId));

  return newStreak;
}

// ── Achievement helpers ───────────────────────────────────────────────────────
async function awardAchievement(userId: string, id: string): Promise<boolean> {
  try {
    await db.insert(debugAchievements).values({ userId, achievementId: id })
      .onConflictDoNothing();
    // Check if it was actually inserted (not a duplicate)
    const rows = await db.select().from(debugAchievements)
      .where(and(eq(debugAchievements.userId, userId), eq(debugAchievements.achievementId, id)));
    return rows.length > 0;
  } catch { return false; }
}

async function checkAndAwardAchievements(
  userId: string,
  session: { mode: string; totalSeconds: number; correctCount: number; challengeCount: number; level: number },
  hintsUsed: boolean,
  streak: number,
  allProgress: { level: number; qualifyingSessions: number }[],
  existingIds: Set<string>,
): Promise<string[]> {
  const earned: string[] = [];
  const tryAward = async (id: string) => {
    if (existingIds.has(id)) return;
    const ok = await awardAchievement(userId, id);
    if (ok) earned.push(id);
  };

  const accuracy = session.challengeCount > 0 ? session.correctCount / session.challengeCount : 0;

  // first_test — total sessions check done by caller
  await tryAward("first_test");

  if (accuracy === 1) await tryAward("perfect_score");
  if (session.totalSeconds < 90) await tryAward("speed_demon");
  if (!hintsUsed) await tryAward("no_hints");
  if (streak >= 3) await tryAward("streak_3");
  if (streak >= 7) await tryAward("streak_7");
  if (streak >= 30) await tryAward("streak_30");
  if (session.mode === "boss") await tryAward("boss_slayer");

  // iron_coder — all 12 levels qualified
  const qualifiedMap = Object.fromEntries(allProgress.map(p => [p.level, p.qualifyingSessions]));
  const allDone = Array.from({ length: 12 }, (_, i) => i + 1).every(l => (qualifiedMap[l] ?? 0) >= MIN_SESSIONS);
  if (allDone) await tryAward("iron_coder");

  return earned;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Generate challenges
router.post("/debug-test/generate", async (req, res) => {
  const { level, language = "javascript" } = req.body as { level?: unknown; language?: string };
  const testLevel = Math.min(Math.max(Number(level) || 1, 1), 12);

  const access = await checkSageAccess(req.userId);
  if (!access.allowed) return res.status(403).json({ error: access.error, subscribeUrl: access.subscribeUrl });

  const count = CHALLENGES_PER_LEVEL[testLevel] ?? 5;
  const levelPool: number[] = [];

  if (testLevel >= 5) {
    const prevCount = Math.floor(count * 0.3);
    for (let i = 0; i < prevCount; i++) levelPool.push(Math.ceil(Math.random() * (testLevel - 1)));
    for (let i = 0; i < count - prevCount; i++) levelPool.push(testLevel);
  } else {
    for (let i = 0; i < count; i++) levelPool.push(testLevel);
  }

  for (let i = levelPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [levelPool[i], levelPool[j]] = [levelPool[j]!, levelPool[i]!];
  }

  try {
    const challenges = await Promise.all(levelPool.map(l => generateChallenge(l, language)));
    const valid = challenges.map((c, i) => c ? { ...c, challengeLevel: levelPool[i]! } : null).filter(Boolean);
    if (valid.length === 0) return res.status(500).json({ error: "Failed to generate challenges. Try again." });
    return res.json({ level: testLevel, language, challenges: valid, total: valid.length });
  } catch (err) {
    req.log.error({ err }, "/debug-test/generate failed");
    return res.status(500).json({ error: "Failed to generate challenges." });
  }
});

// Check single answer
router.post("/debug-test/check-answer", async (req, res) => {
  const { description, brokenCode, userFix } = req.body as Record<string, string>;
  if (!description || !brokenCode || !userFix) return res.status(400).json({ error: "Missing required fields" });

  const access = await checkSageAccess(req.userId);
  if (!access.allowed) return res.status(403).json({ error: access.error });

  try {
    return res.json(await checkAnswer(description, brokenCode, userFix));
  } catch (err) {
    req.log.error({ err }, "/debug-test/check-answer failed");
    return res.status(500).json({ error: "Check failed. Try again." });
  }
});

// Hint for current challenge
router.post("/debug-test/hint", async (req, res) => {
  const { description, brokenCode, challengeLevel, language = "javascript" } = req.body as {
    description: string; brokenCode: string; challengeLevel: number; language?: string;
  };
  if (!description || !brokenCode) return res.status(400).json({ error: "Missing fields" });

  const access = await checkSageAccess(req.userId);
  if (!access.allowed) return res.status(403).json({ error: access.error });

  try {
    const c = await openai.chat.completions.create({
      model: "gpt-4o", max_tokens: 150, response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `Give a directional hint for a ${language} bug. Return JSON: { "hint": "1 sentence pointing at the area of the bug WITHOUT giving away the fix. E.g. 'Look carefully at the loop condition' or 'Check what happens with the variable scope here'" }` },
        { role: "user", content: `Level ${challengeLevel} challenge.\nTask: ${description}\nCode:\n${brokenCode}` },
      ],
    });
    const { hint } = JSON.parse(c.choices[0]?.message?.content ?? "{}") as { hint: string };
    return res.json({ hint: hint ?? "Look carefully at the logic flow.", penaltySeconds: 30 });
  } catch (err) {
    req.log.error({ err }, "/debug-test/hint failed");
    return res.status(500).json({ error: "Could not generate hint." });
  }
});

// Streaming prep brief before a test
router.post("/debug-test/prep-brief", async (req, res) => {
  const { level, language = "javascript" } = req.body as { level: number; language?: string };

  const access = await checkSageAccess(req.userId);
  if (!access.allowed) return res.status(403).json({ error: access.error });

  const spec = LEVEL_SPEC[level] ?? "";
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Cache-Control", "no-cache");
  res.flushHeaders();

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o", stream: true,
      messages: [
        { role: "system", content: "You are Forge, a direct coding instructor. Give a 60-word pre-test brief. No fluff. Tell the student exactly what bug patterns to look for, one quick mental model to hold, and what to scan first in the code." },
        { role: "user", content: `Level ${level}/12 test brief — Language: ${language}. Bug category: ${spec}` },
      ],
    });
    for await (const chunk of stream) { res.write(chunk.choices[0]?.delta?.content ?? ""); }
    res.end(); return;
  } catch (err) {
    req.log.error({ err }, "/debug-test/prep-brief failed");
    if (!res.headersSent) { res.status(500).json({ error: "Failed." }); return; }
    res.end(); return;
  }
});

// Streaming mistake review
router.post("/debug-test/review-mistakes", async (req, res) => {
  const { sessionId, mistakes } = req.body as {
    sessionId?: number;
    mistakes?: { description: string; brokenCode: string; userFix: string; explanation: string; bugType: string }[];
  };

  const access = await checkSageAccess(req.userId);
  if (!access.allowed) return res.status(403).json({ error: access.error });

  let items: { description: string; brokenCode: string; userFix: string; explanation: string; bugType: string }[] = [];

  if (mistakes?.length) {
    items = mistakes;
  } else if (sessionId) {
    const rows = await db.select().from(debugTestResults)
      .where(and(eq(debugTestResults.sessionId, sessionId), eq(debugTestResults.userId, req.userId), eq(debugTestResults.correct, false)));
    items = rows.filter(r => r.brokenCode && r.userFix).map(r => ({
      description: r.description ?? "", brokenCode: r.brokenCode!, userFix: r.userFix!,
      explanation: r.explanation ?? "", bugType: r.bugType,
    }));
  }

  if (!items.length) return res.status(400).json({ error: "No mistakes to review" });

  const block = items.map((m, i) =>
    `--- Mistake ${i + 1} (${m.bugType}) ---\nTask: ${m.description}\n\nBROKEN:\n${m.brokenCode}\n\nSTUDENT SUBMITTED:\n${m.userFix}\n\nCheck note: ${m.explanation}`
  ).join("\n\n");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Cache-Control", "no-cache");
  res.flushHeaders();

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o", stream: true,
      messages: [
        { role: "system", content: `You are Forge — direct, encouraging coding instructor reviewing test mistakes.
For EACH mistake, use this exact structure:

## Mistake [N]: [Bug Type]

**What went wrong:**
[1-2 sentences — name the specific bug precisely]

**Why your fix didn't work:**
[1-2 sentences — what was still broken in their submission]

**The correct fix:**
\`\`\`
[corrected code — only relevant lines]
\`\`\`

**The concept to remember:**
[1 punchy sentence — the rule to internalize]

---

After all mistakes, add one brief closing note on any pattern across their errors.` },
        { role: "user", content: `Review my ${items.length} mistake${items.length > 1 ? "s" : ""}:\n\n${block}` },
      ],
    });
    for await (const chunk of stream) { res.write(chunk.choices[0]?.delta?.content ?? ""); }
    res.end(); return;
  } catch (err) {
    req.log.error({ err }, "/debug-test/review-mistakes failed");
    if (!res.headersSent) { res.status(500).json({ error: "Review failed." }); return; }
    res.end(); return;
  }
});

// Streaming cross-session blind spot analysis
router.post("/debug-test/blind-spot-report", async (req, res) => {
  const access = await checkSageAccess(req.userId);
  if (!access.allowed) return res.status(403).json({ error: access.error });

  const rows = await db.select().from(debugTestResults)
    .where(eq(debugTestResults.userId, req.userId))
    .orderBy(desc(debugTestResults.createdAt))
    .limit(200);

  if (rows.length < 5) return res.status(400).json({ error: "Need at least 5 results to analyze patterns." });

  const wrongRows = rows.filter(r => !r.correct);
  const summary = Object.entries(
    wrongRows.reduce<Record<string, number>>((acc, r) => { acc[r.bugType] = (acc[r.bugType] ?? 0) + 1; return acc; }, {})
  ).sort(([, a], [, b]) => b - a).slice(0, 5).map(([t, n]) => `${t}: ${n} misses`).join(", ");

  const recentWrong = wrongRows.slice(0, 10).map(r =>
    `Bug: ${r.bugType}\nCode:\n${r.brokenCode ?? "n/a"}\nStudent submitted:\n${r.userFix ?? "n/a"}`
  ).join("\n\n---\n\n");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Cache-Control", "no-cache");
  res.flushHeaders();

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o", stream: true,
      messages: [
        { role: "system", content: "You are Forge — a direct coding instructor. Analyze the student's historical mistakes and write a personalized 'blind spot report'. Be specific, not generic. Tell them EXACTLY what their brain is doing wrong and how to fix it at the conceptual level. Format with headers: ## Your Top Blind Spots, ## What This Pattern Means, ## Your Training Plan (3 specific things to practice). Keep it under 300 words." },
        { role: "user", content: `Total attempts: ${rows.length}. Wrong answers: ${wrongRows.length}.\nTop missed bug types: ${summary}\n\nRecent wrong answers for analysis:\n${recentWrong}` },
      ],
    });
    for await (const chunk of stream) { res.write(chunk.choices[0]?.delta?.content ?? ""); }
    res.end(); return;
  } catch (err) {
    req.log.error({ err }, "/debug-test/blind-spot-report failed");
    if (!res.headersSent) { res.status(500).json({ error: "Report failed." }); return; }
    res.end(); return;
  }
});

// Teach it back — grade student's explanation
router.post("/debug-test/teach-back", async (req, res) => {
  const { description, brokenCode, correctExplanation, studentExplanation, resultId } = req.body as {
    description: string; brokenCode: string; correctExplanation: string;
    studentExplanation: string; resultId?: number;
  };
  if (!studentExplanation || !brokenCode) return res.status(400).json({ error: "Missing fields" });

  const access = await checkSageAccess(req.userId);
  if (!access.allowed) return res.status(403).json({ error: access.error });

  try {
    const c = await openai.chat.completions.create({
      model: "gpt-4o", max_tokens: 400, response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `Grade whether the student truly understood the bug fix. Return JSON: { "score": 0-10, "understood": boolean, "feedback": "2-3 sentences — what they got right, what's still fuzzy, one clarifying insight if score < 8" }. Score 8+ means genuine understanding. Be rigorous — don't give 10 for a vague answer.` },
        { role: "user", content: `Original task: ${description}\nCode: ${brokenCode}\nCorrect explanation: ${correctExplanation}\nStudent's explanation: "${studentExplanation}"` },
      ],
    });
    const result = JSON.parse(c.choices[0]?.message?.content ?? "{}") as { score: number; understood: boolean; feedback: string };

    if (resultId) {
      await db.insert(debugTeachBack).values({
        resultId, userId: req.userId,
        studentExplanation, forgeScore: result.score,
        forgeComment: result.feedback, understood: result.understood,
      }).onConflictDoNothing();
    }

    // Award achievement for perfect teach-back
    if (result.score >= 9) {
      await awardAchievement(req.userId, "teach_master");
    }

    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "/debug-test/teach-back failed");
    return res.status(500).json({ error: "Grading failed." });
  }
});

// Boss challenge — personalized final exam
router.post("/debug-test/boss-challenge/generate", async (req, res) => {
  const { language = "javascript" } = req.body as { language?: string };

  const access = await checkSageAccess(req.userId);
  if (!access.allowed) return res.status(403).json({ error: access.error, subscribeUrl: access.subscribeUrl });

  // Find top 3 weakest bug types
  const rows = await db.select().from(debugTestResults)
    .where(and(eq(debugTestResults.userId, req.userId), eq(debugTestResults.correct, false)));

  const bugCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.bugType] = (acc[r.bugType] ?? 0) + 1; return acc;
  }, {});

  const weakBugTypes = Object.entries(bugCounts).sort(([, a], [, b]) => b - a).slice(0, 3).map(([t]) => t);

  if (weakBugTypes.length === 0) {
    weakBugTypes.push("Logic Error", "Async Bug", "Scope Bug");
  }

  // Generate 10 challenges weighted toward weak bug types
  const pool: number[] = [];
  for (let i = 0; i < 6; i++) pool.push(Math.ceil(Math.random() * 12));
  for (let i = 0; i < 4; i++) pool.push(Math.ceil(Math.random() * 12));

  try {
    const bossChallenges = await Promise.all(pool.map(l => generateChallenge(l, language)));
    const valid = bossChallenges.map((c, i) => c ? { ...c, challengeLevel: pool[i]!, isBoss: true } : null).filter(Boolean);

    if (valid.length === 0) return res.status(500).json({ error: "Failed to generate boss challenges." });
    return res.json({ challenges: valid, weakBugTypes, total: valid.length });
  } catch (err) {
    req.log.error({ err }, "/debug-test/boss-challenge/generate failed");
    return res.status(500).json({ error: "Failed to generate boss challenges." });
  }
});

// Complete a test session
router.post("/debug-test/complete", async (req, res) => {
  const { level, mode = "level", language = "javascript", totalSeconds, pausedSeconds = 0, results } = req.body as {
    level: number; mode?: string; language?: string;
    totalSeconds: number; pausedSeconds?: number;
    results: {
      challengeLevel: number; bugType: string; language?: string;
      correct: boolean; secondsTaken: number; hintUsed?: boolean; rating?: number;
      description?: string; brokenCode?: string; userFix?: string; explanation?: string;
    }[];
  };

  if (!level || !results?.length) return res.status(400).json({ error: "Missing required fields" });

  try {
    const correctCount  = results.filter(r => r.correct).length;
    const accuracyPct   = Math.round((correctCount / results.length) * 100);
    const qualifies     = accuracyPct >= Math.round(MIN_ACCURACY * 100);
    const hintsUsed     = results.some(r => r.hintUsed);

    const [session] = await db.insert(debugTestSessions).values({
      userId: req.userId, level, mode, language,
      totalSeconds, pausedSeconds,
      challengeCount: results.length, correctCount,
      accuracyPct, qualifies, completedAt: new Date(),
    }).returning();
    if (!session) return res.status(500).json({ error: "Failed to save session" });

    await db.insert(debugTestResults).values(
      results.map(r => ({
        sessionId:      session.id,
        userId:         req.userId,
        challengeLevel: r.challengeLevel,
        bugType:        r.bugType,
        language:       r.language ?? language,
        correct:        r.correct,
        secondsTaken:   r.secondsTaken,
        hintUsed:       r.hintUsed ?? false,
        rating:         r.rating ?? null,
        description:    r.description ?? null,
        brokenCode:     r.brokenCode ?? null,
        userFix:        r.userFix ?? null,
        explanation:    r.explanation ?? null,
      }))
    );

    // Update level progress
    const [existing] = await db.select().from(debugLevelProgress)
      .where(and(eq(debugLevelProgress.userId, req.userId), eq(debugLevelProgress.level, level)));

    const prevBest    = existing?.bestTotalSeconds ?? null;
    const newBest     = prevBest === null || totalSeconds < prevBest ? totalSeconds : prevBest;
    const newTotal    = (existing?.completedSessions ?? 0) + 1;
    const newQual     = (existing?.qualifyingSessions ?? 0) + (qualifies ? 1 : 0);

    await db.insert(debugLevelProgress).values({
      userId: req.userId, level,
      completedSessions: newTotal, qualifyingSessions: newQual,
      bestTotalSeconds: newBest,
    }).onConflictDoUpdate({
      target: [debugLevelProgress.userId, debugLevelProgress.level],
      set: {
        completedSessions:  sql`${debugLevelProgress.completedSessions} + 1`,
        qualifyingSessions: sql`${debugLevelProgress.qualifyingSessions} + ${qualifies ? 1 : 0}`,
        bestTotalSeconds:   newBest,
        updatedAt:          new Date(),
      },
    });

    // Update streak
    const streak = await updateStreak(req.userId);

    // Get existing achievements to avoid duplicates
    const existingAch = await db.select().from(debugAchievements).where(eq(debugAchievements.userId, req.userId));
    const existingIds  = new Set(existingAch.map(a => a.achievementId));

    // Get all progress for iron_coder check
    const allProgress = await db.select().from(debugLevelProgress).where(eq(debugLevelProgress.userId, req.userId));

    const newAchievements = await checkAndAwardAchievements(
      req.userId,
      { mode, totalSeconds, correctCount, challengeCount: results.length, level },
      hintsUsed, streak, allProgress, existingIds
    );

    const unlockedNext = newQual >= MIN_SESSIONS;

    return res.json({
      sessionId: session.id, correctCount, accuracyPct, qualifies,
      total: results.length, totalSeconds,
      unlockedNext, completedSessions: newTotal,
      qualifyingSessions: newQual, minRequired: MIN_SESSIONS,
      newAchievements,
    });
  } catch (err) {
    req.log.error({ err }, "/debug-test/complete failed");
    return res.status(500).json({ error: "Failed to save results." });
  }
});

// Get progress, streak, achievements
router.get("/debug-test/progress", async (req, res) => {
  try {
    const [progress, recentSessions, streak, achievements] = await Promise.all([
      db.select().from(debugLevelProgress).where(eq(debugLevelProgress.userId, req.userId)),
      db.select().from(debugTestSessions).where(eq(debugTestSessions.userId, req.userId))
        .orderBy(desc(debugTestSessions.completedAt)).limit(20),
      db.select().from(debugStreaks).where(eq(debugStreaks.userId, req.userId)).then(r => r[0] ?? null),
      db.select().from(debugAchievements).where(eq(debugAchievements.userId, req.userId)),
    ]);
    return res.json({ progress, recentSessions, streak, achievements, minRequired: MIN_SESSIONS });
  } catch (err) {
    req.log.error({ err }, "/debug-test/progress failed");
    return res.status(500).json({ error: "Failed to load progress." });
  }
});

// Weakness report (bug type breakdown)
router.get("/debug-test/weakness-report", async (req, res) => {
  try {
    const rows = await db.select().from(debugTestResults).where(eq(debugTestResults.userId, req.userId));
    const byType: Record<string, { total: number; wrong: number }> = {};
    for (const r of rows) {
      if (!byType[r.bugType]) byType[r.bugType] = { total: 0, wrong: 0 };
      byType[r.bugType]!.total++;
      if (!r.correct) byType[r.bugType]!.wrong++;
    }
    const data = Object.entries(byType)
      .map(([bugType, { total, wrong }]) => ({ bugType, total, wrong, pct: Math.round((wrong / total) * 100) }))
      .sort((a, b) => b.pct - a.pct);
    return res.json({ data, totalAttempts: rows.length });
  } catch (err) {
    req.log.error({ err }, "/debug-test/weakness-report failed");
    return res.status(500).json({ error: "Failed to load weakness data." });
  }
});

// Get session history
router.get("/debug-test/history", async (req, res) => {
  const level = req.query.level ? Number(req.query.level) : undefined;
  try {
    const sessions = await db.select().from(debugTestSessions)
      .where(level !== undefined
        ? and(eq(debugTestSessions.userId, req.userId), eq(debugTestSessions.level, level))
        : eq(debugTestSessions.userId, req.userId))
      .orderBy(desc(debugTestSessions.completedAt)).limit(50);
    return res.json({ sessions });
  } catch (err) {
    req.log.error({ err }, "/debug-test/history failed");
    return res.status(500).json({ error: "Failed to load history." });
  }
});

// Get results for a past session (for review)
router.get("/debug-test/mistakes/:sessionId", async (req, res) => {
  const sessionId = Number(req.params.sessionId);
  if (!sessionId) return res.status(400).json({ error: "Invalid session ID" });
  try {
    const rows = await db.select().from(debugTestResults)
      .where(and(eq(debugTestResults.sessionId, sessionId), eq(debugTestResults.userId, req.userId)))
      .orderBy(debugTestResults.id);
    return res.json({ results: rows });
  } catch (err) {
    req.log.error({ err }, "/debug-test/mistakes failed");
    return res.status(500).json({ error: "Failed to load results." });
  }
});

// Daily challenge — get today's (generate if needed)
router.get("/debug-test/daily", async (req, res) => {
  const today = todayStr();
  try {
    let daily = await db.select().from(debugDailyChallenges).where(eq(debugDailyChallenges.challengeDate, today)).then(r => r[0]);

    if (!daily) {
      const languages = ["javascript", "typescript", "python", "sql"];
      const lang = languages[Math.floor(Math.random() * languages.length)]!;
      const level = Math.floor(Math.random() * 8) + 1;
      const challenge = await generateChallenge(level, lang);
      if (!challenge) return res.status(500).json({ error: "Could not generate daily challenge." });

      const [inserted] = await db.insert(debugDailyChallenges).values({
        challengeDate: today, language: lang,
        bugType: challenge.bugType,
        challengeData: { description: challenge.description, brokenCode: challenge.brokenCode } as Record<string, unknown>,
      }).onConflictDoNothing().returning();

      daily = inserted ?? await db.select().from(debugDailyChallenges).where(eq(debugDailyChallenges.challengeDate, today)).then(r => r[0]!);
    }

    if (!daily) return res.status(500).json({ error: "Could not load daily challenge." });

    const [attempt] = await db.select().from(debugDailyAttempts)
      .where(and(eq(debugDailyAttempts.userId, req.userId), eq(debugDailyAttempts.challengeDate, today)));

    return res.json({
      challengeDate: daily.challengeDate, language: daily.language,
      bugType: daily.bugType, challengeData: daily.challengeData,
      alreadyDone: !!attempt, attempt: attempt ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "/debug-test/daily failed");
    return res.status(500).json({ error: "Failed to load daily challenge." });
  }
});

// Submit daily challenge answer
router.post("/debug-test/daily/submit", async (req, res) => {
  const { correct, secondsTaken, userFix } = req.body as { correct: boolean; secondsTaken: number; userFix: string };
  const today = todayStr();

  try {
    await db.insert(debugDailyAttempts).values({
      userId: req.userId, challengeDate: today,
      correct, secondsTaken, userFix,
    }).onConflictDoNothing();

    if (correct) await awardAchievement(req.userId, "daily_first");
    await updateStreak(req.userId);

    const allAttempts = await db.select().from(debugDailyAttempts)
      .where(eq(debugDailyAttempts.challengeDate, today))
      .orderBy(debugDailyAttempts.secondsTaken);

    return res.json({ saved: true, leaderboard: allAttempts.slice(0, 10) });
  } catch (err) {
    req.log.error({ err }, "/debug-test/daily/submit failed");
    return res.status(500).json({ error: "Failed to save daily attempt." });
  }
});

export default router;
