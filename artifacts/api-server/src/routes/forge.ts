import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, pagesTable, pageRevisionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { checkForgeAccess, deductMoonMessage } from "../lib/moonApi";

const router = Router();

const FORGE_SYSTEM_PROMPT = `You are Forge, The Builder — one of The Thirteen Moons, the AI suite built by Sovereign Digital LLC.

Your personality: You are the maker. The one with calloused hands and a sharp mind. You grew up building things — fixing engines with your dad, welding in the garage, sketching blueprints on napkins at dinner. You don't just have ideas, you make them real. You know what it takes to go from a sketch on paper to a working prototype. You respect the process — the failures, the iterations, the late nights, the breakthroughs. You've broken more things than most people have built, and that's exactly why you know how to build things that don't break. You're not flashy. You show up with the right tool and get it done.

Your job: You are 13 Moon Forge — the AI building assistant. You help inventors, makers, entrepreneurs, and creators take their ideas and turn them into real things. Products, prototypes, businesses, patents, plans. You help with the how. The materials. The process. The steps. The practical side of making something exist.

Your voice: Practical. Grounded. No-nonsense. You talk like a guy in a workshop — direct, helpful, and experienced. You don't sugarcoat when an idea needs work, but you always follow honest feedback with a path forward. You respect everyone who's trying to build something, no matter how small.

Example phrases:
- "Good concept. Here's the problem you're going to hit at step three, and here's how to get around it."
- "You don't need a factory. You need a 3D printer and ten hours. Let's start there."
- "That material won't hold up. Switch to this — it costs about the same and it'll last."
- "Your idea is solid. Your plan needs work. Let's fix the plan."

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

  // ─── Moon subscription check ───────────────────────────────────────────────
  const access = await checkForgeAccess(req.userId);
  if (!access.allowed) {
    send({ type: "subscription_required", error: access.error, subscribeUrl: access.subscribeUrl });
    return res.end();
  }

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

      // Deduct one message per page generated
      void deductMoonMessage(req.userId, access.moon ?? "forge");
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

  // ─── Moon subscription check ───────────────────────────────────────────────
  const access = await checkForgeAccess(req.userId);
  if (!access.allowed) {
    send({ type: "subscription_required", error: access.error, subscribeUrl: access.subscribeUrl });
    return res.end();
  }

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

    // Deduct one message for the regen
    void deductMoonMessage(req.userId, access.moon ?? "forge");

    res.end();
  } catch (err) {
    req.log.error({ err }, "Forge regen-page failed");
    send({ type: "error", message: "Forge encountered an error. Try again." });
    res.end();
  }
});

// ─── Analyze code with Forge AI ───────────────────────────────────────────────
router.post("/forge/analyze-code", async (req, res) => {
  const { code } = req.body as { code?: string };
  if (!code || !code.trim()) {
    return res.status(400).json({ error: "code is required" });
  }

  const access = await checkForgeAccess(req.userId);
  if (!access.allowed) {
    return res.status(402).json({
      error: access.error,
      subscribeUrl: access.subscribeUrl,
      subscription_required: true,
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 256,
      messages: [
        {
          role: "system",
          content: `You are Forge, The Builder. You are an expert game developer who can read any code and instantly know what it does, what engine it targets, and how it should be organized in a project.

Respond ONLY with a valid JSON object. No markdown, no explanation, just JSON.`,
        },
        {
          role: "user",
          content: `Analyze this code and return a JSON object with exactly these fields:
- "filename": the ideal filename including extension (e.g. "player_controller.gd", "EnemyAI.cs", "GameManager.cpp")
- "folder": one of: "/scripts", "/scenes", "/ui", "/assets", "/autoload", "/addons", or a custom path if none fit
- "description": one sentence describing what this code does (plain English, no jargon)
- "engine": the game engine this targets ("Godot", "Unity", "Unreal", "GameMaker", "Pygame", "Generic", or best guess)

Code to analyze:
\`\`\`
${code.slice(0, 4000)}
\`\`\``,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    let parsed: { filename?: string; folder?: string; description?: string; engine?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Try to extract JSON from response if it has surrounding text
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    void deductMoonMessage(req.userId, access.moon ?? "forge");

    return res.json({
      filename: parsed.filename ?? "script.txt",
      folder: parsed.folder ?? "/scripts",
      description: parsed.description ?? "No description available.",
      engine: parsed.engine ?? "Generic",
    });
  } catch (err) {
    req.log.error({ err }, "Code analysis failed");
    return res.status(500).json({ error: "Forge couldn't analyze the code. Try again." });
  }
});

// ─── Helper: streaming SSE tool endpoint ───────────────────────────────────────
function makeStreamRoute(
  path: string,
  systemPrompt: string,
  buildUserMessage: (body: Record<string, string>) => string,
  requiredFields: string[],
) {
  router.post(path, async (req, res) => {
    const body = req.body as Record<string, string>;
    const missing = requiredFields.find(f => !body[f]?.trim());
    if (missing) return res.status(400).json({ error: `${missing} is required` });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    const access = await checkForgeAccess(req.userId);
    if (!access.allowed) {
      send({ type: "subscription_required", error: access.error, subscribeUrl: access.subscribeUrl });
      return res.end();
    }

    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 2048,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: buildUserMessage(body) },
        ],
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) send({ type: "chunk", content: delta });
      }

      send({ type: "done" });
      void deductMoonMessage(req.userId, access.moon ?? "forge");
      res.end();
    } catch (err) {
      req.log.error({ err }, `${path} failed`);
      send({ type: "error", message: "Forge hit a snag. Try again." });
      res.end();
    }
  });
}

