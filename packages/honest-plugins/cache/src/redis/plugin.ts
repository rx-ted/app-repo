import type { Hono } from 'hono';
import type { ILogger } from '@rx-ted/packages-core';
import { ComponentManager, maskSensitive, resolvePluginLogger } from '@rx-ted/packages-honest';
import type { Application, IPlugin } from '@rx-ted/packages-honest';
import { createRedisDriver } from './driver';
import type { RedisClientOptions } from './driver';
import type { CacheDriver } from '../types';
import { CACHE_GLOBAL_KEY } from '../cache-service';

export const REDIS_CONTEXT_KEY = 'honest:redis';
export const REDIS_GLOBAL_KEY = 'redis';

export interface RedisPluginOptions {
  connection: RedisClientOptions;
  contextKey?: string;
}

export class RedisPlugin implements IPlugin {
  static readonly globalKey = REDIS_GLOBAL_KEY;
  readonly name = 'redis-plugin';
  readonly version = '1.0.0';

  logger?: ILogger;

  private driver: CacheDriver | null = null;
  private readonly connection: RedisClientOptions;
  private readonly contextKey: string;

  constructor(options: RedisPluginOptions) {
    this.connection = options.connection;
    this.contextKey = options.contextKey ?? REDIS_CONTEXT_KEY;
  }

  getClient(): CacheDriver {
    if (!this.driver) {
      throw new Error('Redis not connected. Ensure beforeModulesRegistered has run.');
    }
    return this.driver;
  }

  async beforeModulesRegistered(app: Application, _hono: Hono): Promise<void> {
    this.logger ??= resolvePluginLogger(this.name);
    this.logger.info('Redis: connecting...');

    const connInfo: Record<string, unknown> = {
      category: 'plugins',
      host: this.connection.host,
      port: this.connection.port,
      db: this.connection.db,
      username: this.connection.username,
      password: maskSensitive(this.connection.password),
    };

    try {
      this.driver = await createRedisDriver(this.connection);
      app.getContext().set(this.contextKey, this.driver);
      ComponentManager.registerPlugin(CACHE_GLOBAL_KEY, this.driver);

      const ok = await this.driver.healthCheck();
      if (!ok) throw new Error('Redis: health check failed');
      this.logger.info(connInfo, 'success to redis');
    } catch (error) {
      this.logger.error(
        { ...connInfo, error: error instanceof Error ? error.message : String(error) },
        'fail to connect redis',
      );
      throw error;
    }
  }

  async afterModulesRegistered(_app: Application, _hono: Hono): Promise<void> {
    if (this.driver) {
      const ok = await this.driver.healthCheck();
      if (ok) {
        this.logger?.info('Redis: health check passed');
      }
    }
  }

  async close(): Promise<void> {
    await this.driver?.close();
    this.driver = null;
  }
}
