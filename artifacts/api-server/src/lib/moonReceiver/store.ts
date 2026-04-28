import type { EntitlementRecord } from "./types";

export interface EntitlementStore {
  get(userId: string): Promise<EntitlementRecord | null>;
  upsert(record: EntitlementRecord): Promise<void>;
  clear(userId: string): Promise<void>;
}

// In-memory fallback — loses state on restart.
// The DrizzleEntitlementStore is used in production.
export class InMemoryEntitlementStore implements EntitlementStore {
  private readonly data = new Map<string, EntitlementRecord>();

  async get(userId: string): Promise<EntitlementRecord | null> {
    return this.data.get(userId) ?? null;
  }

  async upsert(record: EntitlementRecord): Promise<void> {
    this.data.set(record.userId, record);
  }

  async clear(userId: string): Promise<void> {
    this.data.delete(userId);
  }
}
