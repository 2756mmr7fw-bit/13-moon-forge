import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const userMemory = pgTable("user_memory", {
  userId:      text("user_id").primaryKey(),
  name:        text("name"),
  building:    text("building"),
  role:        text("role"),
  preferences: text("preferences"),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
