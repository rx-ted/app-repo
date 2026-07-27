import type { Hono } from 'hono';
import type { ILogger } from '@rx-ted/packages-core';
import type { IPlugin, Application } from '@rx-ted/packages-honest';
import { ComponentManager, resolvePluginLogger } from '@rx-ted/packages-honest';
import { createLocalCacheDriver } from './driver';
import type { CacheDriver } from '../types';
import { CACHE_GLOBAL_KEY } from '../cache-service';

export const LOCAL_CACHE_CONTEXT_KEY = 'honest:local-cache';

export class LocalCachePlugin implements IPlugin {
  static readonly globalKey = 'local-cache';
  readonly name = 'local-cache-plugin';
  readonly version = '1.0.0';

  logger?: ILogger;
  private driver: CacheDriver;

  constructor() {
    this.driver = createLocalCacheDriver();
  }

  async beforeModulesRegistered(app: Application, _hono: Hono): Promise<void> {
    this.logger ??= resolvePluginLogger(this.name);
    this.logger.info('Local cache: initializing in-memory cache...');
    app.getContext().set(LOCAL_CACHE_CONTEXT_KEY, this.driver);
    ComponentManager.registerPlugin(CACHE_GLOBAL_KEY, this.driver);
    this.logger.info('Local cache: ready');
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}
