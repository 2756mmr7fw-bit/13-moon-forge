import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userTptsLinks = pgTable("user_tpts_links", {
  id:         serial("id").primaryKey(),
  userId:     text("user_id").notNull().unique(),
  tptsEmail:  text("tpts_email").notNull(),
  linkedAt:   timestamp("linked_at").notNull().default(sql`now()`),
  updatedAt:  timestamp("updated_at").notNull().default(sql`now()`),
});
