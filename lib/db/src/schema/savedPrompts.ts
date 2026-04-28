import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

export const savedPrompts = pgTable(
  "saved_prompts",
  {
    id:        serial("id").primaryKey(),
    userId:    text("user_id").notNull(),
    title:     text("title").notNull(),
    prompt:    text("prompt").notNull(),
    moonId:    text("moon_id"),
    tags:      text("tags").array().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    index("saved_prompts_user_idx").on(t.userId),
  ],
);
