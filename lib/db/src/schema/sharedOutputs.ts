import { pgTable, varchar, text, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const sharedOutputs = pgTable("shared_outputs", {
  id:        varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  userId:    text("user_id").notNull(),
  moonId:    text("moon_id").notNull(),
  title:     text("title").notNull(),
  content:   text("content").notNull(),
  isPublic:  boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const galleryReactions = pgTable("gallery_reactions", {
  id:        serial("id").primaryKey(),
  outputId:  varchar("output_id", { length: 64 }).notNull().references(() => sharedOutputs.id, { onDelete: "cascade" }),
  userId:    text("user_id").notNull(),
  reaction:  text("reaction").notNull(), // "fire" | "useful" | "saved"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
