import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockKvNs = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), delete: vi.fn() }));

const mockHasPlugin = vi.hoisted(() => vi.fn());
const mockGetPlugin = vi.hoisted(() => vi.fn());
const mockRegisterPlugin = vi.hoisted(() => vi.fn());
const mockRuntimeEnv = vi.hoisted(() => vi.fn().mockReturnValue({}));

const mockKvDriver = vi.hoisted(() => ({
  name: 'cloudflare-kv',
  close: vi.fn().mockResolvedValue(undefined),
  healthCheck: vi.fn().mockResolvedValue(true),
}));
const mockRedisDriver = vi.hoisted(() => ({
  name: 'redis',
  close: vi.fn().mockResolvedValue(undefined),
  healthCheck: vi.fn().mockResolvedValue(true),
}));
const mockLocalDriver = vi.hoisted(() => ({
  name: 'local-cache',
  close: vi.fn().mockResolvedValue(undefined),
  healthCheck: vi.fn().mockResolvedValue(true),
}));

const mockCreateCloudflareKvDriver = vi.hoisted(() => vi.fn().mockReturnValue(mockKvDriver));
const mockCreateRedisDriver = vi.hoisted(() => vi.fn().mockResolvedValue(mockRedisDriver));
const mockCreateLocalCacheDriver = vi.hoisted(() => vi.fn().mockReturnValue(mockLocalDriver));

vi.mock('@rx-ted/packages-core', () => {
  function resolveBinding(name: string) {
    return (
      (globalThis as any)[name] ??
      (globalThis as any).env?.[name] ??
      (typeof process !== 'undefined' ? (process.env as any)?.[name] : undefined) ??
      mockRuntimeEnv()?.[name]
    );
  }
  return {
    ENV_SYMBOL: Symbol('app:env'),
    Platform: { env: mockRuntimeEnv },
    resolveBinding,
  };
});

