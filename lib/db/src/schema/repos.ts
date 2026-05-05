import { pgTable, serial, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const reposTable = pgTable("repos", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  forgejoRepoId: integer("forgejo_repo_id"),
  forgejoOwner: text("forgejo_owner"),
  forgejoFullName: text("forgejo_full_name"),
  visibility: text("visibility").notNull().default("private"),
  defaultBranch: text("default_branch").notNull().default("main"),
  cloneUrl: text("clone_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("repos_project_id_idx").on(t.projectId),
]);

export const importsTable = pgTable("imports", {
  id: serial("id").primaryKey(),
  repoId: integer("repo_id").references(() => reposTable.id, { onDelete: "cascade" }),
  source: text("source").notNull(), // "github" | "zip" | "replit"
  sourceUrl: text("source_url"),
  sourceRepoName: text("source_repo_name"),
  status: text("status").notNull().default("pending"), // "pending" | "importing" | "done" | "error"
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("imports_repo_id_idx").on(t.repoId),
]);
