import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { pressReleasesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

// ─── Generate article (streaming) ────────────────────────────────────────────
router.post("/forge-press/generate", async (req, res) => {
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

// ─── Publish to Forge Press Network ──────────────────────────────────────────
router.post("/forge-press/publish", async (req, res) => {
  const {
    companyName,
    headline,
    dateline,
    body,
    boilerplate,
    keywords,
    websiteUrl,
    authorName,
  } = req.body as {
    companyName?: string;
    headline?: string;
    dateline?: string;
    body?: string;
    boilerplate?: string;
    keywords?: string;
    websiteUrl?: string;
    authorName?: string;
  };

  if (!companyName) return res.status(400).json({ error: "companyName required" });
  if (!headline) return res.status(400).json({ error: "headline required" });
  if (!body) return res.status(400).json({ error: "body required" });

  // Generate a URL-safe slug from the headline
  const slug = headline
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80)
    + "-" + Date.now().toString(36);

  try {
    const [release] = await db
      .insert(pressReleasesTable)
      .values({
        slug,
        userId: (req as { user?: { id?: string } }).user?.id ?? null,
        companyName,
        headline,
        dateline: dateline ?? null,
        body,
        boilerplate: boilerplate ?? null,
        keywords: keywords ?? null,
        websiteUrl: websiteUrl ?? null,
        authorName: authorName ?? null,
        isPublic: true,
        publishedAt: new Date(),
      })
      .returning();

    return res.json({ success: true, slug: release.slug });
  } catch (err) {
    req.log?.error({ err }, "forge-press publish error");
    return res.status(500).json({ error: "Failed to publish" });
  }
});

// ─── List all public press releases ──────────────────────────────────────────
router.get("/press", async (req, res) => {
  try {
    const releases = await db
      .select({
        id: pressReleasesTable.id,
        slug: pressReleasesTable.slug,
        companyName: pressReleasesTable.companyName,
        headline: pressReleasesTable.headline,
        dateline: pressReleasesTable.dateline,
        boilerplate: pressReleasesTable.boilerplate,
        authorName: pressReleasesTable.authorName,
        websiteUrl: pressReleasesTable.websiteUrl,
        publishedAt: pressReleasesTable.publishedAt,
      })
      .from(pressReleasesTable)
      .where(eq(pressReleasesTable.isPublic, true))
      .orderBy(desc(pressReleasesTable.publishedAt))
      .limit(100);

    return res.json(releases);
  } catch (err) {
    req.log?.error({ err }, "forge-press list error");
    return res.status(500).json({ error: "Failed to load releases" });
  }
});

// ─── Get single press release by slug ────────────────────────────────────────
router.get("/press/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    const [release] = await db
      .select()
      .from(pressReleasesTable)
      .where(eq(pressReleasesTable.slug, slug))
      .limit(1);

    if (!release || !release.isPublic) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.json(release);
  } catch (err) {
    req.log?.error({ err }, "forge-press get error");
    return res.status(500).json({ error: "Failed to load release" });
  }
});

export default router;
