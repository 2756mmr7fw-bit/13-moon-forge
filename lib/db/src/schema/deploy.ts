import { pgTable, text, serial, timestamp, boolean, integer, real } from "drizzle-orm/pg-core";

export const serverConnectionsTable = pgTable("server_connections", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull().default("My Server"),
  coolifyUrl: text("coolify_url").notNull(),
  coolifyApiKey: text("coolify_api_key").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const registryAppsTable = pgTable("registry_apps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  stack: text("stack").notNull(),
  githubUrl: text("github_url"),
  dockerImage: text("docker_image"),
  submittedByUserId: text("submitted_by_user_id").notNull(),
  submittedByName: text("submitted_by_name"),
  status: text("status").notNull().default("pending"),
  sovereignCertified: boolean("sovereign_certified").notNull().default(false),
  minRam: integer("min_ram").notNull().default(2),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const gitlabConnectionsTable = pgTable("gitlab_connections", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  username: text("username").notNull(),
  avatarUrl: text("avatar_url"),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
});

export const bitbucketConnectionsTable = pgTable("bitbucket_connections", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  bbUsername: text("bb_username").notNull(),
  appPassword: text("app_password").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
});

export const githubConnectionsTable = pgTable("github_connections", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  username: text("username").notNull(),
  avatarUrl: text("avatar_url"),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
});

