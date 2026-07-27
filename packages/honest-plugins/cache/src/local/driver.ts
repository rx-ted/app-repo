import type { CacheDriver } from '../types';

interface CacheEntry {
  value: unknown;
  expiresAt: number | null;
}

export function createLocalCacheDriver(): CacheDriver {
  const store = new Map<string, CacheEntry>();

  function isExpired(entry: CacheEntry): boolean {
    return entry.expiresAt !== null && Date.now() > entry.expiresAt;
  }

  function prune(): void {
    for (const [key, entry] of store) {
      if (isExpired(entry)) store.delete(key);
    }
  }

  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = store.get(key);
      if (!entry || isExpired(entry)) {
        store.delete(key);
        return null;
      }
      return entry.value as T;
    },

    async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
      store.set(key, {
        value,
        expiresAt: ttl ? Date.now() + ttl * 1000 : null,
      });
      return true;
    },

    async delete(key: string): Promise<boolean> {
      return store.delete(key);
    },

    async exists(key: string): Promise<boolean> {
      const entry = store.get(key);
      if (!entry || isExpired(entry)) {
        store.delete(key);
        return false;
      }
      return true;
    },

    async mget<T>(keys: string[]): Promise<(T | null)[]> {
      return keys.map((key) => {
        const entry = store.get(key);
        if (!entry || isExpired(entry)) {
          store.delete(key);
          return null;
        }
        return entry.value as T;
      });
    },

    async mset(items: Array<{ key: string; value: unknown; ttl?: number }>): Promise<boolean> {
      for (const item of items) {
        store.set(item.key, {
          value: item.value,
          expiresAt: item.ttl ? Date.now() + item.ttl * 1000 : null,
        });
      }
      return true;
    },

    async deleteByPattern(pattern: string): Promise<number> {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      let count = 0;
      for (const key of store.keys()) {
        if (regex.test(key)) {
          store.delete(key);
          count++;
        }
      }
      return count;
    },

    async incr(key: string): Promise<number> {
      const entry = store.get(key);
      const current = entry && !isExpired(entry) ? (entry.value as number) : 0;
      const next = current + 1;
      store.set(key, { value: next, expiresAt: null });
      return next;
    },

    async decr(key: string): Promise<number> {
      const entry = store.get(key);
      const current = entry && !isExpired(entry) ? (entry.value as number) : 0;
      const next = current - 1;
      store.set(key, { value: next, expiresAt: null });
      return next;
    },

    async expire(key: string, ttl: number): Promise<boolean> {
      const entry = store.get(key);
      if (!entry) return false;
      entry.expiresAt = Date.now() + ttl * 1000;
      return true;
    },

    async close(): Promise<void> {
      store.clear();
    },

    async healthCheck(): Promise<boolean> {
      prune();
      return true;
    },
  };
}
