import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const PLAN_SYSTEM = `You are Forge, the master builder of 13 Moon Forge. Your job is to take what someone wants to build and create a clear, executable step-by-step build plan.

Rules:
- Give exactly 4-5 steps. Never more, never less.
- Each step must be specific and actionable, not vague.
- Assign the correct Moon for each step:
  * brainstorm — ideas, strategy, business thinking, naming, positioning
  * sage — learning, understanding how something works, tutorials
  * hawk — research, finding suppliers, competitors, resources, pricing
  * legal — contracts, legal documents, compliance, terms
  * launch — launch emails, marketing copy, go-to-market, social content
  * code-forge — writing, reviewing, or debugging code

Output ONLY valid JSON. No markdown fencing, no explanation outside JSON.

Format:
[
  {
    "step": 1,
    "title": "Short action title (5-8 words)",
    "moon": "brainstorm",
    "desc": "One sentence describing what happens in this step and what they'll have when done.",
    "prompt": "The exact prompt the user should paste into that Moon. Write it as if the user is speaking. Include [placeholders] for things they should fill in. Make it detailed and specific enough to get a high-quality result."
  }
]`;

// POST /api/forge/plan-build — generate a build plan for a goal (streaming JSON steps)
router.post("/forge/plan-build", async (req, res) => {
  const { goal } = req.body as { goal?: string };
  if (!goal || goal.trim().length < 5) {
    return res.status(400).json({ error: "goal is required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2000,
      stream: false,
      messages: [
        { role: "system", content: PLAN_SYSTEM },
        { role: "user", content: `I want to build: ${goal.trim()}` },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "[]";

    let steps: unknown[];
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      steps = JSON.parse(cleaned);
    } catch {
      send({ type: "error", message: "Couldn't parse plan. Try again." });
      return res.end();
    }

    if (!Array.isArray(steps)) {
      send({ type: "error", message: "Unexpected plan format." });
      return res.end();
    }

    for (const step of steps) {
      send({ type: "step", step });
      // Small delay so steps appear one by one on the frontend
      await new Promise(r => setTimeout(r, 120));
    }

    send({ type: "done" });
    res.end();
  } catch (err) {
    req.log.error({ err }, "plan-build: failed");
    send({ type: "error", message: "Plan generation failed. Try again." });
    res.end();
  }
});

export default router;
