import { ENV_SYMBOL, type Env, Platform, resolveBinding } from '@rx-ted/packages-core';
export { resolveBinding };
import { ComponentManager, resolvePluginLogger } from '@rx-ted/packages-honest';
import type { Application, IPlugin } from '@rx-ted/packages-honest';
import { createCloudflareKvDriver } from './cloudflare/driver';
import type { KvNamespace } from './cloudflare/driver';
import { createRedisDriver } from './redis/driver';
import type { RedisClientOptions } from './redis/driver';
import { createLocalCacheDriver } from './local/driver';
import type { CacheDriver } from './types';
import { CACHE_GLOBAL_KEY } from './cache-service';

export interface CachePluginOptions {
  driver?: 'redis' | 'kv' | 'local';
  redis?: RedisClientOptions;
  kvBinding?: string;
}

export function findKvBinding(env?: Env): string {
  const sources: Record<string, unknown>[] = [
    globalThis as Record<string, unknown>,
    ((globalThis as any).env ?? {}) as Record<string, unknown>,
    Platform.env(),
  ];
  for (const source of sources) {
    for (const key of Object.keys(source)) {
      const val = source[key];
      if (val && typeof val === 'object' && 'get' in val && 'put' in val && 'delete' in val) {
        const { get, put, delete: del } = val as any;
        if (typeof get === 'function' && typeof put === 'function' && typeof del === 'function') {
          return key;
        }
      }
    }
  }
  return '';
}

function resolveRedisConfig(
  options: CachePluginOptions | undefined,
  env?: Env,
): RedisClientOptions | null {
  if (options?.redis) return options.redis;
  if (env?.has('REDIS_URL')) return { url: env.get('REDIS_URL')! };
  if (env?.has('REDIS_HOST')) {
    return {
      host: env.get('REDIS_HOST'),
      port: env.get('REDIS_PORT', 'number'),
      username: env.get('REDIS_USERNAME'),
      password: env.get('REDIS_PASSWORD'),
      db: env.get('REDIS_DB', 'number'),
    };
  }
  return null;
}

export class CachePlugin implements IPlugin {
  readonly name = 'cache-plugin';
  readonly version = '1.0.0';
  logger?: import('@rx-ted/packages-core').ILogger;

  private driver: CacheDriver | null = null;

  constructor(private options?: CachePluginOptions) {}

  getClient(): CacheDriver {
    if (!this.driver) {
      throw new Error('Cache not initialized. Ensure beforeModulesRegistered has run.');
    }
    return this.driver;
  }

  async beforeModulesRegistered(app: Application): Promise<void> {
    this.logger ??= resolvePluginLogger(this.name);
    this.logger.info('Cache: initializing...');

    const appEnv = ComponentManager.hasPlugin(ENV_SYMBOL)
      ? ComponentManager.getPlugin<Env>(ENV_SYMBOL)
      : undefined;

    const explicit = this.options?.driver;
    const platform = appEnv?.platform ?? 'node';

    if (explicit === 'kv' || (!explicit && platform === 'cloudflare')) {
      this.driver = this.initCloudflare(appEnv);
    } else if (
      explicit === 'redis' ||
      (!explicit && (platform === 'node' || platform === 'bun' || platform === 'deno'))
    ) {
      this.driver = await this.initNode(appEnv);
    } else {
      this.driver = createLocalCacheDriver();
    }

    app.getContext().set('honest:cache', this.driver);
    ComponentManager.registerPlugin(CACHE_GLOBAL_KEY, this.driver);
    this.logger.info('Cache: ready');
  }

  private initCloudflare(env?: Env): CacheDriver {
    const bindingName = this.options?.kvBinding || findKvBinding(env);
    if (bindingName) {
      const ns = resolveBinding(bindingName, env) as KvNamespace | undefined;
      if (ns) {
        this.logger?.info('Cache: using Cloudflare KV');
        return createCloudflareKvDriver(ns);
      }
    }
    throw new Error(
      `Cache: Cloudflare KV binding not found. Configure a KV namespace binding named "${bindingName || '<name>'}" in your wrangler.toml.`,
    );
  }

  private async initNode(env?: Env): Promise<CacheDriver> {
    const redisConfig = resolveRedisConfig(this.options, env);
    if (redisConfig) {
      try {
        const driver = await createRedisDriver(redisConfig);
        const ok = await driver.healthCheck();
        if (ok) {
          this.logger?.info('Cache: using Redis');
          return driver;
        }
        this.logger?.warn('Cache: Redis health check failed, falling back to local');
      } catch (err) {
        this.logger?.warn(
          { error: err instanceof Error ? err.message : String(err) },
          'Cache: Redis connection failed, falling back to local',
        );
      }
    }
    this.logger?.info('Cache: using local in-memory cache');
    return createLocalCacheDriver();
  }

  async close(): Promise<void> {
    await this.driver?.close();
    this.driver = null;
  }
}
