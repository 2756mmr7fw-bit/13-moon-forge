import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const siteBuildRequestsTable = pgTable("site_build_requests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  tier: text("tier").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("active"),
  waitlistPosition: integer("waitlist_position"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type SiteBuildRequest = typeof siteBuildRequestsTable.$inferSelect;
export type InsertSiteBuildRequest = typeof siteBuildRequestsTable.$inferInsert;

export const ACTIVE_SITE_BUILD_CAPACITY = 5;
