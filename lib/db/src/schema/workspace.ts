import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const workspaceItemsTable = pgTable("workspace_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // folder | document | plan | blueprint | portfolio | goal | pdf
  name: text("name").notNull(),
  content: text("content").default(""),
  parentId: integer("parent_id"),
  icon: text("icon").default("file"),
  color: text("color").default("#e8611a"),
  pinned: boolean("pinned").notNull().default(false),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
