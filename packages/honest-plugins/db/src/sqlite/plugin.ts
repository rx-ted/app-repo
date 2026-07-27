import type { Hono } from 'hono';
import type { IPlugin, Application } from '@rx-ted/packages-honest';
import { ComponentManager, resolvePluginLogger } from '@rx-ted/packages-honest';
import { ENV_SYMBOL, type Env, type ILogger } from '@rx-ted/packages-core';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { DB_GLOBAL_KEY } from '../constants';
import { assertRuntimeSupport, type AppRuntime } from '../resolve';

export interface SqlitePluginOptions {
  dbPath: string;
  schema: Record<string, any>;
}

export class SqlitePlugin implements IPlugin {
  readonly name = 'sqlite-plugin';
  readonly version = '0.0.1';
  logger?: ILogger;
  private db: any = null;

  constructor(private options: SqlitePluginOptions) {}

  async beforeModulesRegistered(_app: Application, _hono: Hono): Promise<void> {
    this.logger ??= resolvePluginLogger(this.name);

    const env = ComponentManager.getPlugin<Env>(ENV_SYMBOL);
    assertRuntimeSupport(env.platform as AppRuntime, 'sqlite');

    this.logger.info(`connecting to SQLite: ${this.options.dbPath}`);

    const client = createClient({ url: `file:${this.options.dbPath}` });
    const raw = drizzle(client, { schema: this.options.schema });
    this.db = raw;

    ComponentManager.registerPlugin(DB_GLOBAL_KEY, this.db);

    this.logger.info(`SQLite connected: ${this.options.dbPath}`);
  }

  async close(): Promise<void> {
    if (this.db?.$client) {
      this.db.$client.close();
      this.logger?.info('SQLite connection closed');
    }
  }
}
