import { pgTable, serial, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id:        serial("id").primaryKey(),
    userId:    text("user_id").notNull(),
    moonId:    text("moon_id").notNull(),
    title:     text("title"),
    messages:  jsonb("messages").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    index("chat_sessions_user_moon_idx").on(t.userId, t.moonId),
  ],
);
