import type { Hono } from 'hono';
import type mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { ENV_SYMBOL, type Env, type ILogger } from '@rx-ted/packages-core';
import { ComponentManager, resolvePluginLogger } from '@rx-ted/packages-honest';
import type { Application, IPlugin } from '@rx-ted/packages-honest';
import { createMysqlPool } from './client';
import { createMysqlDriver } from './driver';
import type { DatabaseDriver } from '../types';
import { DB_GLOBAL_KEY } from '../constants';
import { assertRuntimeSupport, type AppRuntime } from '../resolve';

export const DB_CONTEXT_KEY = 'context:db';
export const POOL_CONTEXT_KEY = 'honest:mysql:pool';

// Backward-compat aliases
export const DRIZZLE_GLOBAL_KEY = DB_GLOBAL_KEY;
export const DRIZZLE_CONTEXT_KEY = DB_CONTEXT_KEY;
export const MYSQL_CONTEXT_KEY = 'honest:mysql';

export interface MysqlPluginOptions {
  connection: {
    host: string;
    port: number;
    user: string;
    password?: string;
    database: string;
    ssl?: boolean | { rejectUnauthorized?: boolean; ca?: string; cert?: string; key?: string };
    connectionLimit?: number;
  };
  contextKey?: string;
  schema?: Record<string, unknown>;
  logger?: boolean | ((log: string) => void);
  plugins?: Array<{ name: string; install: (db: any) => void }>;
}

export class MysqlPlugin implements IPlugin {
  static readonly globalKey = DB_GLOBAL_KEY;
  readonly name = 'mysql-plugin';
  readonly version = '1.0.0';
  logger?: ILogger;
  private driver: DatabaseDriver | null = null;
  private drizzleInstance: any = null;
  private pool: mysql.Pool | null = null;
  private readonly options: MysqlPluginOptions;
  private readonly contextKey: string;

  constructor(options: MysqlPluginOptions) {
    this.options = options;
    this.contextKey = options.contextKey ?? MYSQL_CONTEXT_KEY;
  }

  getClient(): DatabaseDriver {
    if (!this.driver) throw new Error('MySQL driver not initialized');
    return this.driver;
  }

  getDrizzle(): any {
    if (!this.drizzleInstance) throw new Error('Drizzle not initialized');
    return this.drizzleInstance;
  }

  getPool(): mysql.Pool {
    if (!this.pool) throw new Error('MySQL pool not initialized');
    return this.pool;
  }

  async beforeModulesRegistered(app: Application, _hono: Hono): Promise<void> {
    this.logger ??= resolvePluginLogger(this.name);

    const env = ComponentManager.getPlugin<Env>(ENV_SYMBOL);
    assertRuntimeSupport(env.platform as AppRuntime, 'mysql');

    this.logger.info(
      {
        host: this.options.connection.host,
        database: this.options.connection.database,
      },
      'MySQL: initializing',
    );

    this.pool = createMysqlPool({ ...this.options.connection });
    this.driver = await createMysqlDriver({
      ...this.options.connection,
      pool: this.pool,
      logger: this.logger as any,
    });

    const { schema } = this.options;
    this.drizzleInstance = drizzle(this.pool, {
      schema,
      mode: 'default',
      logger:
        this.options.logger === true
          ? true
          : typeof this.options.logger === 'function'
            ? {
                logQuery: (query: string, params: unknown[]) =>
                  (this.options.logger as Function)(query),
              }
            : this.options.logger,
    } as any);

    ComponentManager.registerPlugin(DB_GLOBAL_KEY, this.drizzleInstance);
    app.getContext().set(POOL_CONTEXT_KEY, this.pool);
    app.getContext().set(this.contextKey, this.driver);
    app.getContext().set(DB_CONTEXT_KEY, this.drizzleInstance);
  }

  async afterModulesRegistered(_app: Application, _hono: Hono): Promise<void> {
    if (!this.logger) return;
    const healthy = await this.driver?.healthCheck();
    if (healthy) {
      this.logger.info('MySQL: health check passed');
    } else {
      this.logger.error('MySQL: health check failed');
    }
  }

  async close(): Promise<void> {
    this.logger?.info('MySQL: shutting down');
    await this.driver?.close();
    if (this.pool) await this.pool.end();
    this.driver = null;
    this.drizzleInstance = null;
    this.pool = null;
  }
}
