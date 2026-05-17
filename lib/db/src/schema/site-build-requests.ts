import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const siteBuildRequestsTable = pgTable("site_build_requests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  tier: text("tier").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("active"),
  waitlistPosition: integer("waitlist_position"),
  hasGithub: boolean("has_github").notNull().default(false),
  githubUsername: text("github_username"),
  hasDomain: boolean("has_domain").notNull().default(false),
  domain: text("domain"),
  repoUrl: text("repo_url"),
  hostingUrl: text("hosting_url"),
  adminNotes: text("admin_notes"),
  notifiedEmail: boolean("notified_email").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type SiteBuildRequest = typeof siteBuildRequestsTable.$inferSelect;
export type InsertSiteBuildRequest = typeof siteBuildRequestsTable.$inferInsert;

export const ACTIVE_SITE_BUILD_CAPACITY = 5;
