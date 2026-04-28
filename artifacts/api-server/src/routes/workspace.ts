import { Router } from "express";
import { db } from "@workspace/db";
import { workspaceItemsTable, workspaceItemVersionsTable } from "@workspace/db";
import { eq, and, desc, isNull, isNotNull } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { isAdmin } from "./admin";

const router = Router();

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
