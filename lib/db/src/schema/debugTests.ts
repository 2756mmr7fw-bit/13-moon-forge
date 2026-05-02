import { pgTable, serial, text, integer, boolean, timestamp, unique, index, jsonb, date } from "drizzle-orm/pg-core";

export const debugTestSessions = pgTable("debug_test_sessions", {
  id:             serial("id").primaryKey(),
  userId:         text("user_id").notNull(),
  level:          integer("level").notNull(),
  mode:           text("mode").notNull().default("level"), // 'level' | 'boss' | 'daily'
  language:       text("language").notNull().default("javascript"),
  startedAt:      timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt:    timestamp("completed_at", { withTimezone: true }),
  totalSeconds:   integer("total_seconds"),
  pausedSeconds:  integer("paused_seconds").notNull().default(0),
  challengeCount: integer("challenge_count").notNull().default(0),
  correctCount:   integer("correct_count").notNull().default(0),
  accuracyPct:    integer("accuracy_pct"),
  qualifies:      boolean("qualifies"),
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
  language:        text("language").notNull().default("javascript"),
  correct:         boolean("correct").notNull(),
  secondsTaken:    integer("seconds_taken").notNull(),
  hintUsed:        boolean("hint_used").notNull().default(false),
  rating:          integer("rating"),
  description:     text("description"),
  brokenCode:      text("broken_code"),
  userFix:         text("user_fix"),
  explanation:     text("explanation"),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  index("debug_results_session_idx").on(t.sessionId),
  index("debug_results_user_wrong_idx").on(t.userId, t.correct),
]);

export const debugLevelProgress = pgTable("debug_level_progress", {
  id:                  serial("id").primaryKey(),
  userId:              text("user_id").notNull(),
  level:               integer("level").notNull(),
  completedSessions:   integer("completed_sessions").notNull().default(0),
  qualifyingSessions:  integer("qualifying_sessions").notNull().default(0),
  bestTotalSeconds:    integer("best_total_seconds"),
  updatedAt:           timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  unique("debug_progress_user_level").on(t.userId, t.level),
]);

export const debugStreaks = pgTable("debug_streaks", {
  id:              serial("id").primaryKey(),
  userId:          text("user_id").notNull().unique(),
  currentStreak:   integer("current_streak").notNull().default(0),
  longestStreak:   integer("longest_streak").notNull().default(0),
  lastActiveDate:  text("last_active_date"), // YYYY-MM-DD
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const debugTeachBack = pgTable("debug_teach_back", {
  id:                  serial("id").primaryKey(),
  resultId:            integer("result_id").references(() => debugTestResults.id, { onDelete: "cascade" }),
  userId:              text("user_id").notNull(),
  studentExplanation:  text("student_explanation").notNull(),
  forgeScore:          integer("forge_score"),
  forgeComment:        text("forge_comment"),
  understood:          boolean("understood"),
  createdAt:           timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  index("teach_back_user_idx").on(t.userId),
]);

export const debugDailyChallenges = pgTable("debug_daily_challenges", {
  id:            serial("id").primaryKey(),
  challengeDate: text("challenge_date").notNull().unique(), // YYYY-MM-DD
  language:      text("language").notNull().default("javascript"),
  bugType:       text("bug_type").notNull(),
  challengeData: jsonb("challenge_data").notNull(),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const debugDailyAttempts = pgTable("debug_daily_attempts", {
  id:            serial("id").primaryKey(),
  userId:        text("user_id").notNull(),
  challengeDate: text("challenge_date").notNull(),
  correct:       boolean("correct"),
  secondsTaken:  integer("seconds_taken"),
  userFix:       text("user_fix"),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  unique("daily_attempt_user_date").on(t.userId, t.challengeDate),
]);

export const debugAchievements = pgTable("debug_achievements", {
  id:            serial("id").primaryKey(),
  userId:        text("user_id").notNull(),
  achievementId: text("achievement_id").notNull(),
  earnedAt:      timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  unique("achievement_user_id").on(t.userId, t.achievementId),
  index("achievement_user_idx").on(t.userId),
]);

export type DebugTestSession     = typeof debugTestSessions.$inferSelect;
export type DebugTestResult      = typeof debugTestResults.$inferSelect;
export type DebugLevelProgress   = typeof debugLevelProgress.$inferSelect;
export type DebugStreak          = typeof debugStreaks.$inferSelect;
export type DebugTeachBack       = typeof debugTeachBack.$inferSelect;
export type DebugDailyChallenge  = typeof debugDailyChallenges.$inferSelect;
export type DebugDailyAttempt    = typeof debugDailyAttempts.$inferSelect;
export type DebugAchievement     = typeof debugAchievements.$inferSelect;
