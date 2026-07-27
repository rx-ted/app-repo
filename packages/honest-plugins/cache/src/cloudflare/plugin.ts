import { ENV_SYMBOL, type Env, type ILogger, resolveBinding } from '@rx-ted/packages-core';
import { ComponentManager, resolvePluginLogger } from '@rx-ted/packages-honest';
import type { Application, IPlugin } from '@rx-ted/packages-honest';
import { createCloudflareKvDriver } from './driver';
import type { KvNamespace } from './driver';
import type { CacheDriver } from '../types';
import { CACHE_GLOBAL_KEY } from '../cache-service';

export const CLOUDFLARE_KV_CONTEXT_KEY = 'honest:cloudflare-kv';

export interface CloudflareKvPluginOptions {
  namespace?: KvNamespace;
  binding?: string;
}

export class CloudflareKvPlugin implements IPlugin {
  static readonly globalKey = 'cloudflare-kv';
  readonly name = 'cloudflare-kv-plugin';
  readonly version = '1.0.0';

  logger?: ILogger;
  private driver?: CacheDriver;

  constructor(private options: CloudflareKvPluginOptions) {}

  async beforeModulesRegistered(app: Application): Promise<void> {
    this.logger ??= resolvePluginLogger(this.name);
    this.logger.info('Cloudflare KV: connecting...');

    const appEnv = ComponentManager.hasPlugin(ENV_SYMBOL)
      ? ComponentManager.getPlugin<Env>(ENV_SYMBOL)
      : undefined;
    const ns = this.options.namespace ?? resolveBinding(this.options.binding ?? '', appEnv);

    if (ns) {
      this.driver = createCloudflareKvDriver(ns);
    } else if (this.options.binding) {
      this.driver = createLazyDriver(() => resolveBinding(this.options.binding!, appEnv));
      this.logger.info(`Cloudflare KV: binding "${this.options.binding}" deferred`);
    } else {
      throw new Error('Cloudflare KV: namespace or binding option required');
    }

    app.getContext().set(CLOUDFLARE_KV_CONTEXT_KEY, this.driver);
    ComponentManager.registerPlugin(CACHE_GLOBAL_KEY, this.driver);
    this.logger.info('Cloudflare KV: connected');
  }

  async close(): Promise<void> {
    await this.driver?.close();
  }
}

function createLazyDriver(resolve: () => any): CacheDriver {
  let cached: CacheDriver | null = null;
  const noop = () => Promise.resolve(null);

  return new Proxy({} as CacheDriver, {
    get(_, prop) {
      if (!cached) {
        const ns = resolve();
        if (ns) cached = createCloudflareKvDriver(ns);
      }
      if (cached) {
        const val = (cached as any)[prop];
        return typeof val === 'function' ? val.bind(cached) : val;
      }
      return noop;
    },
  });
}
