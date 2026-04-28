import { db, moonEntitlements } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { EntitlementStore } from "./store";
import type { EntitlementRecord } from "./types";

/**
 * Postgres-backed entitlement store using the shared Drizzle instance.
 * Survives server restarts — preferred over InMemoryEntitlementStore.
 */
export class DrizzleEntitlementStore implements EntitlementStore {
  async get(userId: string): Promise<EntitlementRecord | null> {
    const [row] = await db
      .select()
      .from(moonEntitlements)
      .where(eq(moonEntitlements.userId, userId))
      .limit(1);

    if (!row) return null;

    return {
      userId: row.userId,
      moons: row.moons ?? [],
      isActive: row.isActive,
      messagesRemaining: row.messagesRemaining ?? undefined,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async upsert(record: EntitlementRecord): Promise<void> {
    await db
      .insert(moonEntitlements)
      .values({
        userId:            record.userId,
        moons:             record.moons,
        isActive:          record.isActive,
        messagesRemaining: record.messagesRemaining ?? null,
        expiresAt:         record.expiresAt ? new Date(record.expiresAt) : null,
        updatedAt:         new Date(record.updatedAt),
      })
      .onConflictDoUpdate({
        target: moonEntitlements.userId,
        set: {
          moons:             record.moons,
          isActive:          record.isActive,
          messagesRemaining: record.messagesRemaining ?? null,
          expiresAt:         record.expiresAt ? new Date(record.expiresAt) : null,
          updatedAt:         new Date(record.updatedAt),
        },
      });
  }

  async clear(userId: string): Promise<void> {
    await db
      .update(moonEntitlements)
      .set({
        isActive:          false,
        moons:             [],
        messagesRemaining: null,
        expiresAt:         null,
        updatedAt:         new Date(),
      })
      .where(eq(moonEntitlements.userId, userId));
  }
}
