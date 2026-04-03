import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, pagesTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";
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

router.get("/projects", async (req, res) => {
  try {
    const projectRows = await db.select().from(projectsTable).orderBy(desc(projectsTable.updatedAt));

    const pageCounts = await db
      .select({ projectId: pagesTable.projectId, count: count() })
      .from(pagesTable)
      .groupBy(pagesTable.projectId);

    const pageCountMap = new Map(pageCounts.map((pc) => [pc.projectId, pc.count]));

    const projects = projectRows.map((p) => ({
      ...p,
      pageCount: pageCountMap.get(p.id) ?? 0,
    }));

    res.json(projects);
  } catch (err) {
    req.log.error({ err }, "Failed to list projects");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/projects", async (req, res) => {
  const body = CreateProjectBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.message });
  }

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
  if (!params.success) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  try {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, params.data.id));

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const [pageCount] = await db
      .select({ count: count() })
      .from(pagesTable)
      .where(eq(pagesTable.projectId, project.id));

    res.json({ ...project, pageCount: pageCount?.count ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to get project");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/projects/:id", async (req, res) => {
  const params = UpdateProjectParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const body = UpdateProjectBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.message });
  }

  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.data.name !== undefined) updates.name = body.data.name;
    if (body.data.description !== undefined) updates.description = body.data.description;
    if (body.data.status !== undefined) updates.status = body.data.status;

    const [project] = await db
      .update(projectsTable)
      .set(updates)
      .where(eq(projectsTable.id, params.data.id))
      .returning();

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const [pageCount] = await db
      .select({ count: count() })
      .from(pagesTable)
      .where(eq(pagesTable.projectId, project.id));

    res.json({ ...project, pageCount: pageCount?.count ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to update project");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/projects/:id", async (req, res) => {
  const params = DeleteProjectParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    return res.status(400).json({ error: "Invalid ID" });
  }

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
  if (!params.success) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  try {
    const pages = await db
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.projectId, params.data.id))
      .orderBy(pagesTable.order);

    res.json(pages);
  } catch (err) {
    req.log.error({ err }, "Failed to list pages");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/projects/:id/pages", async (req, res) => {
  const params = CreatePageParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const body = CreatePageBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.message });
  }

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
  const params = UpdatePageParams.safeParse({
    id: Number(req.params.id),
    pageId: Number(req.params.pageId),
  });
  if (!params.success) {
    return res.status(400).json({ error: "Invalid params" });
  }

  const body = UpdatePageBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.message });
  }

  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.data.title !== undefined) updates.title = body.data.title;
    if (body.data.slug !== undefined) updates.slug = body.data.slug;
    if (body.data.content !== undefined) updates.content = body.data.content;
    if (body.data.order !== undefined) updates.order = body.data.order;

    const [page] = await db
      .update(pagesTable)
      .set(updates)
      .where(
        sql`${pagesTable.id} = ${params.data.pageId} AND ${pagesTable.projectId} = ${params.data.id}`
      )
      .returning();

    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    res.json(page);
  } catch (err) {
    req.log.error({ err }, "Failed to update page");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/projects/:id/pages/:pageId", async (req, res) => {
  const params = DeletePageParams.safeParse({
    id: Number(req.params.id),
    pageId: Number(req.params.pageId),
  });
  if (!params.success) {
    return res.status(400).json({ error: "Invalid params" });
  }

  try {
    await db
      .delete(pagesTable)
      .where(
        sql`${pagesTable.id} = ${params.data.pageId} AND ${pagesTable.projectId} = ${params.data.id}`
      );
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete page");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
