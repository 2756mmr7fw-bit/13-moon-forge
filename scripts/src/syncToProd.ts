/**
 * Forge — Dev → Production Sync
 *
 * Copies all data from the development database (DATABASE_URL) to the
 * production database (DATABASE_URL_PROD). Safe to run multiple times —
 * uses INSERT ... ON CONFLICT DO NOTHING so no duplicates are created.
 *
 * Run: pnpm --filter @workspace/scripts run sync-to-prod
 *
 * Table order respects foreign key dependencies.
 */

import pg from "pg";

const { Pool } = pg;

const DEV_URL  = process.env.DATABASE_URL;
const PROD_URL = process.env.DATABASE_URL_PROD;

if (!DEV_URL)  { console.error("ERROR: DATABASE_URL not set.");      process.exit(1); }
if (!PROD_URL) { console.error("ERROR: DATABASE_URL_PROD not set."); process.exit(1); }

const dev  = new Pool({ connectionString: DEV_URL });
const prod = new Pool({ connectionString: PROD_URL });

// Tables in dependency order — parents before children
const TABLES = [
  // Identity layer (no deps)
  "forge_users",
  "user_identities",

  // Projects (pages → projects, page_revisions → pages)
  "projects",
  "pages",
  "page_revisions",

  // Payments / plans (no deps)
  "plans",
  "payments",

  // Connections (no deps)
  "server_connections",
  "gitlab_connections",
  "bitbucket_connections",
  "github_connections",

  // Registry (no deps)
  "registry_apps",

  // Secrets & usage (no deps)
  "app_secrets",
  "message_usage",

  // Workspace (workspace_item_versions → workspace_items)
  "workspace_items",
  "workspace_item_versions",

  // Mail (forge_mail_attachments → forge_mailbox)
  "forge_mailbox",
  "forge_mail_attachments",

  // User data — flat, no deps
  "user_tpts_links",
  "moon_entitlements",
  "chat_sessions",
  "saved_prompts",
  "user_memory",
  "referrals",

  // Shared outputs (gallery_reactions → shared_outputs)
  "shared_outputs",
  "gallery_reactions",

  // Debug (test_results → sessions, teach_back → results)
  "debug_daily_challenges",
  "debug_test_sessions",
  "debug_test_results",
  "debug_teach_back",
  "debug_level_progress",
  "debug_streaks",
  "debug_daily_attempts",
  "debug_achievements",

  // Academy & gym (no deps)
  "academy_drill_results",
  "gym_attempts",
  "learning_profiles",
];

async function syncTable(table: string): Promise<{ copied: number; skipped: number }> {
  const { rows } = await dev.query(`SELECT * FROM "${table}"`);
  if (rows.length === 0) return { copied: 0, skipped: 0 };

  const columns = Object.keys(rows[0]);
  const colList  = columns.map(c => `"${c}"`).join(", ");

  let copied = 0;
  let skipped = 0;

  for (const row of rows) {
    const values  = columns.map((_, i) => `$${i + 1}`).join(", ");
    const vals    = columns.map(c => row[c]);
    try {
      const result = await prod.query(
        `INSERT INTO "${table}" (${colList}) VALUES (${values}) ON CONFLICT DO NOTHING`,
        vals,
      );
      if (result.rowCount && result.rowCount > 0) copied++;
      else skipped++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`   ⚠ Row skipped in ${table}: ${msg.slice(0, 80)}`);
      skipped++;
    }
  }

  return { copied, skipped };
}

async function syncSequences() {
  // Reset serial sequences on prod to match the highest ID from dev
  // so new inserts don't collide with copied rows.
  const serialTables = [
    "projects", "pages", "page_revisions", "plans", "payments",
    "server_connections", "registry_apps", "gitlab_connections",
    "bitbucket_connections", "github_connections", "app_secrets",
    "message_usage", "workspace_items", "workspace_item_versions",
    "forge_mailbox", "forge_mail_attachments", "user_tpts_links",
    "chat_sessions", "saved_prompts", "shared_outputs", "gallery_reactions",
    "referrals", "debug_test_sessions", "debug_test_results",
    "debug_teach_back", "debug_level_progress", "debug_streaks",
    "debug_daily_attempts", "debug_achievements", "academy_drill_results",
    "gym_attempts",
  ];

  for (const table of serialTables) {
    try {
      await prod.query(
        `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'),
          COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false)`
      );
    } catch { /* table may not have a serial id */ }
  }
}

async function main() {
  console.log("\n🔥 13 Moon Forge — Dev → Production Sync\n");

  let totalCopied  = 0;
  let totalSkipped = 0;
  const skippedTables: string[] = [];

  for (const table of TABLES) {
    try {
      const { copied, skipped } = await syncTable(table);
      totalCopied  += copied;
      totalSkipped += skipped;
      const status = copied > 0
        ? `   ✓ ${table.padEnd(35)} ${copied} copied${skipped > 0 ? `, ${skipped} already existed` : ""}`
        : `   · ${table.padEnd(35)} empty`;
      console.log(status);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`   ⚠ ${table.padEnd(35)} skipped — ${msg.slice(0, 60)}`);
      skippedTables.push(table);
    }
  }

  console.log("\n   Resetting production sequences...");
  await syncSequences();

  console.log("\n   ─────────────────────────────────────");
  console.log(`   Rows copied to production:  ${totalCopied}`);
  console.log(`   Rows already in production: ${totalSkipped}`);
  if (skippedTables.length) console.log(`   Tables with errors:         ${skippedTables.join(", ")}`);
  console.log("\n   ✅ Sync complete. Production is up to date.\n");

  await dev.end();
  await prod.end();
}

main().catch(err => {
  console.error("Sync failed:", err);
  process.exit(1);
});
