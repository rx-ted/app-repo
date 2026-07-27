import { describe, it, expect } from 'vitest';
import * as plugin from './index';

describe('plugin barrel exports', () => {
  it('exports CACHE_GLOBAL_KEY', () => {
    expect(plugin.CACHE_GLOBAL_KEY).toBe('app:cache');
  });

  it('exports CacheService (class)', () => {
    expect(plugin.CacheService).toBeDefined();
    expect(typeof plugin.CacheService).toBe('function');
  });

  it('exports types through namespaces', () => {
    expect(typeof plugin.redis.createRedisDriver).toBe('function');
    expect(typeof plugin.cloudflare.createCloudflareKvDriver).toBe('function');
  });

  it('exports cacheable (function)', () => {
    expect(plugin.cacheable).toBeDefined();
    expect(typeof plugin.cacheable).toBe('function');
  });

  describe('redis exports', () => {
    it('exports RedisPlugin', () => {
      expect(plugin.RedisPlugin).toBeDefined();
      expect(typeof plugin.RedisPlugin).toBe('function');
    });

    it('exports redis namespace', () => {
      expect(plugin.redis).toBeDefined();
      expect(plugin.redis.RedisPlugin).toBeDefined();
      expect(plugin.redis.createRedisDriver).toBeDefined();
    });

    it('exports REDIS_CONTEXT_KEY and REDIS_GLOBAL_KEY', () => {
      expect(plugin.REDIS_CONTEXT_KEY).toBe('honest:redis');
      expect(plugin.REDIS_GLOBAL_KEY).toBe('redis');
    });

    it('exports createRedisDriver (async function)', () => {
      expect(plugin.createRedisDriver).toBeDefined();
      expect(typeof plugin.createRedisDriver).toBe('function');
    });
  });

  describe('cloudflare exports', () => {
    it('exports CloudflareKvPlugin', () => {
      expect(plugin.CloudflareKvPlugin).toBeDefined();
      expect(typeof plugin.CloudflareKvPlugin).toBe('function');
    });

    it('exports cloudflare namespace', () => {
      expect(plugin.cloudflare).toBeDefined();
      expect(plugin.cloudflare.CloudflareKvPlugin).toBeDefined();
      expect(plugin.cloudflare.createCloudflareKvDriver).toBeDefined();
    });

    it('exports CLOUDFLARE_KV_CONTEXT_KEY', () => {
      expect(plugin.CLOUDFLARE_KV_CONTEXT_KEY).toBe('honest:cloudflare-kv');
    });

    it('exports createCloudflareKvDriver (function)', () => {
      expect(plugin.createCloudflareKvDriver).toBeDefined();
      expect(typeof plugin.createCloudflareKvDriver).toBe('function');
    });
  });
});
