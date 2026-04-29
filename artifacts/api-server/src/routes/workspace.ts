import { Router } from "express";
import { db } from "@workspace/db";
import { workspaceItemsTable, workspaceItemVersionsTable } from "@workspace/db";
import { eq, and, desc, isNull, isNotNull } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { isAdmin } from "./admin";
import { createRequire } from "node:module";
import * as https from "node:https";
import * as http from "node:http";

const _require = createRequire(import.meta.url);
type PdfParseResult = { text: string; numpages: number; info: unknown };
const pdfParse = _require("pdf-parse") as (buf: Buffer, opts?: unknown) => Promise<PdfParseResult>;

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fetchUrl(url: string, redirects = 5): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (redirects === 0) return reject(new Error("Too many redirects"));
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, { headers: { "User-Agent": "13MoonForge/1.0" } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrl(res.headers.location, redirects - 1));
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

type DocTypeInfo = { type: string; label: string; systemPrompt: string };

function detectDocType(text: string, name: string): DocTypeInfo {
  const t = text.toLowerCase();
  const n = name.toLowerCase();

  if (/\b(whereas|party agrees|hereby agree|in consideration of|terms and conditions|non.?disclosure|indemnif)\b/.test(t)
    || /contract|agreement|nda|mou|terms/.test(n)) {
    return {
      type: "contract",
      label: "Legal Contract / Agreement",
      systemPrompt: `You are Forge, a sharp legal AI analyst. Analyze this contract for the user.

Structure in Markdown:

## What This Agreement Is
2–3 sentences: who is involved, what they're agreeing to.

## Key Terms
Bullet the obligations, payment, duration, and deliverables for each party.

## 🚩 Risk Flags
Flag any clauses that could hurt the user — one-sided terms, broad indemnification, non-compete, IP assignment, auto-renewal traps, termination restrictions. Be specific: quote the clause and explain the risk.

## ✅ Protections Present
Any favorable or protective terms that are actually in there.

## What's Missing
What should be here but isn't? (limitation of liability, dispute resolution, etc.)

## Forge's Verdict
Your honest take: should they sign this as-is? What must they negotiate? What's the biggest risk?`,
    };
  }

  if (/\b(invoice|bill to|amount due|payment due|subtotal|tax|total)\b/.test(t) || /invoice|receipt|bill/.test(n)) {
    return {
      type: "invoice",
      label: "Invoice / Bill",
      systemPrompt: `You are Forge, a sharp financial AI analyst. Extract and analyze this invoice.

Structure in Markdown:

## Invoice Summary
| Field | Value |
|---|---|
| Vendor / From | |
| Bill To | |
| Invoice # | |
| Invoice Date | |
| Due Date | |
| Total Amount | |
| Payment Terms | |

## Line Items
List all services or products billed.

## Forge's Notes
- Anything unusual about the amounts or terms?
- Any late fees or penalties mentioned?
- Recommended action (pay / verify / dispute)?`,
    };
  }

  if ((/\b(education|experience|skills|objective|summary)\b/.test(t) && /\b(resume|cv|curriculum|linkedin)\b/.test(t))
    || /resume|cv/.test(n)) {
    return {
      type: "resume",
      label: "Resume / CV",
      systemPrompt: `You are Forge, a sharp hiring analyst. Analyze this resume.

## Profile
Who is this person? Their level, domain, and background in 2–3 sentences.

## Strengths
Top 3–5 standout positives.

## Gaps & Weaknesses
What's missing, weak, or could hurt their chances?

## Best-Fit Roles
Based on their background, what positions or industries fit them best?

## Resume Quality
Is the formatting, clarity, and content competitive? What should they improve before sending?

## Forge's Verdict
Would you advance this candidate? What's the most important thing they need to fix?`,
    };
  }

  if (/\b(revenue|profit|loss|quarterly|annual|financial|balance sheet|income statement|cash flow|ebitda)\b/.test(t)
    || /report|financial|annual/.test(n)) {
    return {
      type: "report",
      label: "Business / Financial Report",
      systemPrompt: `You are Forge, a sharp business analyst. Analyze this report.

## Executive Summary
The 3–5 most important facts from this report.

## Key Metrics
Table of the most important numbers, figures, or KPIs found in the document.

## Trends & Patterns
What directions are things moving? What's improving vs. declining?

## Red Flags
Anything concerning — numbers that don't add up, buried risks, or alarming trends?

## Forge's Take
Your honest assessment: what should leadership or the reader do with this information?`,
    };
  }

  return {
    type: "general",
    label: "Document",
    systemPrompt: `You are Forge, a sharp AI workspace assistant. The user has uploaded a PDF and wants a thorough analysis.

Produce a well-organized analysis in Markdown. Include:
- A bold summary of what this document is about (2–3 sentences)
- Key points, findings, or clauses (use headers and bullets)
- Any action items, deadlines, or important names/numbers you spot
- A "Forge's Take" section at the end: your honest assessment and next steps

Keep it sharp and practical. No filler. Format for readability.`,
  };
}

