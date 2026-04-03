import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, pagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const FORGE_SYSTEM_PROMPT = `You are Forge, one of the 13 Moons — a master craftsman of the digital world. Your gift is building beautiful websites from nothing but words and vision. You shape raw ideas into polished, complete web experiences.

When given a site description and a list of pages to generate, you create professional, self-contained HTML for each page. Each page must:
- Be a complete, standalone HTML document with <!DOCTYPE html>
- Include all styles within a <style> tag in <head> — no external stylesheets
- Be visually impressive, modern, and responsive (mobile-friendly with a viewport meta tag)
- Use a consistent design system across all pages (same colors, fonts, spacing)
- Include a navigation header with links to all pages (use relative links like "home.html", "about.html", or just "#" as placeholders)
- Be production-quality — not a wireframe, not placeholder content

Design guidance:
- Choose a bold, distinctive color palette that fits the site's purpose and feels deliberate
- Use system fonts or safe stacks: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- Include appropriate visual hierarchy, generous whitespace, and clear sections
- Include realistic, meaningful content — not "Lorem ipsum"
- Make buttons, CTAs, and interactive elements look polished with hover states
- Add a footer with relevant information

Return ONLY the raw HTML code. No explanations. No markdown code fences. Just the HTML document starting with <!DOCTYPE html>.`;

router.post("/forge/generate", async (req, res) => {
  const { projectId, prompt } = req.body as { projectId: number; prompt: string };

  if (!projectId || !prompt) {
    return res.status(400).json({ error: "projectId and prompt are required" });
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Load project and pages
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    if (!project) {
      sendEvent({ type: "error", message: "Project not found" });
      return res.end();
    }

    const pages = await db.select().from(pagesTable).where(eq(pagesTable.projectId, projectId)).orderBy(pagesTable.order);

    if (pages.length === 0) {
      sendEvent({ type: "error", message: "No pages found in this project. Add at least one page first." });
      return res.end();
    }

    sendEvent({ type: "thinking", content: `Heating the forge for "${project.name}"... I see ${pages.length} page${pages.length === 1 ? "" : "s"} to craft.` });

    const pageList = pages.map(p => `- ${p.title} (/${p.slug})`).join("\n");

    // Generate each page one at a time
    for (const page of pages) {
      sendEvent({ type: "page_start", pageId: page.id, pageTitle: page.title });

      const userMessage = `Site description: ${prompt}

Project name: ${project.name}
Template style: ${project.template}

All pages in this site:
${pageList}

Now generate the HTML for this specific page: "${page.title}" (slug: /${page.slug})

Make this page feel like it truly belongs to this project. Include navigation to all the other pages listed above.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 8192,
        messages: [
          { role: "system", content: FORGE_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      });

      const html = completion.choices[0]?.message?.content ?? "";

      // Clean up any accidental markdown code fences
      const cleanHtml = html
        .replace(/^```html\n?/i, "")
        .replace(/^```\n?/, "")
        .replace(/\n?```$/, "")
        .trim();

      // Save to DB
      await db
        .update(pagesTable)
        .set({ content: cleanHtml, updatedAt: new Date() })
        .where(eq(pagesTable.id, page.id));

      sendEvent({ type: "page_done", pageId: page.id, pageTitle: page.title });
    }

    sendEvent({ type: "thinking", content: "The work is done. Your site has been forged." });
    sendEvent({ type: "done" });
    res.end();
  } catch (err) {
    req.log.error({ err }, "Forge generation failed");
    sendEvent({ type: "error", message: "Forge encountered an error. Try again." });
    res.end();
  }
});

export default router;
