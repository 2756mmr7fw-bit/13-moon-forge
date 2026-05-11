import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

// ─── Generate article (streaming) ────────────────────────────────────────────
router.post("/api/forge-press/generate", async (req, res) => {
  const { brandName, domain, goal, description, tone, keywords } = req.body as {
    brandName?: string;
    domain?: string;
    goal?: string;
    description?: string;
    tone?: string;
    keywords?: string;
  };

  if (!brandName) {
    return res.status(400).json({ error: "brandName required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const prompt = `You are a professional PR writer and brand journalist. Write a high-quality press release article for the following brand that will be distributed to news authority sites for SEO and brand credibility.

Brand: ${brandName}
Website: ${domain ?? "not provided"}
Goal: ${goal ?? "Brand Awareness"}
Description: ${description ?? "not provided"}
Tone: ${tone ?? "professional and authoritative"}
Target Keywords: ${keywords ?? ""}

Write a complete, publication-ready press release article (500-700 words) that:
1. Has a strong, SEO-optimized headline
2. Starts with a compelling dateline and lead paragraph
3. Tells the brand's story in a newsworthy way
4. Includes one or two relevant quotes (attributed to the brand)
5. Ends with a boilerplate "About [Brand]" section
6. Uses AP style formatting
7. Naturally incorporates the target keywords

Format:
[HEADLINE]
The headline here

[DATELINE]
City, Date

[BODY]
The full article body...

[BOILERPLATE]
About [Brand Name]: ...

Make it feel like something you'd actually read on a legitimate news site. No fluff, no filler.`;

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    req.log?.error({ err }, "forge-press generate error");
    res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
    res.end();
  }
});

// ─── Submit to EIN Presswire ─────────────────────────────────────────────────
router.post("/api/forge-press/submit", async (req, res) => {
  const {
    einApiKey,
    headline,
    body,
    keywords,
    contactFirstName,
    contactLastName,
    contactEmail,
    contactPhone,
    contactOrganization,
    city,
    state,
    country,
  } = req.body as {
    einApiKey?: string;
    headline?: string;
    body?: string;
    keywords?: string;
    contactFirstName?: string;
    contactLastName?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactOrganization?: string;
    city?: string;
    state?: string;
    country?: string;
  };

  if (!einApiKey) return res.status(400).json({ error: "EIN API key required" });
  if (!headline) return res.status(400).json({ error: "headline required" });
  if (!body) return res.status(400).json({ error: "body required" });
  if (!contactEmail) return res.status(400).json({ error: "contact email required" });

  try {
    // EIN Presswire REST API
    const payload = {
      api_key: einApiKey,
      headline,
      body,
      keywords: keywords ?? "",
      contact_firstname: contactFirstName ?? "",
      contact_lastname: contactLastName ?? "",
      contact_email: contactEmail,
      contact_phone: contactPhone ?? "",
      contact_organization: contactOrganization ?? "",
      city: city ?? "",
      state: state ?? "",
      country: country ?? "United States",
      // Send immediately
      send_date: "",
    };

    const einRes = await fetch("https://www.einpresswire.com/api/v1/news/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await einRes.text();
    let responseData: unknown;
    try { responseData = JSON.parse(responseText); } catch { responseData = { raw: responseText }; }

    if (!einRes.ok) {
      req.log?.error({ status: einRes.status, body: responseText }, "EIN Presswire submission failed");
      return res.status(einRes.status).json({
        error: "EIN Presswire rejected the submission",
        details: responseData,
        hint: "Double-check your API key at einpresswire.com/account/api",
      });
    }

    return res.json({ success: true, data: responseData });
  } catch (err) {
    req.log?.error({ err }, "forge-press submit error");
    return res.status(500).json({ error: "Submission failed — check your EIN API key and try again" });
  }
});

export default router;
