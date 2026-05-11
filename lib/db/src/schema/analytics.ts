import { pgTable, serial, text, integer, timestamp, index, date } from "drizzle-orm/pg-core";

export const siteAnalyticsTable = pgTable("site_analytics", {
  id:        serial("id").primaryKey(),
  userId:    text("user_id").notNull(),
  domain:    text("domain").notNull(),
  day:       date("day").notNull(),
  pageViews: integer("page_views").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("site_analytics_user_idx").on(t.userId),
  index("site_analytics_domain_day_idx").on(t.domain, t.day),
]);

export const siteHitsTable = pgTable("site_hits", {
  id:        serial("id").primaryKey(),
  domain:    text("domain").notNull(),
  path:      text("path").notNull().default("/"),
  referrer:  text("referrer"),
  country:   text("country"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("site_hits_domain_idx").on(t.domain),
]);
