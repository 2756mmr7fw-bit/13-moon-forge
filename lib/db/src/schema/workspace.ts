import { pgTable, serial, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";

export const workspaceItemsTable = pgTable("workspace_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  content: text("content").default(""),
  parentId: integer("parent_id"),
  icon: text("icon").default("file"),
  color: text("color").default("#e8611a"),
  pinned: boolean("pinned").notNull().default(false),
  order: integer("order").notNull().default(0),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("workspace_items_user_id_idx").on(t.userId),
  index("workspace_items_parent_id_idx").on(t.parentId),
  index("workspace_items_user_deleted_idx").on(t.userId, t.deletedAt),
]);

export const workspaceItemVersionsTable = pgTable("workspace_item_versions", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  content: text("content").notNull().default(""),
  savedAt: timestamp("saved_at").notNull().defaultNow(),
}, (t) => [
  index("workspace_item_versions_item_id_idx").on(t.itemId),
  index("workspace_item_versions_user_id_idx").on(t.userId),
]);
