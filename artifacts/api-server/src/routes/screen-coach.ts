import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const SCREEN_COACH_SYSTEM = `You are Forge, an expert remote tech helper who can literally see the user's screen.

Your job: Look at the screenshot and give the user clear, precise, step-by-step instructions for exactly what to do next based on what you can see.

Rules:
- Be SPECIFIC about what you see. Name the exact buttons, menus, icons, or text you can see on screen.
- Give numbered steps when there are multiple actions to take.
- If you can see a problem (error message, wrong settings, slow PC signs, etc.), call it out immediately.
- If the user hasn't asked a specific question, proactively look for anything useful to point out — open windows, settings that could be improved, problems you notice.
- Keep it conversational and friendly. Not robotic.
- Never say "I cannot see" — you CAN see the screenshot. Describe what's there.
- If the screen is blank or a desktop, describe what's visible and ask what they need help with.
- For gaming setup: look for GPU control panels, game settings, FPS counters, background apps eating resources.
- For PC problems: look for error messages, Task Manager data, unusual processes, full drives, etc.
- For game dev: look at the Godot editor and guide them through what they're working on.
- Maximum 200 words per response. Be concise and actionable.`;

router.post("/screen-coach/analyze", async (req, res) => {
  const { screenshot, question, goal } = req.body as {
    screenshot: string;  // base64 JPEG
    question?: string;
    goal?: string;
  };

  if (!screenshot) {
    return res.status(400).json({ error: "screenshot is required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const userText = [
    goal ? `The user is trying to: ${goal}` : null,
    question ? `Their question: ${question}` : "Please look at my screen and tell me what you see and any advice you have.",
  ].filter(Boolean).join("\n");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      max_tokens: 400,
      messages: [
        { role: "system", content: SCREEN_COACH_SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${screenshot}`,
                detail: "high",
              },
            },
            { type: "text", text: userText },
          ],
        },
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) send({ choices: [{ delta: { content: delta } }] });
    }

    send("[DONE]");
    res.end();
  } catch (err) {
    req.log.error({ err }, "screen-coach stream error");
    send({ error: "AI analysis failed" });
    res.end();
  }
});

export default router;
