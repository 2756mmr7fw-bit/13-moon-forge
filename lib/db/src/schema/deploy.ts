import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const serverConnectionsTable = pgTable("server_connections", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull().default("My Server"),
  coolifyUrl: text("coolify_url").notNull(),
  coolifyApiKey: text("coolify_api_key").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const registryAppsTable = pgTable("registry_apps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  stack: text("stack").notNull(),
  githubUrl: text("github_url"),
  dockerImage: text("docker_image"),
  submittedByUserId: text("submitted_by_user_id").notNull(),
  submittedByName: text("submitted_by_name"),
  status: text("status").notNull().default("pending"),
  sovereignCertified: boolean("sovereign_certified").notNull().default(false),
  minRam: integer("min_ram").notNull().default(2),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ServerConnection = typeof serverConnectionsTable.$inferSelect;
export type RegistryApp = typeof registryAppsTable.$inferSelect;
