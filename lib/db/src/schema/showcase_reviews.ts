import { pgTable, serial, text, integer, timestamp, boolean, index, unique } from "drizzle-orm/pg-core";

export const showcaseReviewsTable = pgTable("showcase_reviews", {
  id:          serial("id").primaryKey(),
  appId:       integer("app_id").notNull(),
  userId:      text("user_id").notNull(),
  upvoted:     boolean("upvoted").notNull().default(false),
  comment:     text("comment"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("showcase_reviews_app_idx").on(t.appId),
  unique("showcase_reviews_user_app").on(t.userId, t.appId),
]);
