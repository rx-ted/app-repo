import type { CacheDriver } from './types';

const tagIndexKey = (tag: string) => `__cache_tag__:${tag}`;

export async function setWithTags<T>(
  cache: CacheDriver,
  key: string,
  value: T,
  tags: string[],
  ttl: number,
): Promise<void> {
  await cache.set(key, value, ttl);
  for (const tag of tags) {
    const existing = (await cache.get<string[]>(tagIndexKey(tag))) ?? [];
    if (!existing.includes(key)) {
      await cache.set(tagIndexKey(tag), [...existing, key], ttl);
    }
  }
}

export async function invalidateTag(cache: CacheDriver, tag: string): Promise<number> {
  const keys = (await cache.get<string[]>(tagIndexKey(tag))) ?? [];
  await Promise.all(keys.map((key) => cache.delete(key)));
  await cache.delete(tagIndexKey(tag));
  return keys.length;
}

export async function invalidateTags(cache: CacheDriver, tags: string[]): Promise<number> {
  let total = 0;
  for (const tag of tags) {
    total += await invalidateTag(cache, tag);
  }
  return total;
}

export async function cacheableTagged<T>(
  cache: CacheDriver,
  key: string,
  ttl: number,
  tags: string[],
  fetch: () => Promise<T>,
): Promise<T> {
  const cached = await cache.get<T>(key);
  if (cached !== null) return cached;
  const data = await fetch();
  if (data !== null) {
    await setWithTags(cache, key, data, tags, ttl);
  }
  return data;
}
