import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { getAuth } from "@clerk/express";
import { db, forgeUsersTable, userIdentitiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

// ─── In-memory cache ──────────────────────────────────────────────────────────
// Avoids a DB round-trip on every request for known Clerk → forge mappings.
// Cache is keyed by Clerk user ID. Entries survive for 10 minutes then refresh.
const identityCache = new Map<string, { forgeUserId: string; cachedAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

async function resolveForgeUserId(clerkUserId: string): Promise<string> {
  const cached = identityCache.get(clerkUserId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.forgeUserId;
  }

  // Look up existing identity mapping
  const [identity] = await db
    .select({ forgeUserId: userIdentitiesTable.forgeUserId })
    .from(userIdentitiesTable)
    .where(
      and(
        eq(userIdentitiesTable.provider, "clerk"),
        eq(userIdentitiesTable.providerId, clerkUserId),
      ),
    )
    .limit(1);

  if (identity) {
    identityCache.set(clerkUserId, { forgeUserId: identity.forgeUserId, cachedAt: Date.now() });
    return identity.forgeUserId;
  }

  // First time this Clerk user has hit the API — create their forge identity.
  // We use the Clerk ID as the forge user ID so ALL existing data rows
  // (chat sessions, projects, prompts, etc.) continue to match without
  // any data migration.
  await db.insert(forgeUsersTable).values({
    id:        clerkUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).onConflictDoNothing();

  await db.insert(userIdentitiesTable).values({
    id:          randomUUID(),
    forgeUserId: clerkUserId,
    provider:    "clerk",
    providerId:  clerkUserId,
    createdAt:   new Date(),
  }).onConflictDoNothing();

  identityCache.set(clerkUserId, { forgeUserId: clerkUserId, cachedAt: Date.now() });
  return clerkUserId;
}

/**
 * Sets req.userId from (in priority order):
 * 1. Clerk session → resolved to forge_user_id via identity mapping table
 * 2. x-user-id header — anonymous persistent UUID from localStorage
 * 3. Generated anon UUID — short-lived fallback (not persisted)
 *
 * The forge_user_id is your internal canonical ID. It stays the same even
 * when you switch auth providers — just add a new row to user_identities.
 */
export async function userIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  const clerkAuth = getAuth(req);

  if (clerkAuth?.userId) {
    try {
      req.userId = await resolveForgeUserId(clerkAuth.userId);
    } catch {
      // If the DB lookup fails, fall back to the raw Clerk ID so the app
      // stays functional. The identity row will be created next request.
      req.userId = clerkAuth.userId;
    }
    return next();
  }

  const headerUserId = req.headers["x-user-id"];
  req.userId = typeof headerUserId === "string" && headerUserId.trim()
    ? headerUserId.trim()
    : `anon-${randomUUID()}`;
  next();
}