// ─── Admin workspace seed ─────────────────────────────────────────────────────
const CODEBASE_REF = `# 13 Moon Forge — Codebase Reference
**Sovereign Digital LLC | 13moonforge.ai**

## Architecture

| Layer | Stack |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind + shadcn/ui |
| Backend | Node.js + Express + TypeScript (ESBuild bundled) |
| Database | PostgreSQL via Drizzle ORM |
| Auth | Clerk (JWT, PKCE) |
| AI | OpenAI GPT-4o (all Moons) |
| Voice | ElevenLabs TTS |
| Mobile | Expo React Native |
| Hosting | Replit → Hetzner VPS + Coolify |

---

## 6 Moon Personas

| Moon | Route | Purpose |
|---|---|---|
| Forge | /forge | App builder, architect |
| Hawk | /ask-hawk | Research, sourcing, supply chain |
| Sage | /learn-sage | Teaching, deep learning |
| Flint | /flint | Tech support, computer fix |
| Quill | /quill | Writing, legal, contracts |
| Creed | /creed | Faith, philosophy, purpose |
| Brainstorm | /brainstorm | Idea generation, strategy |

---

## Key Files

### API Server (artifacts/api-server/src/)
- \`app.ts\` — Express setup, middleware, route mounting
- \`routes/index.ts\` — All route registrations
- \`routes/forge.ts\` — Forge Moon AI endpoint
- \`routes/memory.ts\` — User memory (GET/PUT /api/user/memory)
- \`routes/workspace.ts\` — Workspace CRUD + Forge AI creation
- \`routes/quota.ts\` — Message limits, admin bypass
- \`routes/admin.ts\` — Admin check (ADMIN_EMAILS env var)
- \`routes/referral.ts\` — Referral links + claim
- \`routes/score.ts\` — Forge Score calculation
- \`routes/tts.ts\` — ElevenLabs voice per Moon
- \`routes/coolify.ts\` — Coolify server integration
- \`routes/connections.ts\` — Server connection management
- \`routes/deploy.ts\` — Deploy trigger
- \`routes/payments.ts\` — Square payment processing
- \`routes/secrets.ts\` — AES-256-GCM encrypted vault
- \`lib/moonVoices.ts\` — Voice IDs per Moon persona

### Frontend (artifacts/the-forge/src/)
- \`App.tsx\` — Router, Clerk provider, referral claim handler
- \`components/layout.tsx\` — Sidebar nav, mobile nav
- \`components/onboarding-modal.tsx\` — 2-step onboarding
- \`components/templates-panel.tsx\` — Moon prompt templates
- \`components/moon-output-actions.tsx\` — Export (MD/PDF) + Share
- \`lib/export.ts\` — Markdown + PDF download utilities
- \`lib/templates.ts\` — All Moon templates (7 per Moon)
- \`pages/dashboard.tsx\` — Home, Moon of Day, streak, pulse
- \`pages/workspace.tsx\` — Forge workspace file system
- \`pages/account.tsx\` — Forge Score, referral link
- \`pages/connections.tsx\` — Coolify server connection UI
- \`pages/projects.tsx\` — Project cards, portfolio

### Database (lib/db/src/schema/)
- \`userMemory.ts\` — Per-user AI memory
- \`workspace.ts\` — Workspace items + versions
- \`projects.ts\` — Projects with links
- \`referrals.ts\` — Referral codes + claims
- \`usage.ts\` — Message usage tracking
- \`payments.ts\` — Payment records
- \`savedPrompts.ts\` — Saved prompts library
- \`sharedOutputs.ts\` — Gallery shares + reactions

---

## Environment Variables

| Key | Purpose |
|---|---|
| ADMIN_EMAILS | Comma-separated admin emails (unlimited quota) |
| ELEVENLABS_API_KEY | Voice TTS |
| SESSION_SECRET | Express session |
| CLERK_SECRET_KEY | Clerk backend auth |
| DATABASE_URL | PostgreSQL connection |

---

## Admin Access
Email: \`Ezekiel@thepeoplestownsq.com\`
- Unlimited messages (plan: owner, limit: 999,999)
- Access to /api/admin/stats and /api/admin/registry
- Check: GET /api/admin/check

---

## Deployment Path
1. Publish on Replit (current) → .replit.app domain
2. Hetzner VPS → Install Coolify → Connect in Forge Connections page
3. Deploy from Forge to Coolify → Self-hosted at 13moonforge.ai
`;

