/**
 * Forge Database Backup
 *
 * Exports every table as newline-delimited JSON to ./backups/<timestamp>.json
 * Run: pnpm --filter @workspace/scripts run backup
 *
 * Each backup file is self-contained — it can be used to restore any table
 * into a new database (dev or prod) without needing pg_dump installed.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

const TABLES = [
  "forge_users",
  "user_identities",
  "projects",
  "pages",
  "page_revisions",
  "plans",
  "payments",
  "server_connections",
  "registry_apps",
  "gitlab_connections",
  "bitbucket_connections",
  "github_connections",
  "app_secrets",
  "message_usage",
  "workspace_items",
  "workspace_item_versions",
  "mailbox",
  "forge_mailbox",
  "forge_mail_attachments",
  "user_tpts_links",
  "moon_entitlements",
  "chat_sessions",
  "saved_prompts",
  "shared_outputs",
  "gallery_reactions",
  "user_memory",
  "referrals",
  "debug_test_sessions",
  "debug_test_results",
  "debug_level_progress",
  "debug_streaks",
  "debug_teach_back",
  "debug_daily_challenges",
  "debug_daily_attempts",
  "debug_achievements",
  "academy_drill_results",
  "gym_attempts",
  "learning_profiles",
];

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const backupDir = path.join(__dirname, "../../backups");
  fs.mkdirSync(backupDir, { recursive: true });

  const outPath = path.join(backupDir, `backup-${timestamp}.json`);
  const backup: Record<string, unknown[]> = {};

  let totalRows = 0;
  const skipped: string[] = [];

  console.log(`\n🔥 13 Moon Forge — Database Backup`);
  console.log(`   Target: ${outPath}\n`);

  for (const table of TABLES) {
    try {
      const result = await pool.query(`SELECT * FROM "${table}"`);
      backup[table] = result.rows;
      totalRows += result.rows.length;
      console.log(`   ✓ ${table.padEnd(35)} ${result.rows.length} rows`);
    } catch {
      skipped.push(table);
      console.log(`   ⚠ ${table.padEnd(35)} (skipped — table may not exist yet)`);
    }
  }

  backup["_meta"] = [{
    backedUpAt: new Date().toISOString(),
    totalRows,
    skipped,
    source: DATABASE_URL!.split("@")[1] ?? "unknown host",
  }];

  fs.writeFileSync(outPath, JSON.stringify(backup, null, 2), "utf-8");

  console.log(`\n   ─────────────────────────────────────`);
  console.log(`   Total rows backed up: ${totalRows}`);
  if (skipped.length) console.log(`   Skipped tables:       ${skipped.join(", ")}`);
  console.log(`   Saved to:             ${outPath}`);
  console.log(`\n   ✅ Backup complete.\n`);

  await pool.end();
}

backup().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
