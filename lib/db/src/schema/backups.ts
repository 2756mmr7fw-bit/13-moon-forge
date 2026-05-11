import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const backupStatusEnum = pgEnum("backup_status", ["pending", "running", "complete", "error"]);

export const backupsTable = pgTable("backups", {
  id:          serial("id").primaryKey(),
  userId:      text("user_id").notNull(),
  label:       text("label").notNull(),
  size:        integer("size"),
  status:      backupStatusEnum("status").notNull().default("pending"),
  storagePath: text("storage_path"),
  errorMsg:    text("error_msg"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});
