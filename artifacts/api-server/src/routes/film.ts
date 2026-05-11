import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, filmProjectsTable, filmClipsTable } from "@workspace/db";
import {
  CreateFilmProjectBody,
  GetFilmProjectParams,
  UpdateFilmProjectParams,
  UpdateFilmProjectBody,
  DeleteFilmProjectParams,
  ListFilmClipsParams,
  CreateFilmClipParams,
  CreateFilmClipBody,
  UpdateFilmClipParams,
  UpdateFilmClipBody,
  DeleteFilmClipParams,
  ReorderFilmClipsParams,
  ReorderFilmClipsBody,
  GetFilmProjectStatsParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/film/projects", async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const projects = await db
    .select({
      id: filmProjectsTable.id,
      title: filmProjectsTable.title,
      description: filmProjectsTable.description,
      userId: filmProjectsTable.userId,
      aspectRatio: filmProjectsTable.aspectRatio,
      frameRate: filmProjectsTable.frameRate,
      status: filmProjectsTable.status,
      thumbnailUrl: filmProjectsTable.thumbnailUrl,
      createdAt: filmProjectsTable.createdAt,
      updatedAt: filmProjectsTable.updatedAt,
      clipCount: sql<number>`cast(count(${filmClipsTable.id}) as int)`,
      totalDurationMs: sql<number>`cast(coalesce(sum(${filmClipsTable.durationMs}), 0) as int)`,
    })
    .from(filmProjectsTable)
    .leftJoin(filmClipsTable, eq(filmClipsTable.projectId, filmProjectsTable.id))
    .where(eq(filmProjectsTable.userId, userId))
    .groupBy(filmProjectsTable.id)
    .orderBy(desc(filmProjectsTable.updatedAt));

  res.json(projects);
});

router.post("/film/projects", async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateFilmProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .insert(filmProjectsTable)
    .values({
      ...parsed.data,
      userId,
    })
    .returning();

  res.status(201).json({
    ...project,
    clipCount: 0,
    totalDurationMs: 0,
  });
});

router.get("/film/projects/recent", async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const projects = await db
    .select({
      id: filmProjectsTable.id,
      title: filmProjectsTable.title,
      description: filmProjectsTable.description,
      userId: filmProjectsTable.userId,
      aspectRatio: filmProjectsTable.aspectRatio,
      frameRate: filmProjectsTable.frameRate,
      status: filmProjectsTable.status,
      thumbnailUrl: filmProjectsTable.thumbnailUrl,
      createdAt: filmProjectsTable.createdAt,
      updatedAt: filmProjectsTable.updatedAt,
      clipCount: sql<number>`cast(count(${filmClipsTable.id}) as int)`,
      totalDurationMs: sql<number>`cast(coalesce(sum(${filmClipsTable.durationMs}), 0) as int)`,
    })
    .from(filmProjectsTable)
    .leftJoin(filmClipsTable, eq(filmClipsTable.projectId, filmProjectsTable.id))
    .where(eq(filmProjectsTable.userId, userId))
    .groupBy(filmProjectsTable.id)
    .orderBy(desc(filmProjectsTable.updatedAt))
    .limit(6);

  res.json(projects);
});

router.get("/film/projects/:id", async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = GetFilmProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select({
      id: filmProjectsTable.id,
      title: filmProjectsTable.title,
      description: filmProjectsTable.description,
      userId: filmProjectsTable.userId,
      aspectRatio: filmProjectsTable.aspectRatio,
      frameRate: filmProjectsTable.frameRate,
      status: filmProjectsTable.status,
      thumbnailUrl: filmProjectsTable.thumbnailUrl,
      createdAt: filmProjectsTable.createdAt,
      updatedAt: filmProjectsTable.updatedAt,
      clipCount: sql<number>`cast(count(${filmClipsTable.id}) as int)`,
      totalDurationMs: sql<number>`cast(coalesce(sum(${filmClipsTable.durationMs}), 0) as int)`,
    })
    .from(filmProjectsTable)
    .leftJoin(filmClipsTable, eq(filmClipsTable.projectId, filmProjectsTable.id))
    .where(
      and(
        eq(filmProjectsTable.id, params.data.id),
        eq(filmProjectsTable.userId, userId),
      ),
    )
    .groupBy(filmProjectsTable.id);

  if (!project) {
    res.status(404).json({ error: "Film project not found" });
    return;
  }

  res.json(project);
});

router.patch("/film/projects/:id", async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = UpdateFilmProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateFilmProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .update(filmProjectsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(
        eq(filmProjectsTable.id, params.data.id),
        eq(filmProjectsTable.userId, userId),
      ),
    )
    .returning();

  if (!project) {
    res.status(404).json({ error: "Film project not found" });
    return;
  }

  const clips = await db
    .select()
    .from(filmClipsTable)
    .where(eq(filmClipsTable.projectId, project.id));

  res.json({
    ...project,
    clipCount: clips.length,
    totalDurationMs: clips.reduce((sum, c) => sum + c.durationMs, 0),
  });
});

router.delete("/film/projects/:id", async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = DeleteFilmProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(filmProjectsTable)
    .where(
      and(
        eq(filmProjectsTable.id, params.data.id),
        eq(filmProjectsTable.userId, userId),
      ),
    );

  res.sendStatus(204);
});

