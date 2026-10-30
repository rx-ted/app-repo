import type { CacheDriver } from './types';

interface SwrEntry<T> {
  data: T;
  freshUntil: number;
}

const inflights = new Map<string, Promise<unknown>>();

export async function cacheableSWR<T>(
  cache: CacheDriver,
  key: string,
  ttl: number,
  staleTtl: number,
  fetch: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const cached = await cache.get<SwrEntry<T>>(key);

  if (cached && now < cached.freshUntil) {
    return cached.data;
  }

  if (cached && now - cached.freshUntil <= staleTtl * 1000) {
    const stale = cached.data;
    if (!inflights.has(key)) {
      const promise = (async () => {
        try {
          const data = await fetch();
          await cache.set(key, { data, freshUntil: Date.now() + ttl * 1000 }, ttl + staleTtl);
          return data;
        } finally {
          inflights.delete(key);
        }
      })();
      inflights.set(key, promise);
    }
    return stale;
  }

  if (!inflights.has(key)) {
    const promise = (async () => {
      try {
        const data = await fetch();
        await cache.set(key, { data, freshUntil: Date.now() + ttl * 1000 }, ttl + staleTtl);
        return data;
      } finally {
        inflights.delete(key);
      }
    })();
    inflights.set(key, promise);
  }

  return (await inflights.get(key)) as T;
}
