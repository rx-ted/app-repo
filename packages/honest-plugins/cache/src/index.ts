// Shared
export { CACHE_GLOBAL_KEY, CacheService } from './cache-service';
export type { CacheDriver } from './types';
export { cacheable } from './cacheable';
export { cacheableSWR } from './swr';
export {
  getCacheVersion,
  bumpCacheVersion,
  versionedCacheKey,
} from './versioned';
export {
  setWithTags,
  invalidateTag,
  invalidateTags,
  cacheableTagged,
} from './tags';

// Auto-detect cache plugin (recommended)
export { CachePlugin, findKvBinding, resolveBinding } from './resolve';
export type { CachePluginOptions } from './resolve';

// Redis driver
export * from './redis';
export * as redis from './redis';

// Cloudflare KV driver
export * from './cloudflare';
export * as cloudflare from './cloudflare';

// Local in-memory driver (dev)
export * from './local';
export * as local from './local';
