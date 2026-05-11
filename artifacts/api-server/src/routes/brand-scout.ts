import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.post("/api/brand-scout/analyze", async (req, res) => {
  const { domain, brandName, description } = req.body as {
    domain?: string;
    brandName?: string;
    description?: string;
  };

  if (!domain && !brandName) {
    return res.status(400).json({ error: "domain or brandName required" });
  }

  const prompt = `You are a brand and SEO analyst. Analyze the following brand and return a detailed JSON report.

Brand Name: ${brandName ?? domain}
Domain: ${domain ?? "unknown"}
Description: ${description ?? "not provided"}

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "score": <number 0-100>,
  "searchPresence": {
    "score": <number 0-100>,
    "status": "Strong" | "Neutral" | "Weak",
    "summary": "<2-3 sentence analysis of their likely search visibility>"
  },
  "newsCoverage": {
    "status": "Positive" | "Mixed" | "Minimal" | "None",
    "summary": "<2-3 sentences about likely news/press coverage>",
    "topics": ["<topic1>", "<topic2>", "<topic3>"]
  },
  "customerSentiment": {
    "status": "Positive" | "Mixed" | "Neutral" | "Unknown",
    "summary": "<2-3 sentences about likely customer reviews and sentiment>",
    "sources": ["<source1>", "<source2>"]
  },
  "strengths": ["<strength1>", "<strength2>", "<strength3>"],
  "weaknesses": ["<weakness1>", "<weakness2>", "<weakness3>"],
  "opportunities": ["<opportunity1>", "<opportunity2>", "<opportunity3>"],
  "fixPlan": [
    { "title": "<action title>", "action": "<specific actionable step>", "priority": "High" | "Medium" | "Low", "effort": "Quick Win" | "1-2 weeks" | "1 month+" },
    { "title": "<action title>", "action": "<specific actionable step>", "priority": "High" | "Medium" | "Low", "effort": "Quick Win" | "1-2 weeks" | "1 month+" },
    { "title": "<action title>", "action": "<specific actionable step>", "priority": "High" | "Medium" | "Low", "effort": "Quick Win" | "1-2 weeks" | "1 month+" },
    { "title": "<action title>", "action": "<specific actionable step>", "priority": "High" | "Medium" | "Low", "effort": "Quick Win" | "1-2 weeks" | "1 month+" }
  ]
}

Be specific and honest. If this is a small/unknown brand, reflect that accurately (low score is fine). Make your analysis feel real and useful, not generic.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    return res.json(parsed);
  } catch (err) {
    req.log?.error({ err }, "brand-scout analyze error");
    return res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;