vi.mock('@rx-ted/packages-honest', () => ({
  ComponentManager: {
    hasPlugin: mockHasPlugin,
    getPlugin: mockGetPlugin,
    registerPlugin: mockRegisterPlugin,
  },
  resolvePluginLogger: vi.fn().mockReturnValue({
    child: vi.fn().mockReturnThis(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('./cloudflare/driver', () => ({ createCloudflareKvDriver: mockCreateCloudflareKvDriver }));
vi.mock('./redis/driver', () => ({ createRedisDriver: mockCreateRedisDriver }));
vi.mock('./local/driver', () => ({ createLocalCacheDriver: mockCreateLocalCacheDriver }));
vi.mock('./cache-service', () => ({ CACHE_GLOBAL_KEY: 'app:cache' }));

import { CachePlugin, findKvBinding, resolveBinding } from './resolve';

function makeEnv(platform: string, vars: Record<string, string> = {}) {
  return {
    platform,
    has: (key: string) => key in vars,
    get: (key: string, _type?: string) => vars[key],
    toObject: () => ({ ...vars }),
  };
}

function mockApp() {
  return { getContext: () => ({ set: vi.fn() }) };
}

describe('CachePlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPlugin.mockReturnValue(true);
    mockGetPlugin.mockReturnValue(makeEnv('node'));
    mockRuntimeEnv.mockReturnValue({});
    mockCreateRedisDriver.mockResolvedValue(mockRedisDriver);
  });

  describe('auto-detect on cloudflare', () => {
    beforeEach(() => {
      mockGetPlugin.mockReturnValue(makeEnv('cloudflare'));
      for (const key of Object.keys(globalThis as any)) {
        if ((globalThis as any)[key] === mockKvNs) {
          delete (globalThis as any)[key];
        }
      }
    });

    it('uses Cloudflare KV when binding on globalThis', async () => {
      (globalThis as any).MY_KV = mockKvNs;
      const plugin = new CachePlugin();
      await plugin.beforeModulesRegistered(mockApp() as any);

      expect(mockCreateCloudflareKvDriver).toHaveBeenCalledWith(mockKvNs);
      expect(mockCreateLocalCacheDriver).not.toHaveBeenCalled();
      expect(mockRegisterPlugin).toHaveBeenCalledWith('app:cache', mockKvDriver);
      delete (globalThis as any).MY_KV;
    });

    it('throws when no KV binding on cloudflare', async () => {
      const plugin = new CachePlugin();
      await expect(plugin.beforeModulesRegistered(mockApp() as any)).rejects.toThrow(
        'Cloudflare KV binding not found',
      );
      expect(mockCreateLocalCacheDriver).not.toHaveBeenCalled();
      expect(mockCreateCloudflareKvDriver).not.toHaveBeenCalled();
    });
  });

  describe('auto-detect on node', () => {
    it('uses Redis when env has REDIS_HOST', async () => {
      mockGetPlugin.mockReturnValue(
        makeEnv('node', { REDIS_HOST: 'localhost', REDIS_PORT: '6379' }),
      );
      const plugin = new CachePlugin();
      await plugin.beforeModulesRegistered(mockApp() as any);

      expect(mockCreateRedisDriver).toHaveBeenCalled();
      expect(mockCreateLocalCacheDriver).not.toHaveBeenCalled();
    });

    it('falls back to local when no Redis config', async () => {
      const plugin = new CachePlugin();
      await plugin.beforeModulesRegistered(mockApp() as any);

      expect(mockCreateLocalCacheDriver).toHaveBeenCalled();
      expect(mockCreateRedisDriver).not.toHaveBeenCalled();
    });

    it('falls back to local when Redis connection fails', async () => {
      mockGetPlugin.mockReturnValue(makeEnv('node', { REDIS_HOST: 'bad-host' }));
      mockCreateRedisDriver.mockRejectedValue(new Error('connection refused'));
      const plugin = new CachePlugin();
      await plugin.beforeModulesRegistered(mockApp() as any);

      expect(mockCreateRedisDriver).toHaveBeenCalled();
      expect(mockCreateLocalCacheDriver).toHaveBeenCalled();
    });
  });

  describe('explicit driver option', () => {
    it('uses KV when driver: "kv" with binding on globalThis', async () => {
      (globalThis as any).MY_KV = mockKvNs;
      const plugin = new CachePlugin({ driver: 'kv' });
      await plugin.beforeModulesRegistered(mockApp() as any);

      expect(mockCreateCloudflareKvDriver).toHaveBeenCalled();
      expect(mockCreateLocalCacheDriver).not.toHaveBeenCalled();
      delete (globalThis as any).MY_KV;
    });

    it('throws when driver: "kv" without binding', async () => {
      const plugin = new CachePlugin({ driver: 'kv' });
      await expect(plugin.beforeModulesRegistered(mockApp() as any)).rejects.toThrow(
        'Cloudflare KV binding not found',
      );
    });

    it('uses Redis when driver: "redis"', async () => {
      const plugin = new CachePlugin({ driver: 'redis', redis: { host: 'explicit-host' } });
      await plugin.beforeModulesRegistered(mockApp() as any);

      expect(mockCreateRedisDriver).toHaveBeenCalled();
      expect(mockCreateLocalCacheDriver).not.toHaveBeenCalled();
    });

    it('uses local when driver: "local"', async () => {
      const plugin = new CachePlugin({ driver: 'local' });
      await plugin.beforeModulesRegistered(mockApp() as any);

      expect(mockCreateLocalCacheDriver).toHaveBeenCalled();
      expect(mockCreateCloudflareKvDriver).not.toHaveBeenCalled();
      expect(mockCreateRedisDriver).not.toHaveBeenCalled();
    });
  });

  describe('explicit redis options', () => {
    it('uses explicit redis config over env vars', async () => {
      const env = makeEnv('node', { REDIS_HOST: 'ignored' });
      mockGetPlugin.mockReturnValue(env);
      const plugin = new CachePlugin({ redis: { host: 'explicit-host', port: 9999 } });
      await plugin.beforeModulesRegistered(mockApp() as any);

      expect(mockCreateRedisDriver).toHaveBeenCalledWith({ host: 'explicit-host', port: 9999 });
    });
  });

  describe('API', () => {
    it('getClient returns driver after init', async () => {
      const plugin = new CachePlugin();
      await plugin.beforeModulesRegistered(mockApp() as any);
      expect(plugin.getClient()).toBe(mockLocalDriver);
    });

    it('getClient throws before init', () => {
      const plugin = new CachePlugin();
      expect(() => plugin.getClient()).toThrow('not initialized');
    });

    it('close calls driver.close and clears driver', async () => {
      const plugin = new CachePlugin();
      await plugin.beforeModulesRegistered(mockApp() as any);
      await plugin.close();

      expect(mockLocalDriver.close).toHaveBeenCalled();
      expect(() => plugin.getClient()).toThrow('not initialized');
    });
  });
});

describe('findKvBinding', () => {
  beforeEach(() => {
    // Clean up any test bindings on globalThis
    for (const key of Object.keys(globalThis as any)) {
      if ((globalThis as any)[key] === mockKvNs) {
        delete (globalThis as any)[key];
      }
    }
  });

  it('finds binding on globalThis by duck-type (get+put+delete)', () => {
    (globalThis as any).MY_KV = mockKvNs;
    expect(findKvBinding()).toBe('MY_KV');
  });

  it('finds binding on globalThis.env by duck-type', () => {
    (globalThis as any).env = { MY_KV: mockKvNs };
    expect(findKvBinding()).toBe('MY_KV');
    delete (globalThis as any).env;
  });

  it('returns empty string when no binding found', () => {
    expect(findKvBinding()).toBe('');
  });

  it('accepts optional Env parameter (for consistency)', () => {
    const fakeEnv = { toObject: () => ({}) };
    expect(findKvBinding(fakeEnv as any)).toBe('');
  });
});

describe('resolveBinding', () => {
  it('finds binding from env.get fallback', () => {
    expect(resolveBinding('NONEXISTENT')).toBeUndefined();
  });
});
