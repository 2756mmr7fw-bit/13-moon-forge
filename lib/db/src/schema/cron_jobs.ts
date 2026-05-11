import { pgTable, serial, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const cronStatusEnum = pgEnum("cron_status", ["success", "error", "running"]);

export const cronJobsTable = pgTable("cron_jobs", {
  id:         serial("id").primaryKey(),
  userId:     text("user_id").notNull(),
  name:       text("name").notNull(),
  schedule:   text("schedule").notNull(),
  command:    text("command").notNull(),
  appId:      text("app_id"),
  enabled:    boolean("enabled").notNull().default(true),
  lastRun:    timestamp("last_run"),
  lastStatus: cronStatusEnum("last_status"),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
  updatedAt:  timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});
