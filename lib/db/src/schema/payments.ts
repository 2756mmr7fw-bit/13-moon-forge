import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const plansTable = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  priceMonthly: integer("price_monthly").notNull(),
  squarePlanId: text("square_plan_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  email: text("email"),
  plan: text("plan").notNull(),
  squareOrderId: text("square_order_id"),
  squarePaymentId: text("square_payment_id"),
  squarePaymentLinkId: text("square_payment_link_id"),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull().default("pending"),
  paid: boolean("paid").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Payment = typeof paymentsTable.$inferSelect;
export type Plan = typeof plansTable.$inferSelect;
