import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const serverConnectionsTable = pgTable("server_connections", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull().default("My Server"),
  coolifyUrl: text("coolify_url").notNull(),
  coolifyApiKey: text("coolify_api_key").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ServerConnection = typeof serverConnectionsTable.$inferSelect;