export const appSecretsTable = pgTable("app_secrets", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  appName: text("app_name").notNull().default("Default"),
  serviceName: text("service_name").notNull(),
  keyName: text("key_name").notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userAppsTable = pgTable("user_apps", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  githubRepo: text("github_repo"),
  githubBranch: text("github_branch").notNull().default("main"),
  dockerImage: text("docker_image"),
  stack: text("stack").notNull().default("auto"),
  coolifyResourceId: text("coolify_resource_id"),
  coolifyResourceType: text("coolify_resource_type").notNull().default("application"),
  status: text("status").notNull().default("deploying"),
  url: text("url"),
  port: integer("port").notNull().default(3000),
  customDomain: text("custom_domain"),
  autoDeployEnabled: boolean("auto_deploy_enabled").notNull().default(false),
  webhookSecret: text("webhook_secret"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userDatabasesTable = pgTable("user_databases", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  appId: integer("app_id"),
  coolifyResourceId: text("coolify_resource_id"),
  dbUser: text("db_user").notNull().default("forge"),
  dbName: text("db_name").notNull(),
  dbPassword: text("db_password").notNull(),
  internalHost: text("internal_host"),
  port: integer("port").notNull().default(5432),
  status: text("status").notNull().default("provisioning"),
  connectionString: text("connection_string"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const cliTokensTable = pgTable("cli_tokens", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  token: text("token").notNull().unique(),
  name: text("name").notNull().default("CLI"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── A: Uptime Monitoring ─────────────────────────────────────────────────────

export const uptimeMonitorsTable = pgTable("uptime_monitors", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  appId: integer("app_id"),
  name: text("name").notNull(),
  url: text("url").notNull(),
  method: text("method").notNull().default("GET"),
  intervalSeconds: integer("interval_seconds").notNull().default(60),
  timeoutMs: integer("timeout_ms").notNull().default(10000),
  expectedStatus: integer("expected_status").notNull().default(200),
  alertEmail: text("alert_email"),
  alertOnDown: boolean("alert_on_down").notNull().default(true),
  paused: boolean("paused").notNull().default(false),
  status: text("status").notNull().default("unknown"), // up | down | unknown
  lastCheckedAt: timestamp("last_checked_at"),
  uptimePercent: real("uptime_percent"),
  avgResponseMs: integer("avg_response_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const uptimeChecksTable = pgTable("uptime_checks", {
  id: serial("id").primaryKey(),
  monitorId: integer("monitor_id").notNull(),
  status: text("status").notNull(), // up | down | timeout | error
  responseMs: integer("response_ms"),
  statusCode: integer("status_code"),
  error: text("error"),
  checkedAt: timestamp("checked_at").notNull().defaultNow(),
});

// ─── B: Object Storage ────────────────────────────────────────────────────────

export const userBucketsTable = pgTable("user_buckets", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  coolifyResourceId: text("coolify_resource_id"),
  accessKey: text("access_key"),
  secretKey: text("secret_key"),
  endpoint: text("endpoint"),
  publicUrl: text("public_url"),
  region: text("region").notNull().default("us-east-1"),
  status: text("status").notNull().default("provisioning"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── C: Email API ─────────────────────────────────────────────────────────────

export const emailApiKeysTable = pgTable("email_api_keys", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull().default("Default"),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  fromDomain: text("from_domain"),
  dailyLimit: integer("daily_limit").notNull().default(1000),
  monthlyLimit: integer("monthly_limit").notNull().default(10000),
  sendsToday: integer("sends_today").notNull().default(0),
  sendsThisMonth: integer("sends_this_month").notNull().default(0),
  lastResetDay: text("last_reset_day"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailSendsTable = pgTable("email_sends", {
  id: serial("id").primaryKey(),
  apiKeyId: integer("api_key_id").notNull(),
  userId: text("user_id").notNull(),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  subject: text("subject").notNull(),
  provider: text("provider").notNull().default("resend"),
  providerId: text("provider_id"),
  status: text("status").notNull().default("sent"), // sent | failed | bounced
  error: text("error"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

// ─── D: AI Gateway ────────────────────────────────────────────────────────────

export const aiApiKeysTable = pgTable("ai_api_keys", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull().default("Default"),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  monthlyTokenLimit: integer("monthly_token_limit").notNull().default(1000000),
  tokensUsedThisMonth: integer("tokens_used_this_month").notNull().default(0),
  lastResetMonth: text("last_reset_month"),
  allowedModels: text("allowed_models").notNull().default("*"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiUsageTable = pgTable("ai_usage", {
  id: serial("id").primaryKey(),
  apiKeyId: integer("api_key_id").notNull(),
  userId: text("user_id").notNull(),
  model: text("model").notNull(),
  provider: text("provider").notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  latencyMs: integer("latency_ms"),
  status: text("status").notNull().default("success"),
  error: text("error"),
  usedAt: timestamp("used_at").notNull().defaultNow(),
});

// ─── E: Marketplace ───────────────────────────────────────────────────────────

export const marketplaceInstallsTable = pgTable("marketplace_installs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  appSlug: text("app_slug").notNull(),
  appName: text("app_name").notNull(),
  coolifyResourceId: text("coolify_resource_id"),
  subdomain: text("subdomain").notNull().unique(),
  url: text("url"),
  status: text("status").notNull().default("installing"),
  adminEmail: text("admin_email"),
  adminPassword: text("admin_password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ServerConnection     = typeof serverConnectionsTable.$inferSelect;
export type RegistryApp          = typeof registryAppsTable.$inferSelect;
export type GithubConnection     = typeof githubConnectionsTable.$inferSelect;
export type AppSecret            = typeof appSecretsTable.$inferSelect;
export type UserApp              = typeof userAppsTable.$inferSelect;
export type UserDatabase         = typeof userDatabasesTable.$inferSelect;
export type CliToken             = typeof cliTokensTable.$inferSelect;
export type UptimeMonitor        = typeof uptimeMonitorsTable.$inferSelect;
export type UptimeCheck          = typeof uptimeChecksTable.$inferSelect;
export type UserBucket           = typeof userBucketsTable.$inferSelect;
export type EmailApiKey          = typeof emailApiKeysTable.$inferSelect;
export type EmailSend            = typeof emailSendsTable.$inferSelect;
export type AiApiKey             = typeof aiApiKeysTable.$inferSelect;
export type AiUsage              = typeof aiUsageTable.$inferSelect;
export type MarketplaceInstall   = typeof marketplaceInstallsTable.$inferSelect;
