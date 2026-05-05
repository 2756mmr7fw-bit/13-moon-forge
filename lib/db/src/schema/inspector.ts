import { pgTable, text, integer, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const inspectorAppsTable = pgTable("inspector_apps", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  loginUrl: text("login_url"),
  username: text("username"),
  usernameField: text("username_field").default("username"),
  passwordField: text("password_field").default("password"),
  loginMethod: text("login_method").default("form"),
  pages: text("pages").array().notNull().default([]),
  viewports: text("viewports").array().default(["desktop"]),
  customAssertions: jsonb("custom_assertions"),
  webhookSecret: text("webhook_secret"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("inspector_apps_user_idx").on(t.userId),
]);

export type InspectorApp = typeof inspectorAppsTable.$inferSelect;

export const inspectorReportsTable = pgTable("inspector_reports", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  appId: text("app_id"),
  appName: text("app_name").notNull(),
  appUrl: text("app_url").notNull(),
  source: text("source").default("cli"),
  status: text("status").default("done"),
  inspectedAt: timestamp("inspected_at").notNull(),
  pagesChecked: integer("pages_checked").default(0),
  errorCount: integer("error_count").default(0),
  warnCount: integer("warn_count").default(0),
  findings: jsonb("findings"),
  screenshots: jsonb("screenshots"),
  consoleErrors: jsonb("console_errors"),
  networkFailures: jsonb("network_failures"),
  performanceMetrics: jsonb("performance_metrics"),
  accessibilityViolations: jsonb("accessibility_violations"),
  visualDiffs: jsonb("visual_diffs"),
  diffData: jsonb("diff_data"),
  quillDoc: text("quill_doc"),
  shareId: text("share_id"),
  recheckOf: text("recheck_of"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("inspector_reports_user_idx").on(t.userId),
  index("inspector_reports_app_idx").on(t.appId),
  index("inspector_reports_share_idx").on(t.shareId),
]);

export type InspectorReport = typeof inspectorReportsTable.$inferSelect;

export const inspectorIssuesTable = pgTable("inspector_issues", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull(),
  userId: text("user_id").notNull(),
  appId: text("app_id"),
  appName: text("app_name").notNull(),
  page: text("page"),
  type: text("type").notNull(),
  message: text("message").notNull(),
  detail: text("detail"),
  status: text("status").default("open"),
  fixedAt: timestamp("fixed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("inspector_issues_user_idx").on(t.userId),
  index("inspector_issues_report_idx").on(t.reportId),
  index("inspector_issues_app_idx").on(t.appId),
]);

export type InspectorIssue = typeof inspectorIssuesTable.$inferSelect;

// Visual regression baselines — approved screenshot snapshots per page × viewport
export const inspectorBaselinesTable = pgTable("inspector_baselines", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  appId: text("app_id").notNull(),
  page: text("page").notNull(),
  viewport: text("viewport").notNull().default("desktop"),
  screenshotHash: text("screenshot_hash"),
  screenshotData: text("screenshot_data"),
  approvedAt: timestamp("approved_at").notNull().defaultNow(),
}, (t) => [
  index("inspector_baselines_app_idx").on(t.appId),
  index("inspector_baselines_lookup_idx").on(t.appId, t.page, t.viewport),
]);

export type InspectorBaseline = typeof inspectorBaselinesTable.$inferSelect;

// Continuous monitoring schedules
export const inspectorSchedulesTable = pgTable("inspector_schedules", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  appId: text("app_id").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  intervalMinutes: integer("interval_minutes").notNull().default(60),
  alertEmail: text("alert_email"),
  alertSlackWebhook: text("alert_slack_webhook"),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("inspector_schedules_user_idx").on(t.userId),
  index("inspector_schedules_app_idx").on(t.appId),
  index("inspector_schedules_next_run_idx").on(t.nextRunAt),
]);

export type InspectorSchedule = typeof inspectorSchedulesTable.$inferSelect;
