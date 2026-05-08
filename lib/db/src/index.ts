import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// In production use the Neon DB (DATABASE_URL_PROD); fall back to DATABASE_URL for dev
// Use || (not ??) so that empty strings also trigger the fallback
const connectionString =
  (process.env.NODE_ENV === "production"
    ? process.env.DATABASE_URL_PROD || process.env.DATABASE_URL
    : process.env.DATABASE_URL || process.env.DATABASE_URL_PROD) || "";

if (!connectionString) {
  // Log a warning but don't crash — the server can still serve static files,
  // healthz, and unauthenticated routes.  DB-backed routes will return errors.
  console.warn(
    "[db] WARNING: No database URL found. Set DATABASE_URL (dev) or " +
    "DATABASE_URL_PROD (production). DB operations will fail until this is fixed.",
  );
}

export const pool = new Pool({
  connectionString: connectionString || "postgres://localhost/forge",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// CRITICAL: Without this handler, idle-connection errors from Neon (which closes
// connections after a period of inactivity) emit an unhandled 'error' event that
// crashes the Node.js process. pg.Pool inherits from EventEmitter — any 'error'
// event with no listener is a fatal uncaught exception.
pool.on("error", (err) => {
  console.error("[db] Pool idle client error (non-fatal):", err.message);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
