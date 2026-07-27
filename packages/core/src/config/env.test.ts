import { describe, expect, it } from 'vitest';
import { Env } from './env';
import { z } from 'zod';

describe('Env', () => {
  it('should detect Node.js runtime', () => {
    const env = new Env(process.env, {});
    expect(env.platform).toBe('node');
  });

  it('should read process.env', () => {
    const env = new Env(process.env, {});
    process.env.TEST_ENV_VAR = 'hello';
    expect(env.get('TEST_ENV_VAR')).toBe('hello');
    delete process.env.TEST_ENV_VAR;
  });

  it('should return undefined for missing keys', () => {
    const env = new Env(process.env, {});
    expect(env.get('NONEXISTENT_VAR_XYZ')).toBeUndefined();
  });

  it('require should throw for missing keys', () => {
    const env = new Env(process.env, {});
    expect(() => env.require('NONEXISTENT_VAR_XYZ')).toThrow();
  });

  it('has should check key existence', () => {
    const env = new Env(process.env, {});
    process.env.TEST_HAS = '1';
    expect(env.has('TEST_HAS')).toBe(true);
    expect(env.has('NONEXISTENT_VAR_XYZ')).toBe(false);
    delete process.env.TEST_HAS;
  });

  it('get with type string should throw on missing', () => {
    const env = new Env({}, {});
    expect(() => env.get('NONEXISTENT', 'string')).toThrow();
  });

  it('get with type number should coerce', () => {
    const env = new Env({ TEST_PORT: '5432' });
    expect(env.get('TEST_PORT', 'number')).toBe(5432);
  });

  it('get with type number should throw on NaN', () => {
    const env = new Env({ TEST_PORT: 'notanumber' });
    expect(() => env.get('TEST_PORT', 'number')).toThrow();
  });

  it('get with type boolean should coerce', () => {
    const env = new Env({ TEST_FLAG: 'true' });
    expect(env.get('TEST_FLAG', 'boolean')).toBe(true);
    const env2 = new Env({ TEST_FLAG: 'false' });
    expect(env2.get('TEST_FLAG', 'boolean')).toBe(false);
  });

  it('get with type url should parse', () => {
    const env = new Env({ TEST_URL: 'https://example.com' });
    const url = env.get('TEST_URL', 'url');
    expect(url).toBeInstanceOf(URL);
    expect(url.href).toBe('https://example.com/');
  });

  it('get with type url should throw on invalid', () => {
    const env = new Env({ TEST_URL: 'not-a-url' });
    expect(() => env.get('TEST_URL', 'url')).toThrow();
  });

  it('toObject returns all env vars', () => {
    const env = new Env({ TEST_OBJ: 'val' }, { CTX_KEY: 'ctx' });
    const obj = env.toObject();
    expect(obj.TEST_OBJ).toBe('val');
    expect(obj.CTX_KEY).toBe('ctx');
  });

  it('set writes to pre-boot env and is readable via get', () => {
    const env = new Env({});
    env.set('MY_KEY', 'my-value');
    expect(env.get('MY_KEY')).toBe('my-value');
  });

  it('set returns this for chaining', () => {
    const env = new Env({});
    expect(env.set('A', '1').set('B', '2').get('B')).toBe('2');
  });

  it('set writes to _env, not _ctx', () => {
    const env = new Env({}, { CTX_KEY: 'ctx-val' });
    env.set('CTX_KEY', 'overwritten');
    expect(env.var('CTX_KEY')).toBe('overwritten');
    expect(env.ctx('CTX_KEY')).toBe('ctx-val');
  });
});

