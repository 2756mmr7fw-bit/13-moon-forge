import { pgTable, serial, text, timestamp, pgEnum, unique, index } from "drizzle-orm/pg-core";

export const teamRoleEnum = pgEnum("team_role", ["owner", "editor", "viewer"]);
export const memberStatusEnum = pgEnum("member_status", ["pending", "active"]);

export const teamMembersTable = pgTable("team_members", {
  id:        serial("id").primaryKey(),
  ownerId:   text("owner_id").notNull(),
  email:     text("email").notNull(),
  role:      teamRoleEnum("role").notNull().default("viewer"),
  status:    memberStatusEnum("status").notNull().default("pending"),
  joinedAt:  timestamp("joined_at").notNull().defaultNow(),
}, (t) => [
  unique("team_members_owner_email").on(t.ownerId, t.email),
  index("team_members_owner_idx").on(t.ownerId),
]);
