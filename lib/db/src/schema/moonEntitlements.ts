import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const moonEntitlements = pgTable("moon_entitlements", {
  userId:            text("user_id").primaryKey(),
  moons:             text("moons").array().notNull().default([]),
  isActive:          boolean("is_active").notNull().default(false),
  messagesRemaining: integer("messages_remaining"),
  expiresAt:         timestamp("expires_at", { withTimezone: true }),
  updatedAt:         timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
