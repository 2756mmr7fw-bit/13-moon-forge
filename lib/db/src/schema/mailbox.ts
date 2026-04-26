import { pgTable, serial, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const forgeMailbox = pgTable("forge_mailbox", {
  id:           serial("id").primaryKey(),
  userId:       varchar("user_id", { length: 256 }).notNull(),
  fromName:     varchar("from_name", { length: 256 }).notNull().default("Forge"),
  fromAddress:  varchar("from_address", { length: 256 }).notNull().default("forge@13moonforge.ai"),
  subject:      varchar("subject", { length: 512 }).notNull().default("(No subject)"),
  body:         text("body").notNull().default(""),
  read:         boolean("read").notNull().default(false),
  starred:      boolean("starred").notNull().default(false),
  folder:       varchar("folder", { length: 64 }).notNull().default("inbox"),
  createdAt:    timestamp("created_at").notNull().default(sql`now()`),
});
