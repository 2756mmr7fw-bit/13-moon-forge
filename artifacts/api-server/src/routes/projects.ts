import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, pagesTable, pageRevisionsTable } from "@workspace/db";
import { eq, desc, count, sql, and } from "drizzle-orm";
import {
  CreateProjectBody,
  UpdateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  DeleteProjectParams,
  ListPagesParams,
  CreatePageParams,
  CreatePageBody,
  UpdatePageParams,
  UpdatePageBody,
  DeletePageParams,
} from "@workspace/api-zod";

const router = Router();

const MAX_REVISIONS = 10;

router.get("/projects", async (req, res) => {
  try {
    const projectRows = await db.select().from(projectsTable).orderBy(desc(projectsTable.updatedAt));
    const pageCounts = await db
      .select({ projectId: pagesTable.projectId, count: count() })
      .from(pagesTable)
      .groupBy(pagesTable.projectId);
    const pageCountMap = new Map(pageCounts.map((pc) => [pc.projectId, pc.count]));
    res.json(projectRows.map((p) => ({ ...p, pageCount: pageCountMap.get(p.id) ?? 0 })));
  } catch (err) {
    req.log.error({ err }, "Failed to list projects");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/projects", async (req, res) => {
  const body = CreateProjectBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.message });

  try {
    const [project] = await db
      .insert(projectsTable)
      .values({ name: body.data.name, description: body.data.description ?? null, template: body.data.template, status: "draft" })
      .returning();
    res.status(201).json({ ...project, pageCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to create project");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/projects/:id", async (req, res) => {
  const params = GetProjectParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid ID" });

  try {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));
    if (!project) return res.status(404).json({ error: "Project not found" });
    const [pageCount] = await db.select({ count: count() }).from(pagesTable).where(eq(pagesTable.projectId, project.id));
    res.json({ ...project, pageCount: pageCount?.count ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to get project");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/projects/:id", async (req, res) => {
  const params = UpdateProjectParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid ID" });
  const body = UpdateProjectBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.message });

  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.data.name !== undefined) updates.name = body.data.name;
    if (body.data.description !== undefined) updates.description = body.data.description;
    if (body.data.status !== undefined) updates.status = body.data.status;

    const [project] = await db.update(projectsTable).set(updates).where(eq(projectsTable.id, params.data.id)).returning();
    if (!project) return res.status(404).json({ error: "Project not found" });
    const [pageCount] = await db.select({ count: count() }).from(pagesTable).where(eq(pagesTable.projectId, project.id));
    res.json({ ...project, pageCount: pageCount?.count ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to update project");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/projects/:id", async (req, res) => {
  const params = DeleteProjectParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid ID" });

  try {
    await db.delete(projectsTable).where(eq(projectsTable.id, params.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete project");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/projects/:id/pages", async (req, res) => {
  const params = ListPagesParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid ID" });

  try {
    const pages = await db.select().from(pagesTable).where(eq(pagesTable.projectId, params.data.id)).orderBy(pagesTable.order);
    res.json(pages);
  } catch (err) {
    req.log.error({ err }, "Failed to list pages");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/projects/:id/pages", async (req, res) => {
  const params = CreatePageParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid ID" });
  const body = CreatePageBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.message });

  try {
    const [page] = await db
      .insert(pagesTable)
      .values({
        projectId: params.data.id,
        title: body.data.title,
        slug: body.data.slug,
        content: body.data.content ?? "",
        order: body.data.order ?? 0,
      })
      .returning();
    res.status(201).json(page);
  } catch (err) {
    req.log.error({ err }, "Failed to create page");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/projects/:id/pages/:pageId", async (req, res) => {
  const params = UpdatePageParams.safeParse({ id: Number(req.params.id), pageId: Number(req.params.pageId) });
  if (!params.success) return res.status(400).json({ error: "Invalid params" });
  const body = UpdatePageBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.message });

  try {
    // Save revision before overwriting content
    if (body.data.content !== undefined) {
      const [current] = await db.select().from(pagesTable).where(
        and(eq(pagesTable.id, params.data.pageId), eq(pagesTable.projectId, params.data.id))
      );
      if (current?.content && current.content !== body.data.content) {
        await db.insert(pageRevisionsTable).values({ pageId: params.data.pageId, content: current.content });
        // Prune old revisions
        const revs = await db
          .select({ id: pageRevisionsTable.id })
          .from(pageRevisionsTable)
          .where(eq(pageRevisionsTable.pageId, params.data.pageId))
          .orderBy(desc(pageRevisionsTable.createdAt));
        if (revs.length > MAX_REVISIONS) {
          const ids = revs.slice(MAX_REVISIONS).map(r => r.id);
          for (const id of ids) {
            await db.delete(pageRevisionsTable).where(eq(pageRevisionsTable.id, id));
          }
        }
      }
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.data.title !== undefined) updates.title = body.data.title;
    if (body.data.slug !== undefined) updates.slug = body.data.slug;
    if (body.data.content !== undefined) updates.content = body.data.content;
    if (body.data.order !== undefined) updates.order = body.data.order;
    // SEO fields (passed through body extras)
    const raw = req.body as Record<string, unknown>;
    if (raw.metaTitle !== undefined) updates.metaTitle = raw.metaTitle || null;
    if (raw.metaDescription !== undefined) updates.metaDescription = raw.metaDescription || null;

    const [page] = await db
      .update(pagesTable)
      .set(updates)
      .where(sql`${pagesTable.id} = ${params.data.pageId} AND ${pagesTable.projectId} = ${params.data.id}`)
      .returning();

    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json(page);
  } catch (err) {
    req.log.error({ err }, "Failed to update page");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/projects/:id/pages/:pageId", async (req, res) => {
  const params = DeletePageParams.safeParse({ id: Number(req.params.id), pageId: Number(req.params.pageId) });
  if (!params.success) return res.status(400).json({ error: "Invalid params" });

  try {
    await db.delete(pagesTable).where(sql`${pagesTable.id} = ${params.data.pageId} AND ${pagesTable.projectId} = ${params.data.id}`);
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete page");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/forge/plan — extract a project plan from a freeform conversation
router.post("/forge/plan", async (req, res) => {
  const { conversation } = req.body as { conversation?: { role: string; content: string }[] };
  if (!Array.isArray(conversation) || conversation.length === 0) {
    return res.status(400).json({ error: "conversation required" });
  }

  try {
    const { openai } = await import("@workspace/integrations-openai-ai-server");

    const systemPrompt = `You are a project planning assistant. Given a conversation between a user and Forge (an AI builder), extract a project plan as JSON.

Return ONLY valid JSON in this exact shape — no markdown, no explanation:
{
  "name": "Project name (3 words max, title-case)",
  "template": "portfolio|business|blog|landing|ecommerce",
  "pages": ["Home", "About", "Contact"],
  "brief": "A vivid 2-3 sentence description of the site, its audience, style, and purpose",
  "ready": true
}

Rules:
- "template" must be one of: portfolio, business, blog, landing, ecommerce
- "pages" should be 2-5 relevant page names
- If the conversation doesn't have enough info yet, set "ready": false and fill in best guesses
- Keep names short and clean — no punctuation in project name`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversation.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      temperature: 0.3,
      max_tokens: 400,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    const plan = JSON.parse(raw);
    res.json(plan);
  } catch (err) {
    req.log.error({ err }, "Failed to extract project plan");
    res.status(500).json({ error: "Failed to extract plan" });
  }
});

export default router;
