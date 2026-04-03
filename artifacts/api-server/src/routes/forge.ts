import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, pagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const FORGE_SYSTEM_PROMPT = `You are Forge — master craftsman of the digital world, one of the 13 Moons. You shape raw vision into extraordinary websites. Your work is indistinguishable from that of a senior designer at a top agency.

## Your Output Contract
Every page you produce must be a **complete, self-contained HTML document**. No external dependencies. Everything — structure, styles, interactivity — lives in a single file.

## Technical Requirements
- Start with \`<!DOCTYPE html>\` — nothing before it
- \`<meta charset="UTF-8">\` and \`<meta name="viewport" content="width=device-width, initial-scale=1.0">\`
- All CSS in a \`<style>\` block in \`<head>\`
- All JS in a \`<script>\` block before \`</body>\`
- No external stylesheets, no CDN links, no Google Fonts (use system font stacks)
- Return ONLY raw HTML — no markdown, no code fences, no explanation

## Design Philosophy
You design at the level of Linear, Stripe, Vercel, and Notion. Your sites have:

**Typography**
- Clear, intentional type scale (e.g. 12/14/16/20/28/40/56/72px)
- Strong hierarchy: one dominant heading per section, clear body rhythm
- Line heights: headings 1.1–1.2, body 1.6–1.7
- Letter-spacing: tight on large headings (-0.02em to -0.04em), neutral on body
- Font stacks: \`-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif\` or \`'Georgia', 'Times New Roman', serif\` for editorial

**Color**
- Choose a palette with intention: 1–2 brand colors, neutrals, semantic colors
- Dark mode by default unless the brief implies otherwise
- Use CSS custom properties (variables) for the entire palette
- Ensure contrast ratios pass WCAG AA minimum
- Backgrounds are never pure white or pure black — use off-tones (e.g. #0a0a0f, #f8f7f5)

**Layout & Spacing**
- Use CSS Grid and Flexbox — no floats, no tables for layout
- Generous whitespace: sections breathe with 80–160px vertical padding
- Max content width: typically 1200px centered with auto margins
- Responsive breakpoints at 768px and 1024px minimum

**Depth & Texture**
- Subtle gradients, not flat blocks
- Box shadows that feel natural (multiple layered, not hard-edged)
- Borders that complement rather than box things in
- Micro-details: hover states, focus rings, smooth transitions (0.2s ease)

**Animations & Interaction**
- CSS-only animations where possible (keyframes, transitions)
- Smooth scroll behavior (\`scroll-behavior: smooth\`)
- Button hover: slight lift with transform + shadow change
- Navigation: sticky header with subtle backdrop blur on scroll (JS)
- Cards: hover scale + shadow transition

## Content Standards
- Write real, specific, compelling copy — never Lorem ipsum
- Content must match the project's actual purpose, audience, and tone
- Include realistic specifics: team names, service descriptions, product features, testimonials with real-sounding names
- CTAs must be persuasive and action-oriented
- Every section earns its place — no filler

## Page Structure (adapt per page type)
**Hero sections**: Bold headline, subheadline, primary + secondary CTA, background treatment (gradient, image overlay, geometric shapes)
**Navigation**: Logo left, links center or right, CTA button, mobile hamburger menu with JS toggle
**Feature sections**: Icon/visual + headline + description grids (3-col on desktop, 1-col mobile)
**Social proof**: Testimonials with avatar initials, star ratings, company logos (SVG text logos)
**Pricing**: Cards with tier names, price, feature lists, CTA — highlight the recommended tier
**Footer**: Multi-column with links, social icons (inline SVG), newsletter input, copyright

## Navigation Consistency
All pages in a project share the same header and footer design. Use the provided page list to build real navigation links. Since these are standalone HTML files, link slugs like this: if page slug is "about", the href is "#" (since we're in preview mode, not a real server).

## Page-Specific Excellence
- **Home**: Make it sing. This is the first impression. Bold hero, clear value prop, social proof, feature highlights, strong CTA section
- **About**: Story-driven. Founder narrative, mission statement, team grid, values/principles, timeline if relevant
- **Services/Work/Portfolio**: Visual cards with hover effects, filters or categories if multiple items, case study previews
- **Pricing**: Conversion-optimized. Clear value differentiation, FAQ accordion (JS), guarantee badge
- **Contact**: Clean form with validation feedback, map placeholder, multiple contact methods
- **Blog/Articles**: List view with featured image placeholders (CSS-drawn), metadata, pagination

## SVG Icons
Use inline SVGs for icons — never Unicode characters or emoji for UI icons. Draw simple, clean paths for common icons (arrow, check, star, social, etc.) or use geometric shapes.`;

const getPageUserMessage = (
  project: { name: string; template: string; description: string | null },
  page: { title: string; slug: string },
  allPages: { title: string; slug: string }[],
  prompt: string
) => {
  const navLinks = allPages.map(p => `<a href="#">${p.title}</a>`).join(" | ");
  const pageList = allPages.map(p => `• ${p.title} (/${p.slug})`).join("\n");

  return `## Project Brief
**Name**: ${project.name}
**Template**: ${project.template}
**Description**: ${project.description || "Not provided"}
**Client Brief**: ${prompt}

## Site Architecture
This site has ${allPages.length} page${allPages.length === 1 ? "" : "s"}:
${pageList}

Navigation links for reference: ${navLinks}

## Your Task
Generate the **${page.title}** page (/${page.slug}).

This page must feel like it was crafted specifically for this project — not a generic template. The design, copy, color palette, and tone must all flow from the brief above. Every element must earn its place.

Aim for the quality of a $20,000 agency build. Make it exceptional.`;
};

router.post("/forge/generate", async (req, res) => {
  const { projectId, prompt } = req.body as { projectId: number; prompt: string };

  if (!projectId || !prompt) {
    return res.status(400).json({ error: "projectId and prompt are required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    if (!project) {
      sendEvent({ type: "error", message: "Project not found" });
      return res.end();
    }

    const pages = await db
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.projectId, projectId))
      .orderBy(pagesTable.order);

    if (pages.length === 0) {
      sendEvent({ type: "error", message: "No pages found. Add at least one page first." });
      return res.end();
    }

    sendEvent({
      type: "thinking",
      content: `Studying the brief for "${project.name}"... ${pages.length} page${pages.length === 1 ? "" : "s"} to craft.`,
    });

    for (const page of pages) {
      sendEvent({ type: "page_start", pageId: page.id, pageTitle: page.title });

      const userMessage = getPageUserMessage(project, page, pages, prompt);

      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 16000,
        messages: [
          { role: "system", content: FORGE_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "";

      const cleanHtml = raw
        .replace(/^```html\s*/i, "")
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "")
        .trim();

      await db
        .update(pagesTable)
        .set({ content: cleanHtml, updatedAt: new Date() })
        .where(eq(pagesTable.id, page.id));

      sendEvent({ type: "page_done", pageId: page.id, pageTitle: page.title });
    }

    sendEvent({ type: "thinking", content: "The forge has cooled. Your site is ready." });
    sendEvent({ type: "done" });
    res.end();
  } catch (err) {
    req.log.error({ err }, "Forge generation failed");
    sendEvent({ type: "error", message: "Forge encountered an error. Try again." });
    res.end();
  }
});

export default router;
