import { pgTable, serial, text, integer, boolean, timestamp, unique, index } from "drizzle-orm/pg-core";

export const debugTestSessions = pgTable("debug_test_sessions", {
  id:             serial("id").primaryKey(),
  userId:         text("user_id").notNull(),
  level:          integer("level").notNull(),
  mode:           text("mode").notNull().default("level"),
  startedAt:      timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt:    timestamp("completed_at", { withTimezone: true }),
  totalSeconds:   integer("total_seconds"),
  challengeCount: integer("challenge_count").notNull().default(0),
  correctCount:   integer("correct_count").notNull().default(0),
}, t => [
  index("debug_sessions_user_idx").on(t.userId),
  index("debug_sessions_user_level_idx").on(t.userId, t.level),
]);

export const debugTestResults = pgTable("debug_test_results", {
  id:              serial("id").primaryKey(),
  sessionId:       integer("session_id").notNull().references(() => debugTestSessions.id, { onDelete: "cascade" }),
  userId:          text("user_id").notNull(),
  challengeLevel:  integer("challenge_level").notNull(),
  bugType:         text("bug_type").notNull(),
  correct:         boolean("correct").notNull(),
  secondsTaken:    integer("seconds_taken").notNull(),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  index("debug_results_session_idx").on(t.sessionId),
]);

export const debugLevelProgress = pgTable("debug_level_progress", {
  id:                serial("id").primaryKey(),
  userId:            text("user_id").notNull(),
  level:             integer("level").notNull(),
  completedSessions: integer("completed_sessions").notNull().default(0),
  bestTotalSeconds:  integer("best_total_seconds"),
  updatedAt:         timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  unique("debug_progress_user_level").on(t.userId, t.level),
]);

export type DebugTestSession  = typeof debugTestSessions.$inferSelect;
export type DebugTestResult   = typeof debugTestResults.$inferSelect;
export type DebugLevelProgress = typeof debugLevelProgress.$inferSelect;
