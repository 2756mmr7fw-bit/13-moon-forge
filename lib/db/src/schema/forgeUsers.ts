import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

// ─── Forge Users ──────────────────────────────────────────────────────────────
// Canonical internal user record. The forgeUserId is YOUR identity — it never
// changes regardless of which auth provider the user signs in with.
//
// For all existing Clerk users: forgeUserId === clerkUserId so no data
// migration is needed. All 29 existing tables continue to work as-is.
//
// For new users: forgeUserId is also set to the Clerk user ID on first login.
// When you eventually switch auth providers, just add a new row to
// user_identities mapping the new provider ID to the same forgeUserId.

export const forgeUsersTable = pgTable("forge_users", {
  id:          text("id").primaryKey(),          // same as Clerk ID for existing users
  email:       text("email"),
  displayName: text("display_name"),
  avatarUrl:   text("avatar_url"),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── User Identities ──────────────────────────────────────────────────────────
// Maps (provider, providerId) → forgeUserId.
// One user can have multiple rows here — one per auth provider they've used.
//
// provider examples: "clerk" | "replit" | "google" | "github"
// providerId: the unique ID from that provider (e.g. Clerk's user_abc123)
//
// To add a new auth provider without losing any user:
//   INSERT INTO user_identities (forge_user_id, provider, provider_id)
//   VALUES (<existing forge_user_id>, 'replit', <replit_user_id>)
//   ON CONFLICT DO NOTHING;

export const userIdentitiesTable = pgTable("user_identities", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  forgeUserId:  text("forge_user_id").notNull().references(() => forgeUsersTable.id, { onDelete: "cascade" }),
  provider:     text("provider").notNull(),    // "clerk" | "replit" | "google" etc.
  providerId:   text("provider_id").notNull(), // the ID from that provider
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("user_identities_provider_id").on(t.provider, t.providerId),
]);

export type ForgeUser     = typeof forgeUsersTable.$inferSelect;
export type UserIdentity  = typeof userIdentitiesTable.$inferSelect;
