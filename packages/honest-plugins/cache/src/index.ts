// Shared
export { CACHE_GLOBAL_KEY, CacheService } from './cache-service';
export type { CacheDriver } from './types';
export { cacheable } from './cacheable';

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
