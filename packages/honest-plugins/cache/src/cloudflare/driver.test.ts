import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCloudflareKvDriver } from './driver';
import type { CacheDriver } from '../types';

function mockKvNamespace() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string, _options?: { cacheTtl?: number }) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    list: vi.fn(async (opts?: { prefix?: string }) => {
      const prefix = opts?.prefix ?? '';
      const keys = [...store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name }));
      return { keys, list_complete: true, cacheStatus: null };
    }),
  };
}

describe('CloudflareKvDriver', () => {
  let driver: CacheDriver;

  beforeEach(() => {
    driver = createCloudflareKvDriver(mockKvNamespace());
  });

  describe('get/set', () => {
    it('returns null for missing key', async () => {
      const result = await driver.get('missing');
      expect(result).toBeNull();
    });

    it('stores and retrieves a value', async () => {
      await driver.set('foo', { hello: 'world' });
      const result = await driver.get('foo');
      expect(result).toEqual({ hello: 'world' });
    });

    it('stores with ttl', async () => {
      const result = await driver.set('bar', 'value', 60);
      expect(result).toBe(true);
    });

    it('retrieves string values', async () => {
      await driver.set('str', 'plain-string');
      const result = await driver.get<string>('str');
      expect(result).toBe('plain-string');
    });

    it('retrieves numeric values', async () => {
      await driver.set('num', 42);
      const result = await driver.get<number>('num');
      expect(result).toBe(42);
    });
  });

  describe('delete', () => {
    it('deletes an existing key', async () => {
      await driver.set('tmp', 'value');
      const result = await driver.delete('tmp');
      expect(result).toBe(true);
      const got = await driver.get('tmp');
      expect(got).toBeNull();
    });

    it('returns true even when key does not exist', async () => {
      const result = await driver.delete('nonexistent');
      expect(result).toBe(true);
    });
  });

  describe('exists', () => {
    it('returns true for existing key', async () => {
      await driver.set('present', 'yes');
      const result = await driver.exists('present');
      expect(result).toBe(true);
    });

    it('returns false for missing key', async () => {
      const result = await driver.exists('absent');
      expect(result).toBe(false);
    });
  });

  describe('mget', () => {
    it('returns values for multiple keys', async () => {
      await driver.set('a', 1);
      await driver.set('b', 2);
      const result = await driver.mget(['a', 'b', 'c']);
      expect(result).toEqual([1, 2, null]);
    });
  });

  describe('mset', () => {
    it('sets multiple items', async () => {
      const result = await driver.mset([
        { key: 'x', value: 10 },
        { key: 'y', value: 20, ttl: 60 },
      ]);
      expect(result).toBe(true);
      expect(await driver.get('x')).toBe(10);
      expect(await driver.get('y')).toBe(20);
    });
  });

  describe('deleteByPattern', () => {
    it('deletes keys matching prefix pattern', async () => {
      await driver.set('session:abc', 1);
      await driver.set('session:def', 2);
      await driver.set('other:xyz', 3);

      const deleted = await driver.deleteByPattern('session:*');
      expect(deleted).toBe(2);
      expect(await driver.get('session:abc')).toBeNull();
      expect(await driver.get('session:def')).toBeNull();
      expect(await driver.get('other:xyz')).toBe(3);
    });

    it('returns 0 when no keys match', async () => {
      await driver.set('a', 1);
      const deleted = await driver.deleteByPattern('z:*');
      expect(deleted).toBe(0);
    });
  });

  describe('incr/decr', () => {
    it('incr increments from 0 for missing key', async () => {
      const result = await driver.incr('counter');
      expect(result).toBe(1);
      expect(await driver.get<number>('counter')).toBe(1);
    });

    it('incr increments existing value', async () => {
      await driver.set('counter', 5);
      const result = await driver.incr('counter');
      expect(result).toBe(6);
      expect(await driver.get<number>('counter')).toBe(6);
    });

    it('decr decrements from 0 for missing key', async () => {
      const result = await driver.decr('counter');
      expect(result).toBe(-1);
    });

    it('decr decrements existing value', async () => {
      await driver.set('counter', 5);
      const result = await driver.decr('counter');
      expect(result).toBe(4);
    });

    it('multiple incr calls accumulate', async () => {
      await driver.incr('c');
      await driver.incr('c');
      const result = await driver.incr('c');
      expect(result).toBe(3);
    });
  });

  describe('expire', () => {
    it('sets ttl on existing key', async () => {
      await driver.set('tmp', 'value');
      const result = await driver.expire('tmp', 60);
      expect(result).toBe(true);
      expect(await driver.get('tmp')).toBe('value');
    });

    it('returns false for missing key', async () => {
      const result = await driver.expire('missing', 60);
      expect(result).toBe(false);
    });
  });

  describe('close', () => {
    it('does not throw', async () => {
      await expect(driver.close()).resolves.toBeUndefined();
    });
  });

  describe('healthCheck', () => {
    it('returns true when namespace responds', async () => {
      const result = await driver.healthCheck();
      expect(result).toBe(true);
    });
  });
});
