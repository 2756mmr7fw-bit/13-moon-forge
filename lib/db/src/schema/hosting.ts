import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const hostedUsersTable = pgTable("hosted_users", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  plan: text("plan").notNull().default("basic"),
  coolifyTeamId: text("coolify_team_id"),
  coolifyUrl: text("coolify_url").notNull().default("http://5.78.154.21:8000"),
  status: text("status").notNull().default("pending"),
  subdomain: text("subdomain").unique(),
  requestNote: text("request_note"),
  notes: text("notes"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  provisionedAt: timestamp("provisioned_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type HostedUser = typeof hostedUsersTable.$inferSelect;
