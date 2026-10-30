import type { CacheDriver } from './types';

const versionMetaKey = (namespace: string) => `__cache_version__:${namespace}`;

export async function getCacheVersion(cache: CacheDriver, namespace: string): Promise<number> {
  const value = await cache.get<number>(versionMetaKey(namespace));
  return typeof value === 'number' && Number.isFinite(value) ? value : 1;
}

export async function bumpCacheVersion(cache: CacheDriver, namespace: string): Promise<number> {
  const next = (await getCacheVersion(cache, namespace)) + 1;
  await cache.set(versionMetaKey(namespace), next);
  return next;
}

export async function versionedCacheKey(
  cache: CacheDriver,
  namespace: string,
  key: string,
): Promise<string> {
  const version = await getCacheVersion(cache, namespace);
  return `${namespace}:v${version}:${key}`;
}
