import { pgTable, serial, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const notificationsTable = pgTable("notifications", {
  id:        serial("id").primaryKey(),
  userId:    text("user_id").notNull(),
  type:      text("type").notNull(),
  title:     text("title").notNull(),
  message:   text("message").notNull(),
  link:      text("link"),
  read:      boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("notifications_user_id_idx").on(t.userId),
  index("notifications_read_idx").on(t.userId, t.read),
]);
