import { pgTable, text, serial, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const showcaseCategoryEnum = pgEnum("showcase_category", [
  "productivity",
  "social",
  "media",
  "education",
  "tools",
  "games",
  "finance",
  "health",
  "creative",
  "other",
]);

export const showcaseListingTypeEnum = pgEnum("showcase_listing_type", [
  "advertise",
  "hosted",
]);

export const showcaseAppsTable = pgTable("showcase_apps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  websiteUrl: text("website_url"),
  iosUrl: text("ios_url"),
  androidUrl: text("android_url"),
  logoUrl: text("logo_url"),
  screenshotUrl: text("screenshot_url"),
  category: showcaseCategoryEnum("category").notNull().default("other"),
  listingType: showcaseListingTypeEnum("listing_type").notNull().default("advertise"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(false),
  isPlaceholder: boolean("is_placeholder").notNull().default(false),
  submittedBy: text("submitted_by"),
  builderName: text("builder_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertShowcaseAppSchema = createInsertSchema(showcaseAppsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertShowcaseApp = z.infer<typeof insertShowcaseAppSchema>;
export type ShowcaseApp = typeof showcaseAppsTable.$inferSelect;
