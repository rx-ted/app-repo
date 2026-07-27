import { describe, it, expect, vi } from 'vitest';
import { cacheable } from './cacheable';
import type { CacheDriver } from './types';

function createMockDriver(): CacheDriver {
  return {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    mget: vi.fn(),
    mset: vi.fn(),
    deleteByPattern: vi.fn(),
    incr: vi.fn(),
    decr: vi.fn(),
    expire: vi.fn(),
    close: vi.fn(),
    healthCheck: vi.fn(),
  };
}

describe('cacheable', () => {
  it('returns cached value when cache hits', async () => {
    const cache = createMockDriver();
    cache.get = vi.fn().mockResolvedValue('cached-value');

    const result = await cacheable(cache, 'my-key', 60, async () => 'fresh-value');

    expect(result).toBe('cached-value');
    expect(cache.get).toHaveBeenCalledWith('my-key');
  });

  it('calls fetch and caches result when cache misses', async () => {
    const cache = createMockDriver();
    cache.get = vi.fn().mockResolvedValue(null);
    cache.set = vi.fn().mockResolvedValue(true);

    const fetch = vi.fn().mockResolvedValue('fresh-value');
    const result = await cacheable(cache, 'my-key', 60, fetch);

    expect(result).toBe('fresh-value');
    expect(cache.get).toHaveBeenCalledWith('my-key');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledWith('my-key', 'fresh-value', 60);
  });

  it('does not cache when fetch returns null', async () => {
    const cache = createMockDriver();
    cache.get = vi.fn().mockResolvedValue(null);
    cache.set = vi.fn();

    const result = await cacheable(cache, 'my-key', 60, async () => null);

    expect(result).toBeNull();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('uses the provided ttl', async () => {
    const cache = createMockDriver();
    cache.get = vi.fn().mockResolvedValue(null);
    cache.set = vi.fn().mockResolvedValue(true);

    await cacheable(cache, 'key-ttl', 300, async () => ({ data: true }));

    expect(cache.set).toHaveBeenCalledWith('key-ttl', { data: true }, 300);
  });

  it('forwards exception from fetch', async () => {
    const cache = createMockDriver();
    cache.get = vi.fn().mockResolvedValue(null);

    await expect(
      cacheable(cache, 'error-key', 60, async () => {
        throw new Error('fetch-failed');
      }),
    ).rejects.toThrow('fetch-failed');
  });
});
