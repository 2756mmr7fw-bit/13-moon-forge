import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, pagesTable, pageRevisionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const FORGE_SYSTEM_PROMPT = `You are Forge — Moon #5 of The Thirteen Moons, the AI suite built by Sovereign Digital LLC. You are The Builder. The one with calloused hands and a sharp mind. You grew up making things — fixing engines, welding in the garage, sketching blueprints on napkins at dinner. You don't just have ideas, you make them real. You know what it takes to go from a sketch on paper to a working prototype. You respect the process — the failures, the iterations, the late nights, the breakthroughs.

In this app, your job is to BUILD. You take what the client describes and you construct it — pixel by pixel, line by line. No excuses, no shortcuts, no filler. You build sites the way a craftsman builds furniture: every joint tight, every edge clean, every detail intentional. You don't sugarcoat when something needs work, but you always deliver something solid.

Your voice when communicating: Practical. Grounded. No-nonsense. Direct, helpful, experienced. You talk like someone who's been in the workshop for years.

Your quote: "Ideas are free. Building is where the work starts. Let's get to work."

You are part of The Thirteen Moons — AI built for the people, by Sovereign Digital LLC. Founded by Ezekiel Evans.

---

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
You build at the level of Linear, Stripe, Vercel, and Notion. Your sites have:

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
- **Home**: Make it sing. Bold hero, clear value prop, social proof, feature highlights, strong CTA section
- **About**: Story-driven. Founder narrative, mission statement, team grid, values/principles
- **Services/Work/Portfolio**: Visual cards with hover effects, case study previews
- **Pricing**: Conversion-optimized. Clear value differentiation, FAQ accordion (JS), guarantee badge
- **Contact**: Clean form with validation feedback, multiple contact methods
- **Blog/Articles**: List view with metadata, pagination

## SVG Icons
Use inline SVGs for icons — never Unicode characters or emoji for UI icons.`;

const buildUserMessage = (
  project: { name: string; template: string; description: string | null },
  page: { title: string; slug: string },
  allPages: { title: string; slug: string }[],
  prompt: string,
  refinementInstructions?: string
) => {
  const pageList = allPages.map(p => `• ${p.title} (/${p.slug})`).join("\n");
  const navLinks = allPages.map(p => `<a href="#">${p.title}</a>`).join(" | ");

  let msg = `## Project Brief
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

This page must feel like it was crafted specifically for this project — not a generic template. Aim for the quality of a $20,000 agency build. Make it exceptional.`;

  if (refinementInstructions) {
    msg += `\n\n## Refinement Instructions\nThe client has reviewed the previous version and wants these changes:\n${refinementInstructions}\n\nApply these changes while keeping everything else excellent.`;
  }

  return msg;
};

const cleanHtml = (raw: string) =>
  raw.replace(/^```html\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();

// ─── Generate all pages ────────────────────────────────────────────────────────
router.post("/forge/generate", async (req, res) => {
  const { projectId, prompt } = req.body as { projectId: number; prompt: string };
  if (!projectId || !prompt) return res.status(400).json({ error: "projectId and prompt are required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    if (!project) { send({ type: "error", message: "Project not found" }); return res.end(); }

    const pages = await db.select().from(pagesTable).where(eq(pagesTable.projectId, projectId)).orderBy(pagesTable.order);
    if (pages.length === 0) { send({ type: "error", message: "No pages found. Add at least one page first." }); return res.end(); }

    send({ type: "thinking", content: `Studying the brief for "${project.name}"... ${pages.length} page${pages.length === 1 ? "" : "s"} to craft.` });

    for (const page of pages) {
      send({ type: "page_start", pageId: page.id, pageTitle: page.title });

      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 16000,
        messages: [
          { role: "system", content: FORGE_SYSTEM_PROMPT },
          { role: "user", content: buildUserMessage(project, page, pages, prompt) },
        ],
      });

      const html = cleanHtml(completion.choices[0]?.message?.content ?? "");

      // Save revision of old content
      if (page.content) {
        await db.insert(pageRevisionsTable).values({ pageId: page.id, content: page.content });
      }

      await db.update(pagesTable).set({ content: html, updatedAt: new Date() }).where(eq(pagesTable.id, page.id));
      send({ type: "page_done", pageId: page.id, pageTitle: page.title });
    }

    send({ type: "thinking", content: "The forge has cooled. Your site is ready." });
    send({ type: "done" });
    res.end();
  } catch (err) {
    req.log.error({ err }, "Forge generation failed");
    send({ type: "error", message: "Forge encountered an error. Try again." });
    res.end();
  }
});

// ─── Regenerate single page ────────────────────────────────────────────────────
router.post("/forge/regenerate-page", async (req, res) => {
  const { projectId, pageId, prompt, instructions } = req.body as {
    projectId: number;
    pageId: number;
    prompt: string;
    instructions?: string;
  };

  if (!projectId || !pageId || !prompt) {
    return res.status(400).json({ error: "projectId, pageId, and prompt are required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    if (!project) { send({ type: "error", message: "Project not found" }); return res.end(); }

    const [page] = await db.select().from(pagesTable).where(
      and(eq(pagesTable.id, pageId), eq(pagesTable.projectId, projectId))
    );
    if (!page) { send({ type: "error", message: "Page not found" }); return res.end(); }

    const allPages = await db.select().from(pagesTable).where(eq(pagesTable.projectId, projectId)).orderBy(pagesTable.order);

    send({ type: "thinking", content: instructions ? `Applying your notes to "${page.title}"...` : `Reforging "${page.title}"...` });
    send({ type: "page_start", pageId: page.id, pageTitle: page.title });

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 16000,
      messages: [
        { role: "system", content: FORGE_SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(project, page, allPages, prompt, instructions) },
      ],
    });

    const html = cleanHtml(completion.choices[0]?.message?.content ?? "");

    // Save revision
    if (page.content) {
      await db.insert(pageRevisionsTable).values({ pageId: page.id, content: page.content });
    }

    await db.update(pagesTable).set({ content: html, updatedAt: new Date() }).where(eq(pagesTable.id, page.id));

    send({ type: "page_done", pageId: page.id, pageTitle: page.title });
    send({ type: "done", html });
    res.end();
  } catch (err) {
    req.log.error({ err }, "Forge regen-page failed");
    send({ type: "error", message: "Forge encountered an error. Try again." });
    res.end();
  }
});

export default router;
