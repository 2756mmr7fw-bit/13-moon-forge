import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";

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

export type ServerConnection = typeof serverConnectionsTable.$inferSelect;
export type RegistryApp = typeof registryAppsTable.$inferSelect;
export type GithubConnection = typeof githubConnectionsTable.$inferSelect;
export type AppSecret = typeof appSecretsTable.$inferSelect;
export type UserApp = typeof userAppsTable.$inferSelect;
