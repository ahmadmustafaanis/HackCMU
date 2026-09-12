import type { CacheService } from "shared-types";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/** In-process, single-instance cache. Fine for the hackathon's single-node
 * deployment — a real multi-instance deployment would swap this for a
 * shared store (e.g. Redis) behind the same CacheService interface. */
export class InMemoryCacheService implements CacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}
