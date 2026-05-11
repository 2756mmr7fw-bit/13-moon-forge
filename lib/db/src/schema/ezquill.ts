import { pgTable, text, serial, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ezquillDocumentsTable = pgTable("ezquill_documents", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  pageCount: integer("page_count").notNull().default(1),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEzquillDocumentSchema = createInsertSchema(ezquillDocumentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEzquillDocument = z.infer<typeof insertEzquillDocumentSchema>;
export type EzquillDocument = typeof ezquillDocumentsTable.$inferSelect;

export const ezquillFieldsTable = pgTable("ezquill_fields", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => ezquillDocumentsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  fieldType: text("field_type").notNull().default("text"),
  value: text("value"),
  placeholder: text("placeholder"),
  page: integer("page").notNull().default(1),
  x: real("x").notNull().default(0),
  y: real("y").notNull().default(0),
  width: real("width").notNull().default(200),
  height: real("height").notNull().default(40),
  required: boolean("required").notNull().default(false),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEzquillFieldSchema = createInsertSchema(ezquillFieldsTable).omit({ id: true, createdAt: true });
export type InsertEzquillField = z.infer<typeof insertEzquillFieldSchema>;
export type EzquillField = typeof ezquillFieldsTable.$inferSelect;

export const ezquillProfilesTable = pgTable("ezquill_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  fullName: text("full_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  company: text("company"),
  title: text("title"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEzquillProfileSchema = createInsertSchema(ezquillProfilesTable).omit({ id: true, updatedAt: true });
export type InsertEzquillProfile = z.infer<typeof insertEzquillProfileSchema>;
export type EzquillProfile = typeof ezquillProfilesTable.$inferSelect;

export const ezquillSignaturesTable = pgTable("ezquill_signatures", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  dataUrl: text("data_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEzquillSignatureSchema = createInsertSchema(ezquillSignaturesTable).omit({ id: true, updatedAt: true });
export type InsertEzquillSignature = z.infer<typeof insertEzquillSignatureSchema>;
export type EzquillSignature = typeof ezquillSignaturesTable.$inferSelect;
