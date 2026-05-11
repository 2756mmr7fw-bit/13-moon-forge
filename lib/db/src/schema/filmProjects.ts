import { pgTable, text, serial, timestamp, integer, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const filmAspectRatioEnum = pgEnum("film_aspect_ratio", ["16:9", "9:16", "1:1", "4:3", "21:9"]);
export const filmProjectStatusEnum = pgEnum("film_project_status", ["draft", "in_progress", "complete", "exported"]);
export const filmClipTypeEnum = pgEnum("film_clip_type", ["video", "audio", "image", "text", "transition", "color"]);

export const filmProjectsTable = pgTable("film_projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  userId: text("user_id").notNull(),
  aspectRatio: filmAspectRatioEnum("aspect_ratio").notNull().default("16:9"),
  frameRate: integer("frame_rate").notNull().default(24),
  status: filmProjectStatusEnum("status").notNull().default("draft"),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const filmClipsTable = pgTable("film_clips", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => filmProjectsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: filmClipTypeEnum("type").notNull(),
  sourceUrl: text("source_url"),
  thumbnailUrl: text("thumbnail_url"),
  startMs: integer("start_ms").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  trackIndex: integer("track_index").notNull().default(0),
  order: integer("order").notNull().default(0),
  trimStartMs: integer("trim_start_ms").notNull().default(0),
  trimEndMs: integer("trim_end_ms").notNull().default(0),
  volume: real("volume").notNull().default(1),
  opacity: real("opacity").notNull().default(1),
  speed: real("speed").notNull().default(1),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFilmProjectSchema = createInsertSchema(filmProjectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFilmProject = z.infer<typeof insertFilmProjectSchema>;
export type FilmProject = typeof filmProjectsTable.$inferSelect;

export const insertFilmClipSchema = createInsertSchema(filmClipsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFilmClip = z.infer<typeof insertFilmClipSchema>;
export type FilmClip = typeof filmClipsTable.$inferSelect;
