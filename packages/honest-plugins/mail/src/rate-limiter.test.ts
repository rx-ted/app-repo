import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter, type MailCacheDriver } from './rate-limiter';

describe('RateLimiter', () => {
  let cache: MailCacheDriver & { store: Map<string, number> };
  let limiter: RateLimiter;

  beforeEach(() => {
    cache = {
      store: new Map(),
      async incr(key: string) {
        const next = (this.store.get(key) ?? 0) + 1;
        this.store.set(key, next);
        return next;
      },
      async expire(_key: string, _ttl: number) {
        return true;
      },
      async get(key: string) {
        return this.store.get(key) ?? null;
      },
    };
  });

  describe('with cache', () => {
    it('passes check when quota is not exceeded', async () => {
      limiter = new RateLimiter(5, 'test', cache);
      await expect(limiter.checkAndIncrement()).resolves.toBeUndefined();
    });

    it('throws when quota is exceeded', async () => {
      limiter = new RateLimiter(2, 'test', cache);
      await limiter.checkAndIncrement();
      await limiter.checkAndIncrement();
      await expect(limiter.checkAndIncrement()).rejects.toThrow(/quota exceeded/i);
    });

    it('increments the cache key on each check', async () => {
      limiter = new RateLimiter(10, 'test', cache);
      await limiter.checkAndIncrement();
      await limiter.checkAndIncrement();
      await limiter.checkAndIncrement();
      const key = `mail:quota:test:${new Date().toISOString().slice(0, 10)}`;
      expect(cache.store.get(key)).toBe(3);
    });
  });

  describe('without cache', () => {
    it('always passes when no cache is provided', async () => {
      limiter = new RateLimiter(1, 'test', null);
      await limiter.checkAndIncrement();
      await limiter.checkAndIncrement();
      await limiter.checkAndIncrement();
    });
  });

  describe('health check tracking', () => {
    it('markHealthCheckDone sets a cache key', async () => {
      limiter = new RateLimiter(100, 'test', cache);
      await limiter.markHealthCheckDone();
      const key = `mail:healthcheck:test:${new Date().toISOString().slice(0, 10)}`;
      expect(cache.store.get(key)).toBe(1);
    });

    it('wasHealthCheckDoneToday returns true after marking done', async () => {
      limiter = new RateLimiter(100, 'test', cache);
      await limiter.markHealthCheckDone();
      await expect(limiter.wasHealthCheckDoneToday()).resolves.toBe(true);
    });

    it('wasHealthCheckDoneToday returns false before any check', async () => {
      limiter = new RateLimiter(100, 'test', cache);
      await expect(limiter.wasHealthCheckDoneToday()).resolves.toBe(false);
    });

    it('returns false when no cache', async () => {
      limiter = new RateLimiter(100, 'test', null);
      await expect(limiter.wasHealthCheckDoneToday()).resolves.toBe(false);
    });
  });
});