describe('env.schema', () => {
  it('should return default values when env vars missing', () => {
    const result = new Env({}).schema(
      {
        host: z.string().default('localhost'),
        port: z.coerce.number().default(3306),
      },
      { prefix: 'TEST' },
    );
    expect(result).toEqual({ host: 'localhost', port: 3306 });
  });

  it('should read from provided env source', () => {
    const result = new Env({ DB_HOST: '1.2.3.4', DB_PORT: '5432', DB_USER: 'admin' }).schema(
      {
        host: z.string().default('localhost'),
        port: z.coerce.number().default(3306),
        user: z.string(),
      },
      { prefix: 'DB' },
    );
    expect(result).toEqual({ host: '1.2.3.4', port: 5432, user: 'admin' });
  });

  it('should throw when required field is missing', () => {
    expect(() =>
      new Env({ DB_HOST: 'localhost' }).schema(
        {
          host: z.string(),
          password: z.string(),
        },
        { prefix: 'DB' },
      ),
    ).toThrow();
  });
});

describe('env schema fields', () => {
  it('mode should default to dev', () => {
    const env = new Env({});
    expect(env.mode).toBe('dev');
  });

  it('mode should read NODE_ENV', () => {
    const env = new Env({ NODE_ENV: 'production' });
    expect(env.mode).toBe('prod');
  });

  it('mode should be dev for testing env', () => {
    const env = new Env({ NODE_ENV: 'testing' });
    expect(env.mode).toBe('dev');
  });

  it('mode should fallback to APP_ENV', () => {
    const env = new Env({ APP_ENV: 'prod' });
    expect(env.mode).toBe('prod');
  });

  it('platform should return the platform name', () => {
    const env = new Env(process.env);
    expect(env.platform).toBe('node');
  });

  it('DEBUG should be true when not prod', () => {
    const env = new Env({});
    expect(env.DEBUG).toBe(true);
  });

  it('DEBUG should be false in prod', () => {
    const env = new Env({ NODE_ENV: 'production' });
    expect(env.DEBUG).toBe(false);
  });

  it('DEBUG should respect explicit DEBUG=true', () => {
    const env = new Env({ DEBUG: 'true' });
    expect(env.DEBUG).toBe(true);
  });

  it('DEBUG should respect explicit DEBUG=false', () => {
    const env = new Env({ DEBUG: 'false', NODE_ENV: 'development' });
    expect(env.DEBUG).toBe(false);
  });

  it('DEBUG=false agrees with NODE_ENV=production → prod, no warn', () => {
    const env = new Env({ DEBUG: 'false', NODE_ENV: 'production' });
    expect(env.mode).toBe('prod');
  });

  it('DEBUG=true agrees with NODE_ENV=development → dev, no warn', () => {
    const env = new Env({ DEBUG: 'true', NODE_ENV: 'development' });
    expect(env.mode).toBe('dev');
  });

  it('DEBUG=false overrides NODE_ENV=development → prod with warn', () => {
    const env = new Env({ DEBUG: 'false', NODE_ENV: 'development' });
    expect(env.mode).toBe('prod');
  });

  it('DEBUG=true overrides NODE_ENV=production → dev with warn', () => {
    const env = new Env({ DEBUG: 'true', NODE_ENV: 'production' });
    expect(env.mode).toBe('dev');
  });
});

describe('Env schema parsing', () => {
  it('should use env.schema() with a prefix', () => {
    const env = new Env({ DB_HOST: '1.2.3.4', DB_PORT: '5432', DB_USER: 'admin' });
    const result = env.schema(
      {
        host: z.string().default('localhost'),
        port: z.coerce.number().default(3306),
        user: z.string(),
      },
      { prefix: 'DB' },
    );
    expect(result).toEqual({ host: '1.2.3.4', port: 5432, user: 'admin' });
  });

  it('should return defaults when prefixed vars missing', () => {
    const env = new Env({});
    const result = env.schema(
      {
        host: z.string().default('localhost'),
        port: z.coerce.number().default(3306),
      },
      { prefix: 'DB' },
    );
    expect(result).toEqual({ host: 'localhost', port: 3306 });
  });

  it('should throw when required field is missing', () => {
    const env = new Env({ DB_HOST: 'localhost' });
    expect(() =>
      env.schema(
        {
          host: z.string(),
          password: z.string(),
        },
        { prefix: 'DB' },
      ),
    ).toThrow();
  });
});
