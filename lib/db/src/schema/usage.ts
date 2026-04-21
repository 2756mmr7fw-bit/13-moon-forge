import { pgTable, text, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const messageUsageTable = pgTable("message_usage", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  month: text("month").notNull(),
  count: integer("count").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [unique("message_usage_user_month").on(t.userId, t.month)]);

export type MessageUsage = typeof messageUsageTable.$inferSelect;