async function seedAdminWorkspace(userId: string): Promise<void> {
  try {
    const existing = await db
      .select()
      .from(workspaceItemsTable)
      .where(and(eq(workspaceItemsTable.userId, userId), isNull(workspaceItemsTable.deletedAt)));
    if (existing.length > 0) return;

    const [folder] = await db.insert(workspaceItemsTable).values({
      userId,
      type: "folder",
      name: "Forge Codebase",
      content: "",
      icon: "🔥",
      color: "#7c3aed",
      pinned: true,
      order: 0,
    }).returning();

    await db.insert(workspaceItemsTable).values({
      userId,
      type: "document",
      name: "Codebase Reference",
      content: CODEBASE_REF,
      parentId: folder.id,
      icon: "📋",
      order: 0,
    });
  } catch { /* silent — don't break workspace load */ }
}

const MAX_VERSIONS_PER_ITEM = 20;

// GET /workspace — list all active (non-deleted) items for the current user
router.get("/workspace", async (req, res) => {
  const userId = req.userId;
  try {
    // Seed codebase reference for admin on first visit
    if (await isAdmin(userId)) {
      await seedAdminWorkspace(userId);
    }

    const items = await db
      .select()
      .from(workspaceItemsTable)
      .where(and(eq(workspaceItemsTable.userId, userId), isNull(workspaceItemsTable.deletedAt)))
      .orderBy(workspaceItemsTable.order, workspaceItemsTable.createdAt);
    res.json(items);
  } catch (err) {
    req.log.error({ err }, "Failed to list workspace items");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /workspace/trash — list soft-deleted items for the current user
router.get("/workspace/trash", async (req, res) => {
  const userId = req.userId;
  try {
    const items = await db
      .select()
      .from(workspaceItemsTable)
      .where(and(eq(workspaceItemsTable.userId, userId), isNotNull(workspaceItemsTable.deletedAt)))
      .orderBy(desc(workspaceItemsTable.deletedAt));
    res.json(items);
  } catch (err) {
    req.log.error({ err }, "Failed to list trash");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /workspace — create an item manually
router.post("/workspace", async (req, res) => {
  const userId = req.userId;
  const { type, name, content, parentId, icon, color } = req.body as {
    type: string;
    name: string;
    content?: string;
    parentId?: number;
    icon?: string;
    color?: string;
  };

  if (!type || !name) return res.status(400).json({ error: "type and name required" });

  try {
    const [item] = await db.insert(workspaceItemsTable).values({
      userId,
      type,
      name,
      content: content ?? "",
      parentId: parentId ?? null,
      icon: icon ?? typeToIcon(type),
      color: color ?? typeToColor(type),
    }).returning();
    res.status(201).json(item);
  } catch (err) {
    req.log.error({ err }, "Failed to create workspace item");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /workspace/:id — update an item (auto-saves a version snapshot if content changes)
router.put("/workspace/:id", async (req, res) => {
  const userId = req.userId;
  const id = Number(req.params.id);
  const { name, content, parentId, icon, color, pinned, order } = req.body as {
    name?: string;
    content?: string;
    parentId?: number | null;
    icon?: string;
    color?: string;
    pinned?: boolean;
    order?: number;
  };

  try {
    // Fetch current version before overwriting so we can snapshot it
    const [current] = await db
      .select()
      .from(workspaceItemsTable)
      .where(and(eq(workspaceItemsTable.id, id), eq(workspaceItemsTable.userId, userId)))
      .limit(1);

    if (!current) return res.status(404).json({ error: "Not found" });

    // Only snapshot when content actually changes (ignore whitespace-only saves)
    const contentChanged = content !== undefined && content.trim() !== (current.content ?? "").trim();
    if (contentChanged) {
      // Save the OLD content as a version before overwriting
      await db.insert(workspaceItemVersionsTable).values({
        itemId: id,
        userId,
        name: current.name,
        content: current.content ?? "",
      });

      // Prune old versions — keep only the most recent MAX_VERSIONS_PER_ITEM
      const versions = await db
        .select({ id: workspaceItemVersionsTable.id })
        .from(workspaceItemVersionsTable)
        .where(eq(workspaceItemVersionsTable.itemId, id))
        .orderBy(desc(workspaceItemVersionsTable.savedAt));

      if (versions.length > MAX_VERSIONS_PER_ITEM) {
        const toDelete = versions.slice(MAX_VERSIONS_PER_ITEM).map(v => v.id);
        for (const vId of toDelete) {
          await db.delete(workspaceItemVersionsTable).where(eq(workspaceItemVersionsTable.id, vId));
        }
      }
    }

    const [item] = await db
      .update(workspaceItemsTable)
      .set({
        ...(name !== undefined && { name }),
        ...(content !== undefined && { content }),
        ...(parentId !== undefined && { parentId }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(pinned !== undefined && { pinned }),
        ...(order !== undefined && { order }),
        updatedAt: new Date(),
      })
      .where(and(eq(workspaceItemsTable.id, id), eq(workspaceItemsTable.userId, userId)))
      .returning();

    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (err) {
    req.log.error({ err }, "Failed to update workspace item");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /workspace/:id — SOFT delete (moves to trash, never destroys data)
router.delete("/workspace/:id", async (req, res) => {
  const userId = req.userId;
  const id = Number(req.params.id);

  try {
    const now = new Date();

    // Soft-delete children first
    await db
      .update(workspaceItemsTable)
      .set({ deletedAt: now })
      .where(and(eq(workspaceItemsTable.parentId, id), eq(workspaceItemsTable.userId, userId)));

    // Soft-delete the item itself
    const [item] = await db
      .update(workspaceItemsTable)
      .set({ deletedAt: now })
      .where(and(eq(workspaceItemsTable.id, id), eq(workspaceItemsTable.userId, userId)))
      .returning();

    if (!item) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete workspace item");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /workspace/:id/restore — restore a soft-deleted item from trash
router.post("/workspace/:id/restore", async (req, res) => {
  const userId = req.userId;
  const id = Number(req.params.id);

  try {
    const [item] = await db
      .update(workspaceItemsTable)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(and(eq(workspaceItemsTable.id, id), eq(workspaceItemsTable.userId, userId)))
      .returning();

    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (err) {
    req.log.error({ err }, "Failed to restore workspace item");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /workspace/:id/hard — permanently destroy (user-initiated only, requires confirmation)
router.delete("/workspace/:id/hard", async (req, res) => {
  const userId = req.userId;
  const id = Number(req.params.id);
  const { confirm } = req.body as { confirm?: string };

  if (confirm !== "DELETE_FOREVER") {
    return res.status(400).json({ error: "Send { confirm: 'DELETE_FOREVER' } to permanently delete" });
  }

  try {
    // Delete versions
    await db.delete(workspaceItemVersionsTable).where(
      and(eq(workspaceItemVersionsTable.itemId, id), eq(workspaceItemVersionsTable.userId, userId))
    );
    // Delete children
    await db.delete(workspaceItemsTable).where(
      and(eq(workspaceItemsTable.parentId, id), eq(workspaceItemsTable.userId, userId))
    );
    // Delete item
    await db.delete(workspaceItemsTable).where(
      and(eq(workspaceItemsTable.id, id), eq(workspaceItemsTable.userId, userId))
    );

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to permanently delete workspace item");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /workspace/:id/versions — list version history for an item
router.get("/workspace/:id/versions", async (req, res) => {
  const userId = req.userId;
  const id = Number(req.params.id);

  try {
    const versions = await db
      .select()
      .from(workspaceItemVersionsTable)
      .where(and(eq(workspaceItemVersionsTable.itemId, id), eq(workspaceItemVersionsTable.userId, userId)))
      .orderBy(desc(workspaceItemVersionsTable.savedAt));
    res.json(versions);
  } catch (err) {
    req.log.error({ err }, "Failed to list versions");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /workspace/:id/versions/:versionId/restore — restore a specific version
router.post("/workspace/:id/versions/:versionId/restore", async (req, res) => {
  const userId = req.userId;
  const id = Number(req.params.id);
  const versionId = Number(req.params.versionId);

  try {
    const [version] = await db
      .select()
      .from(workspaceItemVersionsTable)
      .where(and(
        eq(workspaceItemVersionsTable.id, versionId),
        eq(workspaceItemVersionsTable.itemId, id),
        eq(workspaceItemVersionsTable.userId, userId),
      ))
      .limit(1);

    if (!version) return res.status(404).json({ error: "Version not found" });

    const [item] = await db
      .update(workspaceItemsTable)
      .set({ content: version.content, name: version.name, updatedAt: new Date() })
      .where(and(eq(workspaceItemsTable.id, id), eq(workspaceItemsTable.userId, userId)))
      .returning();

    res.json(item);
  } catch (err) {
    req.log.error({ err }, "Failed to restore version");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /workspace/forge — Forge creates a file/folder from natural language
router.post("/workspace/forge", async (req, res) => {
  const userId = req.userId;
  const { prompt, parentId } = req.body as { prompt: string; parentId?: number };

  if (!prompt) return res.status(400).json({ error: "prompt required" });

  try {
    const system = `You are Forge, an AI workspace assistant. The user will describe something they want created in their workspace.

You must return ONLY valid JSON in this exact shape:
{
  "type": "folder|document|plan|blueprint|portfolio|goal",
  "name": "Short descriptive name (5 words max)",
  "icon": "lucide-icon-name",
  "color": "#hexcolor",
  "content": "Full markdown content (empty string for folders)",
  "items": []
}

Type guide:
- folder: a container to organize other items — content is always ""
- document: general notes, write-ups, reference material
- plan: structured action plan with phases, milestones, timeline
- blueprint: technical spec, architecture doc, system design
- portfolio: curated collection of work/projects with descriptions
- goal: objective-setting document with goals, metrics, milestones

Icon suggestions (use exact lucide names, lowercase-hyphen):
- folder: "folder"
- document: "file-text"
- plan: "calendar-check"
- blueprint: "layout-template"
- portfolio: "briefcase"
- goal: "target"

Color suggestions:
- folder: "#f59e0b"
- document: "#60a5fa"
- plan: "#a78bfa"
- blueprint: "#38bdf8"
- portfolio: "#e8611a"
- goal: "#4ade80"

For plans, blueprints, goals, and portfolios — generate full, rich markdown content.
Use headings, bullet points, tables where appropriate.
Make it immediately useful — not a template, but real content based on what the user described.
Be thorough: 300-800 words of content for documents, plans, blueprints, goals.
For folders: always return empty content string.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    let parsed: {
      type: string;
      name: string;
      icon: string;
      color: string;
      content: string;
    };

    try {
      const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: "Failed to parse Forge response" });
    }

    const [item] = await db.insert(workspaceItemsTable).values({
      userId,
      type: parsed.type ?? "document",
      name: parsed.name ?? "Untitled",
      content: parsed.content ?? "",
      parentId: parentId ?? null,
      icon: parsed.icon ?? "file-text",
      color: parsed.color ?? "#60a5fa",
    }).returning();

    res.status(201).json(item);
  } catch (err) {
    req.log.error({ err }, "Failed to forge workspace item");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /workspace/:id/forge-pdf — read a PDF and have Forge analyze it, creates a new document
router.post("/workspace/:id/forge-pdf", async (req, res) => {
  const userId = req.userId;
  const id = Number(req.params.id);
  const { parentId } = req.body as { parentId?: number };

  try {
    const [item] = await db
      .select()
      .from(workspaceItemsTable)
      .where(and(eq(workspaceItemsTable.id, id), eq(workspaceItemsTable.userId, userId)))
      .limit(1);

    if (!item) return res.status(404).json({ error: "Not found" });
    if (!item.content?.startsWith("data:")) {
      return res.status(400).json({ error: "Item has no binary content" });
    }

    // Decode base64 data URI to buffer
    const base64 = item.content.split(",")[1] ?? "";
    const buffer = Buffer.from(base64, "base64");

    // Extract text from PDF
    let pdfText = "";
    try {
      const parsed = await pdfParse(buffer);
      pdfText = parsed.text?.trim() ?? "";
    } catch {
      return res.status(400).json({ error: "Could not read PDF — it may be scanned or image-based." });
    }

    if (!pdfText || pdfText.length < 20) {
      return res.status(400).json({ error: "This PDF appears to be image-based or empty. Forge can only read text PDFs right now." });
    }

    // Truncate to ~80k chars to stay within token limits
    const truncated = pdfText.length > 80000 ? pdfText.slice(0, 80000) + "\n\n[...document continues, truncated for length...]" : pdfText;

    // Detect document type for specialized analysis
    const docInfo = detectDocType(truncated, item.name);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: docInfo.systemPrompt },
        {
          role: "user",
          content: `Document name: "${item.name}"\n\nDocument content:\n\n${truncated}`,
        },
      ],
      max_tokens: 2000,
    });

    const rawAnalysis = completion.choices[0]?.message?.content ?? "";
    const typeTag = docInfo.type !== "general" ? `\n\n---\n*Detected type: ${docInfo.label}*` : "";
    const analysis = rawAnalysis + typeTag;

    // Create a new workspace document with the analysis
    const docName = `${item.name.replace(/\.pdf$/i, "")} — Forge Analysis`;
    const [newDoc] = await db.insert(workspaceItemsTable).values({
      userId,
      type: "document",
      name: docName,
      content: analysis,
      parentId: parentId ?? item.parentId ?? null,
      icon: "file-text",
      color: "#e8611a",
    }).returning();

    res.status(201).json(newDoc);
  } catch (err) {
    req.log.error({ err }, "Failed to forge PDF");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /workspace/import-url — fetch a PDF from a public URL and save it
router.post("/workspace/import-url", async (req, res) => {
  const userId = req.userId;
  const { url, parentId, name: customName } = req.body as { url: string; parentId?: number; name?: string };

  if (!url || !/^https?:\/\//.test(url)) return res.status(400).json({ error: "A valid http/https URL is required" });

  try {
    const buffer = await fetchUrl(url);

    const rawName = customName || url.split("/").pop()?.replace(/\?.*$/, "") || "imported";
    const name = rawName.toLowerCase().endsWith(".pdf") ? rawName : rawName + ".pdf";
    const dataUri = `data:application/pdf;base64,${buffer.toString("base64")}`;

    const [item] = await db.insert(workspaceItemsTable).values({
      userId,
      type: "pdf",
      name,
      content: dataUri,
      parentId: parentId ?? null,
      icon: "file",
      color: "#e8611a",
    }).returning();

    res.status(201).json(item);
  } catch (err) {
    req.log.error({ err }, "Failed to import PDF from URL");
    res.status(500).json({ error: "Could not fetch that URL. Make sure it's a direct link to a publicly accessible PDF." });
  }
});

// POST /workspace/agent — streaming Forge Agent with file context + action tokens
router.post("/workspace/agent", async (req, res) => {
  const userId = req.userId;
  const { messages, files } = req.body as {
    messages: Array<{ role: string; content: string }>;
    files: Array<{ id: number; name: string; type: string }>;
  };

  const fileList = files?.length > 0
    ? files.map(f => `  - [${f.type.toUpperCase()}] "${f.name}" (ID: ${f.id})`).join("\n")
    : "  (workspace is empty)";

  const systemPrompt = `You are Forge — an active AI workspace agent inside 13 Moon Forge. You don't just answer questions. You take real action.

THE USER'S WORKSPACE RIGHT NOW (${files?.length ?? 0} files):
${fileList}

YOUR CAPABILITIES — you can do ALL of these, right now:
1. Import a PDF from any public URL (you do it — they don't have to)
2. Analyze any file in their workspace (trigger the analysis)
3. Open a specific file in the editor
4. Create and save a new document to their workspace
5. Compare multiple PDFs (request multiple analyze actions)
6. Guide them on getting PDFs from phone/computer/cloud storage

HOW TO TRIGGER ACTIONS — put these EXACTLY on their own line in your response:
- Import PDF from URL:      ACTION::{"a":"import","url":"[url]","name":"[filename.pdf]"}
- Analyze a workspace file: ACTION::{"a":"analyze","fileId":[id],"fileName":"[name]"}
- Open a file in editor:    ACTION::{"a":"open","fileId":[id],"fileName":"[name]"}
- Create a new document:    ACTION::{"a":"create","name":"[filename]","content":"[full markdown content here]"}

IMPORTANT RULES:
- When a user gives you a URL → IMMEDIATELY trigger import, no confirmation needed
- When asked to analyze → trigger the analyze action, don't just describe what you'd find
- When creating a document → put the FULL content in the action, not a placeholder
- Don't narrate the actions — they execute in real-time and the user sees them happen
- After actions complete, give a brief summary of what you found/did and what's next
- Be DIRECT. One sentence explanations, not paragraphs of setup

GETTING PDFS ONTO THE PLATFORM — tell users EXACTLY:
- From computer: "Drag them directly onto the Workspace, or click Upload PDF — you can select multiple files at once"
- From phone: "Install the 13 Moon Forge mobile app, then share any PDF from your Files app or email directly into Forge"
- From cloud storage: "Share me the direct link and I'll import it to your workspace right now"
- From email: "Forward the email PDF attachment to yourself, download it, then drag it here"

PERSONALITY:
- Sharp, capable, direct. An agent, not a chatbot.
- Surprise people — most AI just talks, you ACT
- Short setup, big action. One focused question when needed, never three questions at once
- When someone seems lost: "Want me to take over? Just say yes."`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...(messages ?? []).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      stream: true,
      max_tokens: 2000,
    });

    let lineBuffer = "";

    const emitLine = (line: string) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("ACTION::")) {
        try {
          const action = JSON.parse(trimmed.slice(8));
          res.write(`data: ${JSON.stringify({ type: "action", ...action })}\n\n`);
        } catch {
          res.write(`data: ${JSON.stringify({ type: "chunk", content: line + "\n" })}\n\n`);
        }
      } else {
        res.write(`data: ${JSON.stringify({ type: "chunk", content: line + "\n" })}\n\n`);
      }
    };

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (!delta) continue;
      lineBuffer += delta;
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop() ?? "";
      for (const line of lines) emitLine(line);
    }
    if (lineBuffer) emitLine(lineBuffer);

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Forge Agent error");
    res.write(`data: ${JSON.stringify({ type: "error", message: "Forge hit a snag. Try again." })}\n\n`);
    res.end();
  }
});

// POST /workspace/upload-pdf — store an uploaded PDF as a workspace item
router.post("/workspace/upload-pdf", async (req, res) => {
  const userId = req.userId;
  const { name, dataUri, parentId } = req.body as { name: string; dataUri: string; parentId?: number };

  if (!name || !dataUri) return res.status(400).json({ error: "name and dataUri required" });

  try {
    const [item] = await db.insert(workspaceItemsTable).values({
      userId,
      type: "pdf",
      name,
      content: dataUri,
      parentId: parentId ?? null,
      icon: "file",
      color: "#e8611a",
    }).returning();

    res.status(201).json(item);
  } catch (err) {
    req.log.error({ err }, "Failed to upload PDF");
    res.status(500).json({ error: "Internal server error" });
  }
});

function typeToIcon(type: string): string {
  const map: Record<string, string> = {
    folder: "folder", document: "file-text", plan: "calendar-check",
    blueprint: "layout-template", portfolio: "briefcase", goal: "target",
    pdf: "file", code: "code-2",
  };
  return map[type] ?? "file";
}

function typeToColor(type: string): string {
  const map: Record<string, string> = {
    folder: "#f59e0b", document: "#60a5fa", plan: "#a78bfa",
    blueprint: "#38bdf8", portfolio: "#e8611a", goal: "#4ade80",
    pdf: "#94a3b8", code: "#c084fc",
  };
  return map[type] ?? "#60a5fa";
}

export default router;
