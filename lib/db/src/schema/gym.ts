import { pgTable, serial, text, integer, boolean, timestamp, jsonb, real, index } from "drizzle-orm/pg-core";

export const gymAttempts = pgTable("gym_attempts", {
  id:               serial("id").primaryKey(),
  userId:           text("user_id").notNull(),
  exerciseId:       text("exercise_id").notNull(),
  tier:             integer("tier").notNull(),
  category:         text("category").notNull(),
  passed:           boolean("passed").notNull(),
  testsPassed:      integer("tests_passed").notNull().default(0),
  testsTotal:       integer("tests_total").notNull().default(0),
  runsBeforePass:   integer("runs_before_pass").notNull().default(1),
  timeToFirstEditMs: integer("time_to_first_edit_ms"),   // read time before coding
  timeTakenMs:      integer("time_taken_ms").notNull(),
  hintsUsed:        integer("hints_used").notNull().default(0),
  viewedSolution:   boolean("viewed_solution").notNull().default(false),
  studentCode:      text("student_code"),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  index("gym_attempts_user_idx").on(t.userId),
  index("gym_attempts_user_ex_idx").on(t.userId, t.exerciseId),
]);

// Computed and cached learning profile per user
export const learningProfiles = pgTable("learning_profiles", {
  userId:           text("user_id").primaryKey(),
  dominantStyle:    text("dominant_style"),   // visual|hands-on|conceptual|pattern
  visualScore:      real("visual_score").notNull().default(0),
  handsOnScore:     real("hands_on_score").notNull().default(0),
  conceptualScore:  real("conceptual_score").notNull().default(0),
  patternScore:     real("pattern_score").notNull().default(0),
  totalAttempts:    integer("total_attempts").notNull().default(0),
  strongestCategory: text("strongest_category"),
  weakestCategory:  text("weakest_category"),
  lastUpdated:      timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(),
});

export type GymAttempt      = typeof gymAttempts.$inferSelect;
export type LearningProfile = typeof learningProfiles.$inferSelect;