router.get("/film/projects/:id/stats", async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = GetFilmProjectStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(filmProjectsTable)
    .where(
      and(
        eq(filmProjectsTable.id, params.data.id),
        eq(filmProjectsTable.userId, userId),
      ),
    );

  if (!project) {
    res.status(404).json({ error: "Film project not found" });
    return;
  }

  const clips = await db
    .select()
    .from(filmClipsTable)
    .where(eq(filmClipsTable.projectId, params.data.id));

  const tracks = new Set(clips.map((c) => c.trackIndex));

  res.json({
    totalDurationMs: clips.reduce((sum, c) => sum + c.durationMs, 0),
    clipCount: clips.length,
    videoClips: clips.filter((c) => c.type === "video").length,
    audioClips: clips.filter((c) => c.type === "audio").length,
    imageClips: clips.filter((c) => c.type === "image").length,
    textClips: clips.filter((c) => c.type === "text").length,
    trackCount: tracks.size,
  });
});

router.get("/film/projects/:id/clips", async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = ListFilmClipsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select({ id: filmProjectsTable.id })
    .from(filmProjectsTable)
    .where(
      and(
        eq(filmProjectsTable.id, params.data.id),
        eq(filmProjectsTable.userId, userId),
      ),
    );

  if (!project) {
    res.status(404).json({ error: "Film project not found" });
    return;
  }

  const clips = await db
    .select()
    .from(filmClipsTable)
    .where(eq(filmClipsTable.projectId, params.data.id))
    .orderBy(filmClipsTable.trackIndex, filmClipsTable.order);

  res.json(clips);
});

router.post("/film/projects/:id/clips", async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = CreateFilmClipParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateFilmClipBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .select({ id: filmProjectsTable.id })
    .from(filmProjectsTable)
    .where(
      and(
        eq(filmProjectsTable.id, params.data.id),
        eq(filmProjectsTable.userId, userId),
      ),
    );

  if (!project) {
    res.status(404).json({ error: "Film project not found" });
    return;
  }

  const [clip] = await db
    .insert(filmClipsTable)
    .values({
      ...parsed.data,
      projectId: params.data.id,
      trimEndMs: parsed.data.trimEndMs ?? parsed.data.durationMs,
    })
    .returning();

  await db
    .update(filmProjectsTable)
    .set({ updatedAt: new Date() })
    .where(eq(filmProjectsTable.id, params.data.id));

  res.status(201).json(clip);
});

router.patch("/film/projects/:id/clips/:clipId", async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = UpdateFilmClipParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateFilmClipBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .select({ id: filmProjectsTable.id })
    .from(filmProjectsTable)
    .where(
      and(
        eq(filmProjectsTable.id, params.data.id),
        eq(filmProjectsTable.userId, userId),
      ),
    );

  if (!project) {
    res.status(404).json({ error: "Film project not found" });
    return;
  }

  const [clip] = await db
    .update(filmClipsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(
        eq(filmClipsTable.id, params.data.clipId),
        eq(filmClipsTable.projectId, params.data.id),
      ),
    )
    .returning();

  if (!clip) {
    res.status(404).json({ error: "Clip not found" });
    return;
  }

  res.json(clip);
});

router.delete("/film/projects/:id/clips/:clipId", async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = DeleteFilmClipParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select({ id: filmProjectsTable.id })
    .from(filmProjectsTable)
    .where(
      and(
        eq(filmProjectsTable.id, params.data.id),
        eq(filmProjectsTable.userId, userId),
      ),
    );

  if (!project) {
    res.status(404).json({ error: "Film project not found" });
    return;
  }

  await db
    .delete(filmClipsTable)
    .where(
      and(
        eq(filmClipsTable.id, params.data.clipId),
        eq(filmClipsTable.projectId, params.data.id),
      ),
    );

  res.sendStatus(204);
});

router.post("/film/projects/:id/clips/reorder", async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = ReorderFilmClipsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ReorderFilmClipsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .select({ id: filmProjectsTable.id })
    .from(filmProjectsTable)
    .where(
      and(
        eq(filmProjectsTable.id, params.data.id),
        eq(filmProjectsTable.userId, userId),
      ),
    );

  if (!project) {
    res.status(404).json({ error: "Film project not found" });
    return;
  }

  const updates = parsed.data.clipIds.map((clipId, index) =>
    db
      .update(filmClipsTable)
      .set({ order: index, updatedAt: new Date() })
      .where(
        and(
          eq(filmClipsTable.id, clipId),
          eq(filmClipsTable.projectId, params.data.id),
        ),
      ),
  );

  await Promise.all(updates);

  const clips = await db
    .select()
    .from(filmClipsTable)
    .where(eq(filmClipsTable.projectId, params.data.id))
    .orderBy(filmClipsTable.trackIndex, filmClipsTable.order);

  res.json(clips);
});

router.get("/film/recent", async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const projects = await db
    .select({
      id: filmProjectsTable.id,
      title: filmProjectsTable.title,
      description: filmProjectsTable.description,
      userId: filmProjectsTable.userId,
      aspectRatio: filmProjectsTable.aspectRatio,
      frameRate: filmProjectsTable.frameRate,
      status: filmProjectsTable.status,
      thumbnailUrl: filmProjectsTable.thumbnailUrl,
      createdAt: filmProjectsTable.createdAt,
      updatedAt: filmProjectsTable.updatedAt,
      clipCount: sql<number>`cast(count(${filmClipsTable.id}) as int)`,
      totalDurationMs: sql<number>`cast(coalesce(sum(${filmClipsTable.durationMs}), 0) as int)`,
    })
    .from(filmProjectsTable)
    .leftJoin(filmClipsTable, eq(filmClipsTable.projectId, filmProjectsTable.id))
    .where(eq(filmProjectsTable.userId, userId))
    .groupBy(filmProjectsTable.id)
    .orderBy(desc(filmProjectsTable.updatedAt))
    .limit(6);

  res.json(projects);
});

logger.info("Film editor routes loaded");

export default router;
