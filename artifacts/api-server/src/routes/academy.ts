import { Router } from "express";
import { db } from "@workspace/db";
import { academyDrillResults } from "@workspace/db";
import { eq, and, desc, sql as drizzleSql, gte } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { checkSageAccess } from "../lib/moonApi";

const router = Router();

type DrillType = "trace" | "dry-run" | "sql" | "big-o" | "type-fixer" | "api" | "git" | "log";
type Difficulty = "beginner" | "intermediate" | "advanced";

// ── Generate prompts per drill type ──────────────────────────────────────────

const DIFFICULTY_DESC: Record<Difficulty, string> = {
  beginner:     "simple, short code, obvious patterns, ideal for first exposure",
  intermediate: "realistic complexity, 10-20 lines, requires real understanding",
  advanced:     "tricky edge cases, subtle bugs, production-realistic scenarios",
};

async function generateScenario(type: DrillType, difficulty: Difficulty): Promise<object | null> {
  const d = DIFFICULTY_DESC[difficulty];
  try {
    let systemPrompt = "";
    let userPrompt   = `Difficulty: ${difficulty} (${d})`;

    switch (type) {
      case "trace":
        systemPrompt = `Generate a realistic programming stack trace for educational practice.
Return JSON only:
{
  "language": "node|python|react",
  "traceText": "full realistic stack trace text with 4-8 frames",
  "errorType": "TypeError|ReferenceError|AttributeError|KeyError|ValueError|etc",
  "rootFile": "filename.js",
  "rootLine": 23,
  "rootCause": "one sentence: what actually caused this error",
  "callerChain": "brief: what called what in order"
}
Make the trace look exactly like real runtime output. Embed a realistic bug — off-by-one, undefined property, wrong type, missing import, etc.`;
        break;

      case "dry-run":
        systemPrompt = `Generate a short code snippet for dry-run execution practice. The student must mentally execute the code and answer a question about it.
Return JSON only:
{
  "language": "javascript|python",
  "code": "the function or code snippet (8-20 lines)",
  "functionCall": "the exact call expression, e.g. add(3, [1,2,3])",
  "question": "What does functionCall return?",
  "correctAnswer": "the exact return value as a string, e.g. '7' or '[1, 2, 3, 4]' or 'undefined'",
  "explanation": "2-3 sentences stepping through the logic"
}
Include closures, array methods, short-circuit evaluation, or recursion depending on difficulty. No I/O operations.`;
        break;

      case "sql":
        systemPrompt = `Generate a SQL practice scenario. Use PostgreSQL syntax.
Return JSON only:
{
  "schema": "CREATE TABLE statements for 2-3 related tables with realistic column names",
  "sampleData": "3-5 rows of INSERT statements per table for context",
  "requirement": "plain English description of what the query must return",
  "correctQuery": "the correct PostgreSQL query",
  "explanation": "why this query is correct and what it does"
}
Beginner: simple SELECT + WHERE. Intermediate: JOIN + GROUP BY. Advanced: subqueries, window functions, CTEs.`;
        break;

      case "big-o":
        systemPrompt = `Generate a function for Big O complexity analysis practice.
Return JSON only:
{
  "language": "javascript|python",
  "code": "the function to analyze (10-25 lines, realistic algorithm)",
  "functionName": "name of the function",
  "timeComplexity": "O(1)|O(log n)|O(n)|O(n log n)|O(n²)|O(n³)|O(2ⁿ)",
  "spaceComplexity": "O(1)|O(log n)|O(n)|O(n log n)|O(n²)",
  "explanation": "step-by-step reasoning: identify each loop/call, combine, simplify"
}
Beginner: single loop or simple recursion. Intermediate: nested loops or merge-sort style. Advanced: dynamic programming, graph traversal, tricky recursion.`;
        break;

      case "type-fixer":
        systemPrompt = `Generate TypeScript code with 1-3 type errors for practice.
Return JSON only:
{
  "brokenCode": "realistic TypeScript with 1-3 type errors (15-30 lines)",
  "errorMessages": ["TS error message 1", "TS error message 2"],
  "correctCode": "the fixed TypeScript code",
  "explanation": "what each error was and why the fix works"
}
Beginner: basic type annotation errors. Intermediate: generic constraints, union narrowing. Advanced: conditional types, infer, mapped types.`;
        break;

      case "api":
        systemPrompt = `Generate an API design scenario for REST conventions practice.
Return JSON only:
{
  "requirement": "feature requirement in plain English (e.g. 'Let users follow other users')",
  "context": "brief app context (e.g. 'social platform with user profiles')",
  "correctDesign": {
    "method": "GET|POST|PUT|PATCH|DELETE",
    "path": "/api/resource/:param",
    "requestBody": { "field": "type description" },
    "responseBody": { "field": "type description" },
    "successStatus": 200,
    "errorStatuses": { "not_found": 404, "validation": 422, "unauthorized": 401 }
  },
  "explanation": "why each design decision follows REST conventions"
}
Beginner: simple CRUD. Intermediate: nested resources, pagination. Advanced: batch operations, idempotency, versioning.`;
        break;

      case "git":
        systemPrompt = `Generate a git scenario that the student needs to resolve with git commands.
Return JSON only:
{
  "scenario": "clear description of the git problem (2-4 sentences)",
  "repoState": "what git status / git log looks like right now",
  "goal": "what the final state should look like",
  "correctCommands": ["git command 1", "git command 2", "git command 3"],
  "explanation": "why each command is needed and what it does"
}
Beginner: undo a commit, unstage files, create a branch. Intermediate: merge conflict, cherry-pick, reset vs revert. Advanced: interactive rebase, reflog recovery, submodule issues.`;
        break;

      case "log":
        systemPrompt = `Generate realistic application log output with an embedded issue for diagnosis practice.
Return JSON only:
{
  "logText": "15-25 lines of realistic structured or unstructured application logs with timestamps, levels (INFO/WARN/ERROR), and an embedded issue",
  "questions": [
    { "q": "Is this a client error or server error?", "answer": "client|server|infrastructure" },
    { "q": "What is the root cause in one sentence?", "answer": "concise answer" },
    { "q": "At what timestamp did the issue first appear?", "answer": "HH:MM:SS from the logs" },
    { "q": "How many requests were affected?", "answer": "number as string" }
  ],
  "explanation": "walkthrough of how to read these logs and reach the correct answers"
}
Beginner: single clear error in a short log. Intermediate: cascading errors, relevant vs irrelevant noise. Advanced: distributed system logs, race conditions, intermittent failures.`;
        break;

      default:
        return null;
    }

    const c = await openai.chat.completions.create({
      model: "gpt-4o", max_tokens: 1200, response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    return JSON.parse(c.choices[0]?.message?.content ?? "{}") as object;
  } catch { return null; }
}

// ── Check prompts per drill type ──────────────────────────────────────────────

async function checkAnswer(type: DrillType, scenario: Record<string, unknown>, studentAnswer: string): Promise<{
  correct: boolean; feedback: string; correctAnswer: string;
}> {
  try {
    let prompt = "";

    switch (type) {
      case "trace": {
        // studentAnswer JSON: { errorType, rootFile, rootLine, rootCause }
        let ans: Record<string, string> = {};
        try { ans = JSON.parse(studentAnswer) as Record<string, string>; } catch { ans = { rootCause: studentAnswer }; }
        const typeOk  = (ans.errorType ?? "").toLowerCase().includes((String(scenario.errorType ?? "")).toLowerCase().split(/error/i)[0]!.toLowerCase().trim());
        const fileOk  = (ans.rootFile  ?? "").toLowerCase().includes((String(scenario.rootFile ?? "")).toLowerCase());
        const lineOk  = String(ans.rootLine).trim() === String(scenario.rootLine).trim();
        const correct = typeOk && fileOk && lineOk;
        return {
          correct,
          feedback: correct
            ? `Correct. Error: ${String(scenario.errorType)}, File: ${String(scenario.rootFile)}, Line: ${String(scenario.rootLine)}.`
            : `Not quite. Error: ${String(scenario.errorType)} in ${String(scenario.rootFile)} at line ${String(scenario.rootLine)}. ${String(scenario.rootCause)}`,
          correctAnswer: `${String(scenario.errorType)} in ${String(scenario.rootFile)} at line ${String(scenario.rootLine)}`,
        };
      }

      case "dry-run": {
        const correct = String(scenario.correctAnswer).trim().toLowerCase() === studentAnswer.trim().toLowerCase()
          || studentAnswer.trim().replace(/['"]/g, "") === String(scenario.correctAnswer).trim().replace(/['"]/g, "");
        if (correct) {
          return { correct: true, feedback: `Correct! ${String(scenario.explanation)}`, correctAnswer: String(scenario.correctAnswer) };
        }
        // AI-assisted for flexible comparison
        const c = await openai.chat.completions.create({
          model: "gpt-4o", max_tokens: 200, response_format: { type: "json_object" },
          messages: [
            { role: "system", content: 'Evaluate if the student\'s answer is equivalent to the correct answer. Return JSON: { "correct": boolean, "feedback": "1-2 sentences explanation" }' },
            { role: "user", content: `Code: ${String(scenario.code)}\nCorrect answer: ${String(scenario.correctAnswer)}\nStudent answered: ${studentAnswer}\nExplanation: ${String(scenario.explanation)}` },
          ],
        });
        const r = JSON.parse(c.choices[0]?.message?.content ?? "{}") as { correct: boolean; feedback: string };
        return { ...r, correctAnswer: String(scenario.correctAnswer) };
      }

      case "big-o": {
        // studentAnswer JSON: { time, space }
        let ans: Record<string, string> = {};
        try { ans = JSON.parse(studentAnswer) as Record<string, string>; } catch { ans = { time: studentAnswer }; }
        const timeOk  = (ans.time  ?? "").replace(/\s/g, "") === String(scenario.timeComplexity).replace(/\s/g, "");
        const spaceOk = (ans.space ?? "").replace(/\s/g, "") === String(scenario.spaceComplexity).replace(/\s/g, "");
        const correct = timeOk && spaceOk;
        return {
          correct,
          feedback: correct
            ? `Correct! ${String(scenario.explanation)}`
            : `Time: ${String(scenario.timeComplexity)}, Space: ${String(scenario.spaceComplexity)}. ${String(scenario.explanation)}`,
          correctAnswer: `Time: ${String(scenario.timeComplexity)}, Space: ${String(scenario.spaceComplexity)}`,
        };
      }

      default: {
        // AI grading for sql, type-fixer, api, git, log
        const gradePrompts: Record<string, string> = {
          sql:          `You are grading a SQL query. Schema: ${JSON.stringify(scenario.schema)}\nRequirement: ${String(scenario.requirement)}\nCorrect query: ${String(scenario.correctQuery)}\nStudent query: ${studentAnswer}\nExplanation: ${String(scenario.explanation)}`,
          "type-fixer": `You are grading a TypeScript fix. Broken code: ${String(scenario.brokenCode)}\nErrors: ${JSON.stringify(scenario.errorMessages)}\nCorrect fix: ${String(scenario.correctCode)}\nStudent fix: ${studentAnswer}\nExplanation: ${String(scenario.explanation)}`,
          api:          `You are grading an API design. Requirement: ${String(scenario.requirement)}\nCorrect design: ${JSON.stringify(scenario.correctDesign)}\nStudent design: ${studentAnswer}\nExplanation: ${String(scenario.explanation)}`,
          git:          `You are grading git commands. Scenario: ${String(scenario.scenario)}\nGoal: ${String(scenario.goal)}\nCorrect commands: ${JSON.stringify(scenario.correctCommands)}\nStudent commands: ${studentAnswer}\nExplanation: ${String(scenario.explanation)}`,
          log:          `You are grading log reading answers. Questions: ${JSON.stringify(scenario.questions)}\nStudent answers: ${studentAnswer}\nExplanation: ${String(scenario.explanation)}`,
        };
        const c = await openai.chat.completions.create({
          model: "gpt-4o", max_tokens: 350, response_format: { type: "json_object" },
          messages: [
            { role: "system", content: `${gradePrompts[type] ?? ""}\n\nReturn JSON: { "correct": boolean, "feedback": "2-3 sentences: what they got right/wrong and the key insight", "correctAnswer": "brief correct answer summary" }. Be fair — partial credit leans correct if the core concept is right.` },
            { role: "user", content: "Grade this." },
          ],
        });
        return JSON.parse(c.choices[0]?.message?.content ?? "{}") as { correct: boolean; feedback: string; correctAnswer: string };
      }
    }
  } catch {
    return { correct: false, feedback: "Could not grade. Try again.", correctAnswer: "" };
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.post("/academy/generate", async (req, res) => {
  const { type, difficulty = "beginner" } = req.body as { type: DrillType; difficulty?: Difficulty };
  if (!type) return res.status(400).json({ error: "Missing drill type" });

  const access = await checkSageAccess(req.userId);
  if (!access.allowed) return res.status(403).json({ error: access.error, subscribeUrl: access.subscribeUrl });

  const scenario = await generateScenario(type, difficulty);
  if (!scenario) return res.status(500).json({ error: "Failed to generate scenario. Try again." });

  return res.json({ type, difficulty, scenario });
});

router.post("/academy/check", async (req, res) => {
  const { type, scenarioData, studentAnswer, secondsTaken = 0, hintUsed = false } = req.body as {
    type: DrillType; scenarioData: Record<string, unknown>; studentAnswer: string;
    secondsTaken?: number; hintUsed?: boolean;
  };
  if (!type || !scenarioData || studentAnswer === undefined) return res.status(400).json({ error: "Missing required fields" });

  const access = await checkSageAccess(req.userId);
  if (!access.allowed) return res.status(403).json({ error: access.error });

  const result = await checkAnswer(type, scenarioData, studentAnswer);

  // Save result
  try {
    await db.insert(academyDrillResults).values({
      userId: req.userId, drillType: type,
      difficulty: (scenarioData.difficulty as string) ?? "beginner",
      correct: result.correct, secondsTaken, hintUsed,
      scenarioData: scenarioData as Record<string, unknown>,
      studentAnswer, correctAnswer: result.correctAnswer,
      forgeFeedback: result.feedback,
    });
  } catch (err) { req.log.error({ err }, "academy: failed to save result"); }

  return res.json(result);
});

router.get("/academy/progress", async (req, res) => {
  try {
    const rows = await db.select().from(academyDrillResults)
      .where(eq(academyDrillResults.userId, req.userId))
      .orderBy(desc(academyDrillResults.createdAt));

    const today = new Date().toISOString().slice(0, 10);
    const byType: Record<string, { total: number; correct: number; today: number; lastSeen: string | null }> = {};

    for (const r of rows) {
      const t = r.drillType;
      if (!byType[t]) byType[t] = { total: 0, correct: 0, today: 0, lastSeen: null };
      byType[t]!.total++;
      if (r.correct) byType[t]!.correct++;
      const rDate = r.createdAt.toISOString().slice(0, 10);
      if (rDate === today) byType[t]!.today++;
      if (!byType[t]!.lastSeen) byType[t]!.lastSeen = rDate;
    }

    // Compute overall streak (consecutive days with ≥1 drill)
    const daySet = new Set(rows.map(r => r.createdAt.toISOString().slice(0, 10)));
    let streak = 0;
    const d = new Date();
    while (true) {
      const ds = d.toISOString().slice(0, 10);
      if (!daySet.has(ds)) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }

    const totalDrills = rows.length;
    const totalCorrect = rows.filter(r => r.correct).length;

    return res.json({ byType, streak, totalDrills, totalCorrect, recentResults: rows.slice(0, 20) });
  } catch (err) {
    req.log.error({ err }, "academy/progress failed");
    return res.status(500).json({ error: "Failed to load progress." });
  }
});

router.get("/academy/history/:type", async (req, res) => {
  const { type } = req.params;
  try {
    const rows = await db.select().from(academyDrillResults)
      .where(and(eq(academyDrillResults.userId, req.userId), eq(academyDrillResults.drillType, type)))
      .orderBy(desc(academyDrillResults.createdAt))
      .limit(30);
    return res.json({ results: rows });
  } catch (err) {
    req.log.error({ err }, "academy/history failed");
    return res.status(500).json({ error: "Failed to load history." });
  }
});

export default router;
