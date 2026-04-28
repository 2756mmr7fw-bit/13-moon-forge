import { pgTable, text, serial, timestamp, unique } from "drizzle-orm/pg-core";

export const referralsTable = pgTable("referrals", {
  id:              serial("id").primaryKey(),
  referrerId:      text("referrer_id").notNull(),
  referredUserId:  text("referred_user_id"),
  code:            text("code").notNull(),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  claimedAt:       timestamp("claimed_at"),
}, (t) => ({
  uniqueCode:      unique("referrals_code_unique").on(t.code),
}));
