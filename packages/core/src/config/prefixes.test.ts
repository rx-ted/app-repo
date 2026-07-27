import { describe, expect, it } from 'vitest';
import { resolveKey, filterKeys } from './prefixes';

describe('resolveKey', () => {
  const source = { DATABASE_URL: 'pg://local', APP_DATABASE_URL: 'pg://prod', DEBUG: 'true' };

  it('should return exact match', () => {
    expect(resolveKey('DATABASE_URL', source)).toBe('pg://local');
  });

  it('should fallback to prefix match', () => {
    expect(resolveKey('DATABASE_URL', source, ['APP_'])).toBe('pg://local');
  });

  it('should try prefixes in order', () => {
    const src = { STAGING_DB: 'staging' };
    expect(resolveKey('DB', src, ['APP_', 'STAGING_'])).toBe('staging');
  });

  it('should return undefined when not found', () => {
    expect(resolveKey('NONEXISTENT', source)).toBeUndefined();
    expect(resolveKey('NONEXISTENT', source, ['APP_'])).toBeUndefined();
  });
});

describe('filterKeys', () => {
  it('should return only keys matching any prefix', () => {
    const source = { APP_DB: 'db', APP_SECRET: 'secret', OTHER: 'x' };
    const result = filterKeys(source, ['APP_']);
    expect(result).toEqual({ APP_DB: 'db', APP_SECRET: 'secret' });
  });
});
