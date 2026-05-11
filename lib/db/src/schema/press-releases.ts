import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pressReleasesTable = pgTable("press_releases", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  userId: text("user_id"),
  authorName: text("author_name"),
  companyName: text("company_name").notNull(),
  headline: text("headline").notNull(),
  dateline: text("dateline"),
  body: text("body").notNull(),
  boilerplate: text("boilerplate"),
  keywords: text("keywords"),
  websiteUrl: text("website_url"),
  isPublic: boolean("is_public").notNull().default(true),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPressReleaseSchema = createInsertSchema(pressReleasesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertPressRelease = z.infer<typeof insertPressReleaseSchema>;
export type PressRelease = typeof pressReleasesTable.$inferSelect;
