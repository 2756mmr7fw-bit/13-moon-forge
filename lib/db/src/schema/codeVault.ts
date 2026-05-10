import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const codeVaultSnapshotsTable = pgTable("code_vault_snapshots", {
  id:            serial("id").primaryKey(),
  userId:        text("user_id").notNull(),
  appName:       text("app_name").notNull(),
  repoFullName:  text("repo_full_name").notNull(),
  branch:        text("branch").notNull().default("main"),
  commitSha:     text("commit_sha"),
  commitMessage: text("commit_message"),
  fileCount:     integer("file_count"),
  sizeBytes:     integer("size_bytes"),
  downloadUrl:   text("download_url"),
  source:        text("source").notNull().default("webhook"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("code_vault_user_id_idx").on(t.userId),
  index("code_vault_app_name_idx").on(t.appName),
]);
