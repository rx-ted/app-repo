import type { CacheDriver } from './types';

const inflights = new Map<string, Promise<unknown>>();

export async function cacheable<T>(
  cache: CacheDriver,
  key: string,
  ttl: number,
  fetch: () => Promise<T>,
): Promise<T> {
  const cached = await cache.get<T>(key);
  if (cached !== null) return cached;

  let promise = inflights.get(key);
  if (!promise) {
    promise = (async () => {
      try {
        const data = await fetch();
        if (data !== null) {
          await cache.set(key, data, ttl);
        }
        return data;
      } finally {
        inflights.delete(key);
      }
    })();
    inflights.set(key, promise);
  }

  return promise as Promise<T>;
}
