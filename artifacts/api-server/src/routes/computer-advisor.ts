import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const ADVISOR_SYSTEM = `You are Forge, the tech advisor — a plain-spoken expert who helps everyday people get the most out of their computer.

Your job: analyze the user's computer specs and goals, then give them specific, actionable advice they can actually use. No jargon unless you explain it immediately. Talk like you're helping a friend, not writing a manual.

Structure every response exactly like this (use these exact headings with ##):

## What Your Computer Is Good At
2–4 sentences on what their setup handles well based on the specs.

## What Could Hold You Back
2–4 honest points about where they might hit limits. Be specific — mention the actual component.

## My Top Recommendations
5–8 numbered, specific recommendations. Each one starts with a bold label. Mix quick wins (settings changes) and bigger ideas (upgrades). Be specific about settings, values, and where to find things.

## Gaming-Specific Tips (if applicable)
Only include this section if they selected Gaming or Game Development. 4–6 practical tips for their GPU/CPU combo.

## Quick Wins You Can Do Right Now
3–5 things they can do today for free that will immediately improve their experience.

Rules:
- Always refer to their actual specs by name (e.g. "your RTX 3060", "your 16GB of RAM")
- If they didn't provide a spec, acknowledge that and give general advice
- Be honest — if their PC is underpowered for their goals, say so kindly and give a path forward
- Never use marketing language
- Keep total response under 600 words`;

router.post("/computer-advisor/analyze", async (req, res) => {
  const { specs, goals } = req.body as {
    specs: {
      os: string;
      cpu: string;
      gpu: string;
      ram: string;
      storage: string;
      screenRes: string;
      extras: string;
    };
    goals: string[];
  };

  if (!specs || !goals) {
    return res.status(400).json({ error: "specs and goals are required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const specLines = [
    `Operating System: ${specs.os || "Not provided"}`,
    `CPU / Processor: ${specs.cpu || "Not provided"}`,
    `GPU / Graphics Card: ${specs.gpu || "Not provided"}`,
    `RAM: ${specs.ram || "Not provided"}`,
    `Storage: ${specs.storage || "Not provided"}`,
    `Screen Resolution: ${specs.screenRes || "Not provided"}`,
    specs.extras ? `Additional info: ${specs.extras}` : "",
  ].filter(Boolean).join("\n");

  const goalLine = goals.length > 0
    ? `Their goals: ${goals.join(", ")}`
    : "Goals: General everyday use";

  const userMessage = `Please analyze my computer and give me personalized advice.\n\n${specLines}\n\n${goalLine}`;

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      max_tokens: 900,
      messages: [
        { role: "system", content: ADVISOR_SYSTEM },
        { role: "user", content: userMessage },
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) send({ choices: [{ delta: { content: delta } }] });
    }

    send("[DONE]");
    res.end();
  } catch (err) {
    req.log.error({ err }, "computer-advisor stream error");
    send({ error: "AI request failed" });
    res.end();
  }
});

export default router;
