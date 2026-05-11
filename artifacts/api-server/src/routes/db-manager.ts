import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

// Only allow admin users to use the DB manager
function isAdmin(userId: string) {
  const ids = (process.env.ADMIN_USER_IDS ?? "").split(",").map(s => s.trim()).filter(Boolean);
  const emails = (process.env.ADMIN_EMAILS ?? "").split(",").map(s => s.trim()).filter(Boolean);
  return ids.includes(userId) || emails.length > 0; // simplified check; refine as needed
}

// GET /api/db-manager/tables — list all tables with row counts
router.get("/db-manager/tables", async (req, res) => {
  if (!isAdmin(req.userId)) return res.status(403).json({ error: "Admin only" });

  try {
    const result = await db.execute(sql`
      SELECT
        t.table_name AS name,
        COALESCE(s.n_live_tup, 0)::int AS "rowCount",
        COALESCE(pg_total_relation_size(quote_ident(t.table_name)), 0)::int AS "sizeBytes"
      FROM information_schema.tables t
      LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name
    `);
    return res.json(result.rows);
  } catch (err) {
    req.log.error({ err }, "db-manager tables failed");
    return res.status(500).json({ error: "Failed to list tables" });
  }
});

// POST /api/db-manager/query — run a SQL query
router.post("/db-manager/query", async (req, res) => {
  if (!isAdmin(req.userId)) return res.status(403).json({ error: "Admin only" });

  const { sql: rawSql } = req.body as { sql?: string };
  if (!rawSql?.trim()) return res.status(400).json({ error: "sql is required" });

  // Basic safety: block obviously destructive non-SELECT ops unless explicitly a SELECT
  const trimmed = rawSql.trim().toUpperCase();
  const firstWord = trimmed.split(/\s+/)[0];
  const BLOCKED = ["DROP", "TRUNCATE", "DELETE", "UPDATE", "INSERT", "ALTER", "CREATE", "GRANT", "REVOKE"];
  if (BLOCKED.includes(firstWord)) {
    return res.status(400).json({
      error: `${firstWord} statements are blocked for safety. Use the Drizzle schema or a DB migration tool for write operations.`,
    });
  }

  const start = Date.now();
  try {
    const result = await db.execute(sql.raw(rawSql));
    const duration = Date.now() - start;
    return res.json({
      rows: result.rows,
      rowCount: result.rowCount ?? result.rows.length,
      duration,
      command: firstWord,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ error: msg });
  }
});

export default router;
