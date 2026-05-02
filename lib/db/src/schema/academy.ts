import { pgTable, serial, text, integer, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const academyDrillResults = pgTable("academy_drill_results", {
  id:            serial("id").primaryKey(),
  userId:        text("user_id").notNull(),
  drillType:     text("drill_type").notNull(), // trace|dry-run|sql|big-o|type-fixer|api|git|log
  difficulty:    text("difficulty").notNull().default("beginner"),
  correct:       boolean("correct").notNull(),
  secondsTaken:  integer("seconds_taken").notNull(),
  hintUsed:      boolean("hint_used").notNull().default(false),
  scenarioData:  jsonb("scenario_data"),
  studentAnswer: text("student_answer"),
  correctAnswer: text("correct_answer"),
  forgeFeedback: text("forge_feedback"),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  index("academy_results_user_idx").on(t.userId),
  index("academy_results_user_type_idx").on(t.userId, t.drillType),
  index("academy_results_user_date_idx").on(t.userId, t.createdAt),
]);

export type AcademyDrillResult = typeof academyDrillResults.$inferSelect;
