import { ENV_SYMBOL, Env } from '@rx-ted/packages-core';
import { ComponentManager } from '@rx-ted/packages-honest';
import type { IPlugin } from '@rx-ted/packages-honest';

export type AppRuntime = 'node' | 'bun' | 'deno' | 'cloudflare' | 'vercel-edge';
export type DbType = 'd1' | 'sqlite' | 'mysql';

const RUNTIME_DB_MAP: Record<AppRuntime, DbType[]> = {
  cloudflare: ['d1'],
  node: ['sqlite', 'mysql'],
  bun: ['sqlite', 'mysql'],
  deno: ['sqlite', 'mysql'],
  'vercel-edge': [],
};

const PLUGIN_DB_TYPE: Record<string, DbType> = {
  D1Plugin: 'd1',
  SqlitePlugin: 'sqlite',
  MysqlPlugin: 'mysql',
};

function getAppEnv(): Env {
  if (ComponentManager.hasPlugin(ENV_SYMBOL)) {
    return ComponentManager.getPlugin<Env>(ENV_SYMBOL);
  }
  return new Env(process.env, {});
}

export function assertRuntimeSupport(runtime: AppRuntime, dbType: DbType): void {
  if (!(runtime in RUNTIME_DB_MAP)) {
    throw new Error(
      `[db] Unsupported runtime "${runtime}". ` +
        `Supported: ${Object.keys(RUNTIME_DB_MAP).join(', ')}. ` +
        `Contact the developer to add support for this runtime.`,
    );
  }
  const allowed = RUNTIME_DB_MAP[runtime];
  if (!allowed.includes(dbType)) {
    throw new Error(
      `[db] Database "${dbType}" is not supported on runtime "${runtime}". ` +
        `Allowed databases for "${runtime}": ${allowed.join(', ')}. ` +
        `Change the DB env var or switch to a different runtime.`,
    );
  }
}

function dbTypeFromPlugin(plugin: IPlugin): DbType {
  const name = plugin.constructor?.name;
  const dbType = name ? PLUGIN_DB_TYPE[name] : undefined;
  if (!dbType) {
    throw new Error(
      `[db] Unknown plugin "${name}". ` +
        `Supported plugins: ${Object.keys(PLUGIN_DB_TYPE).join(', ')}.`,
    );
  }
  return dbType;
}

export async function DBPlugin(schema: Record<string, any>): Promise<IPlugin>;
export async function DBPlugin(plugin: IPlugin): Promise<IPlugin>;
export async function DBPlugin(arg: any): Promise<IPlugin> {
  const appEnv = getAppEnv();

  // Explicit mode: user passed a pre-created plugin
  if (arg && typeof arg === 'object' && 'name' in arg && 'version' in arg) {
    const dbType = dbTypeFromPlugin(arg as IPlugin);
    assertRuntimeSupport(appEnv.platform as AppRuntime, dbType);
    return arg as IPlugin;
  }

  // Auto-detect mode: arg is schema
  const runtime = appEnv.platform as AppRuntime;
  const dbRaw = appEnv.get('DB');
  const db: DbType =
    (typeof dbRaw === 'string' ? (dbRaw as DbType) : undefined) ??
    RUNTIME_DB_MAP[runtime]?.[0] ??
    'sqlite';
  assertRuntimeSupport(runtime, db);

  if (db === 'd1') {
    const { D1Plugin } = await import('./d1/plugin');
    return new D1Plugin({ schema: arg });
  }

  if (db === 'sqlite') {
    const { SqlitePlugin } = await import('./sqlite/plugin');
    return new SqlitePlugin({
      dbPath: appEnv.var('DB_PATH', 'data/app.db'),
      schema: arg,
    });
  }

  const { MysqlPlugin } = await import('./mysql/plugin');
  return new MysqlPlugin({
    connection: {
      host: appEnv.get('DB_HOST', 'string'),
      port: appEnv.get('DB_PORT', 'number'),
      user: appEnv.get('DB_USER', 'string'),
      password: appEnv.get('DB_PASSWORD') ?? '',
      database: appEnv.get('DB_DATABASE', 'string'),
    },
    schema: arg,
    logger: true,
  });
}
