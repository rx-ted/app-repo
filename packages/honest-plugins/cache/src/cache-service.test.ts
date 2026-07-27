import { describe, it, expect } from 'vitest';
import { CacheService, CACHE_GLOBAL_KEY } from './cache-service';

describe('CacheService', () => {
  it('exports CACHE_GLOBAL_KEY as "app:cache"', () => {
    expect(CACHE_GLOBAL_KEY).toBe('app:cache');
  });

  it('is a class', () => {
    expect(typeof CacheService).toBe('function');
  });

  it('throws when instantiated without ComponentManager registration', () => {
    expect(() => new CacheService()).toThrow();
  });
});