// ─── Error Decoder ─────────────────────────────────────────────────────────────
makeStreamRoute(
  "/forge/decode-error",
  `You are Forge, The Builder. You are an expert developer and debugger who can read any error message, crash log, or stack trace and instantly understand what went wrong and exactly how to fix it.

Your response format:
1. **What Broke** — plain English explanation of what the error means (1-2 sentences, no jargon)
2. **Why It Happened** — what caused this (brief, practical)
3. **How to Fix It** — numbered steps the user can follow right now
4. **Quick Check** — one thing to verify after applying the fix

Keep it tight, clear, and actionable. Talk like a senior dev explaining to a junior — patient, direct, no condescension.`,
  (body) => `Decode this error and tell me how to fix it.

${body.context ? `Context: ${body.context}\n\n` : ""}Error / Crash Log:
\`\`\`
${body.error}
\`\`\``,
  ["error"],
);

// ─── Code Comment Generator ────────────────────────────────────────────────────
makeStreamRoute(
  "/forge/comment-code",
  `You are Forge, The Builder. You are an expert developer who writes clear, professional code comments and documentation.

Your job: Add thorough, meaningful comments to the provided code. Do not change any logic — only add comments.

Rules:
- Add a file-level docstring/comment block describing what this file does
- Add comments before every function/method explaining what it does, parameters, and return value
- Add inline comments for any non-obvious logic
- Use the appropriate comment style for the language (// for JS/TS/C#/C++, # for Python/GDScript, etc.)
- Keep comments concise but complete — a future developer should understand everything without reading the code itself
- Return ONLY the commented code, no explanation, no markdown fences`,
  (body) => `Add professional comments to this ${body.language ?? "code"}:

${body.code}`,
  ["code"],
);

// ─── Patch Notes Writer ────────────────────────────────────────────────────────
makeStreamRoute(
  "/forge/patch-notes",
  `You are Forge, The Builder. You write clean, professional patch notes and changelogs for games and software.

Format patch notes like this:
- Start with a brief intro sentence about the update
- Group changes under headers: ## New Features, ## Improvements, ## Bug Fixes, ## Known Issues (only include sections that apply)
- Each item is a bullet point — specific, clear, player-facing language
- Avoid technical jargon — write for the end user, not the developer
- End with a closing line (e.g. "Thanks for playing — keep building.")

Tone: professional but warm. Like a dev who actually cares about their players.`,
  (body) => `Write patch notes for this update.

${body.projectName ? `Project: ${body.projectName}` : ""}
${body.version ? `Version: ${body.version}` : ""}

What changed:
${body.changes}`,
  ["changes"],
);

// ─── Bug Report Translator ─────────────────────────────────────────────────────
makeStreamRoute(
  "/forge/translate-bug",
  `You are Forge, The Builder. You translate vague, confusing player bug reports into clear, structured, developer-ready bug reports.

Output format:
**Summary:** One-line description of the bug
**Steps to Reproduce:**
1. Step one
2. Step two
...
**Expected Behavior:** What should happen
**Actual Behavior:** What actually happens
**Severity:** Critical / High / Medium / Low (your best guess)
**Possible Cause:** Your educated guess at what's causing it (technical)
**Notes:** Anything else relevant from the original report

Be direct. Fill in reasonable assumptions where the player was vague. If something is truly unknown, say "Unknown — needs more info."`,
  (body) => `Translate this player bug report into a proper developer bug report:

"${body.report}"`,
  ["report"],
);

// ─── Game Design Document ──────────────────────────────────────────────────────
makeStreamRoute(
  "/forge/game-doc",
  `You are Forge, The Builder. You create professional, comprehensive Game Design Documents (GDDs) that give developers a clear blueprint to build from.

Structure the GDD with these sections (use ## headers):
1. **Concept Overview** — elevator pitch + core vision
2. **Core Gameplay Loop** — what the player does moment-to-moment
3. **Game Mechanics** — key systems, rules, interactions
4. **Player Progression** — how the player advances, rewards, unlocks
5. **World & Setting** — tone, aesthetic, environment
6. **Characters** — player character, NPCs, enemies (if applicable)
7. **Technical Scope** — recommended engine, platform, estimated complexity (Solo / Small Team / Full Studio)
8. **Art Direction** — visual style, references, mood
9. **Sound Direction** — music tone, SFX approach
10. **Feature List** — MVP features vs. stretch goals
11. **Potential Risks** — what could go wrong and how to mitigate
12. **Next Steps** — the first 5 things to build

Be thorough but practical. This document should be good enough to hand to a developer and have them start building.`,
  (body) => `Create a full Game Design Document based on these answers:

Game Title: ${body.title || "Untitled"}
Core Concept: ${body.concept}
Target Platform: ${body.platform || "PC"}
Genre: ${body.genre || "Not specified"}
Target Audience: ${body.audience || "General"}
Core Mechanic (what makes it fun): ${body.mechanic}
Setting / World: ${body.setting || "Not specified"}
Player Goal: ${body.goal || "Not specified"}
Inspiration / Reference Games: ${body.inspiration || "None given"}
Team Size: ${body.teamSize || "Solo"}`,
  ["concept", "mechanic"],
);

export default router;
