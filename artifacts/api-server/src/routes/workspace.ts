import { Router } from "express";
import { db } from "@workspace/db";
import { workspaceItemsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

// GET /workspace — list all items for the current user
router.get("/workspace", async (req, res) => {
  const userId = req.userId;
  try {
    const items = await db
      .select()
      .from(workspaceItemsTable)
      .where(eq(workspaceItemsTable.userId, userId))
      .orderBy(workspaceItemsTable.order, workspaceItemsTable.createdAt);
    res.json(items);
  } catch (err) {
    req.log.error({ err }, "Failed to list workspace items");
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

// PUT /workspace/:id — update an item
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

// DELETE /workspace/:id — delete an item (and children)
router.delete("/workspace/:id", async (req, res) => {
  const userId = req.userId;
  const id = Number(req.params.id);

  try {
    // Delete children first
    await db
      .delete(workspaceItemsTable)
      .where(and(eq(workspaceItemsTable.parentId, id), eq(workspaceItemsTable.userId, userId)));

    await db
      .delete(workspaceItemsTable)
      .where(and(eq(workspaceItemsTable.id, id), eq(workspaceItemsTable.userId, userId)));

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete workspace item");
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
      parsed = JSON.parse(raw);
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
    blueprint: "layout-template", portfolio: "briefcase", goal: "target", pdf: "file",
  };
  return map[type] ?? "file";
}

function typeToColor(type: string): string {
  const map: Record<string, string> = {
    folder: "#f59e0b", document: "#60a5fa", plan: "#a78bfa",
    blueprint: "#38bdf8", portfolio: "#e8611a", goal: "#4ade80", pdf: "#94a3b8",
  };
  return map[type] ?? "#60a5fa";
}

export default router;
