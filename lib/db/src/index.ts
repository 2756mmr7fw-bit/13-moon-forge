import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// In production use the Neon DB (DATABASE_URL_PROD); fall back to DATABASE_URL for dev
const connectionString =
  (process.env.NODE_ENV === "production"
    ? process.env.DATABASE_URL_PROD ?? process.env.DATABASE_URL
    : process.env.DATABASE_URL ?? process.env.DATABASE_URL_PROD) ?? "";

if (!connectionString) {
  throw new Error(
    "No database URL found. Set DATABASE_URL (dev) or DATABASE_URL_PROD (production).",
  );
}

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
