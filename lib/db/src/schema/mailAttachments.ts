import { pgTable, serial, integer, varchar, text, bigint, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { forgeMailbox } from "./mailbox";

export const forgeMailAttachments = pgTable("forge_mail_attachments", {
  id:           serial("id").primaryKey(),
  messageId:    integer("message_id").notNull().references(() => forgeMailbox.id, { onDelete: "cascade" }),
  userId:       varchar("user_id", { length: 256 }).notNull(),
  filename:     varchar("filename", { length: 512 }).notNull(),
  mime:         varchar("mime", { length: 256 }).notNull().default("application/octet-stream"),
  sizeBytes:    bigint("size_bytes", { mode: "number" }).notNull().default(0),
  content:      text("content").notNull().default(""),
  scanStatus:   varchar("scan_status", { length: 32 }).notNull().default("pending"),
  scanResult:   text("scan_result"),
  droppedTo:    varchar("dropped_to", { length: 128 }),
  createdAt:    timestamp("created_at").notNull().default(sql`now()`),
});
