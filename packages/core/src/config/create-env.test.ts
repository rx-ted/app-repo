import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createEnv } from './create-env';

describe('createEnv', () => {
  it('should validate and return env vars', () => {
    const env = createEnv({
      schema: { DB_URL: z.string() },
      runtimeEnv: { DB_URL: 'pg://localhost:5432/db' },
    });
    expect(env.DB_URL).toBe('pg://localhost:5432/db');
  });

  it('should throw on validation failure', () => {
    expect(() =>
      createEnv({
        schema: { DB_URL: z.string().url() },
        runtimeEnv: { DB_URL: 'not-a-url' },
      }),
    ).toThrow();
  });

  it('should support default values', () => {
    const env = createEnv({
      schema: { PORT: z.coerce.number().default(3000) },
      runtimeEnv: {},
    });
    expect(env.PORT).toBe(3000);
  });

  it('should resolve prefixes', () => {
    const env = createEnv({
      schema: { DATABASE_URL: z.string() },
      prefixes: ['APP_'],
      runtimeEnv: { APP_DATABASE_URL: 'pg://prod' },
    });
    expect(env.DATABASE_URL).toBe('pg://prod');
  });

  it('should prefer exact match over prefix', () => {
    const env = createEnv({
      schema: { DATABASE_URL: z.string() },
      prefixes: ['APP_'],
      runtimeEnv: { DATABASE_URL: 'pg://local', APP_DATABASE_URL: 'pg://prod' },
    });
    expect(env.DATABASE_URL).toBe('pg://local');
  });

  it('toJSON returns all values', () => {
    const env = createEnv({
      schema: { KEY: z.string().default('val') },
      runtimeEnv: {},
    });
    expect(env.toJSON()).toEqual({ KEY: 'val' });
  });

  it('should not throw when skipValidation is true', () => {
    const env = createEnv({
      schema: { MUST_EXIST: z.string() },
      runtimeEnv: {},
      skipValidation: true,
    });
    expect(env.MUST_EXIST).toBeUndefined();
  });

  it('optional var without default returns undefined', () => {
    const env = createEnv({
      schema: { OPTIONAL_KEY: z.string().optional() },
      runtimeEnv: {},
    });
    expect(env.OPTIONAL_KEY).toBeUndefined();
  });

  it('should work with z.coerce.number', () => {
    const env = createEnv({
      schema: { PORT: z.coerce.number() },
      runtimeEnv: { PORT: '8080' },
    });
    expect(env.PORT).toBe(8080);
  });

  it('should work with z.boolean', () => {
    const env = createEnv({
      schema: { DEBUG: z.coerce.boolean() },
      runtimeEnv: { DEBUG: 'true' },
    });
    expect(env.DEBUG).toBe(true);
  });

  it('should handle multiple keys', () => {
    const env = createEnv({
      schema: {
        HOST: z.string().default('localhost'),
        PORT: z.coerce.number().default(3000),
        MODE: z.enum(['dev', 'prod']).default('dev'),
      },
      runtimeEnv: { MODE: 'prod' },
    });
    expect(env.HOST).toBe('localhost');
    expect(env.PORT).toBe(3000);
    expect(env.MODE).toBe('prod');
  });
});
