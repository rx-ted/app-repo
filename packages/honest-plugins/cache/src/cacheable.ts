import type { CacheDriver } from './types';

export async function cacheable<T>(
  cache: CacheDriver,
  key: string,
  ttl: number,
  fetch: () => Promise<T>,
): Promise<T> {
  const cached = await cache.get<T>(key);
  if (cached !== null) return cached;
  const data = await fetch();
  if (data !== null) {
    await cache.set(key, data, ttl);
  }
  return data;
}
