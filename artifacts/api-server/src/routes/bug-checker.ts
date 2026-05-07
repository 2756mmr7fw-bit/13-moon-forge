import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.post("/bug-checker/analyze", async (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    res.status(400).json({ error: "JSON body required" });
    return;
  }

  const { code, language, context } = req.body as {
    code?: string;
    language?: string;
    context?: string;
  };

  if (!code || code.trim().length === 0) {
    res.status(400).json({ error: "No code provided" });
    return;
  }

  if (code.length > 50000) {
    return res.status(400).json({ error: "Code too large (max 50,000 characters)" });
  }

  const lang = language ?? "auto-detect";
  const ctx = context?.trim() ? `\nAdditional context: ${context}` : "";

  const systemPrompt = `You are an expert code reviewer and bug hunter. Analyze the provided code and find bugs, issues, and improvements.

Return ONLY valid JSON in this exact format:
{
  "language": "detected language",
  "summary": "brief overall assessment",
  "score": 0-100,
  "bugs": [
    {
      "id": "bug-1",
      "severity": "critical|high|medium|low|info",
      "type": "bug type (e.g. null-reference, logic-error, security, performance, style)",
      "title": "short title",
      "description": "detailed description of the issue",
      "line": null or line number,
      "fix": "suggested fix or code snippet"
    }
  ]
}

Severity guide:
- critical: crashes, data loss, security vulnerabilities
- high: incorrect behavior, broken logic
- medium: potential issues, edge cases
- low: code quality, minor inefficiencies
- info: best practice suggestions`;

  const userPrompt = `Language hint: ${lang}${ctx}

Code to analyze:
\`\`\`
${code}
\`\`\``;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let result: Record<string, unknown>;
    try {
      result = JSON.parse(raw);
    } catch {
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "bug-checker analyze failed");
    return res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

export default router;
