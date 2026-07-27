import type { Hono } from 'hono';
import {
  ENV_SYMBOL,
  Platform,
  type Env,
  type ILogger,
  resolveBinding,
} from '@rx-ted/packages-core';
import type { IPlugin, Application } from '@rx-ted/packages-honest';
import { ComponentManager, resolvePluginLogger } from '@rx-ted/packages-honest';
import { drizzle } from 'drizzle-orm/d1';
import { DB_GLOBAL_KEY } from '../constants';
import { assertRuntimeSupport, type AppRuntime } from '../resolve';

export class D1Plugin implements IPlugin {
  readonly name = `${DB_GLOBAL_KEY}:d1`;
  readonly version = '0.0.1';
  logger?: ILogger;
  private db: any = null;

  constructor(private options: { binding?: string; schema: Record<string, any> }) {}

  async beforeModulesRegistered(app: Application, _hono: Hono): Promise<void> {
    this.logger ??= resolvePluginLogger(this.name);

    const appEnv = ComponentManager.getPlugin<Env>(ENV_SYMBOL);
    assertRuntimeSupport(appEnv.platform as AppRuntime, 'd1');

    const bindingName = this.resolveBindingName();
    this.logger.info(`connecting... (binding: ${bindingName})`);

    const binding = resolveBinding(bindingName);

    if (binding) {
      this.db = drizzle(binding, { schema: this.options.schema });
      ComponentManager.registerPlugin(DB_GLOBAL_KEY, this.db);
      return;
    }

    const resolveName = this.resolveBindingName.bind(this);
    const opts = this.options;
    const ensure = () => {
      if (!this.db) {
        const bn = resolveName();
        const b = resolveBinding(bn);
        if (b) {
          this.db = drizzle(b, { schema: opts.schema });
        }
      }
      return this.db;
    };

    ComponentManager.registerPlugin(
      DB_GLOBAL_KEY,
      new Proxy(
        {},
        {
          get(_, prop) {
            const instance = ensure();
            if (!instance) {
              throw new Error(`D1 binding "${resolveName()}" not found`);
            }
            const val = (instance as any)[prop];
            return typeof val === 'function' ? val.bind(instance) : val;
          },
        },
      ),
    );
  }

  async afterModulesRegistered(_app: Application, _hono: Hono): Promise<void> {
    if (!this.logger) return;

    const bindingName = this.resolveBindingName();

    try {
      if (!this.db) {
        const binding = resolveBinding(bindingName);
        if (!binding) {
          this.logger.warn(`health check skipped — binding "${bindingName}" not resolved`);
          return;
        }
        this.db = drizzle(binding, { schema: this.options.schema });
        ComponentManager.registerPlugin(DB_GLOBAL_KEY, this.db);
        this.logger.info(`connected (binding: ${bindingName})`);
      }

      await healthCheck(this.db, bindingName);
      this.logger.info(`health check passed (binding: ${bindingName})`);
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        `health check failed (binding: ${bindingName})`,
      );
    }
  }

  async close(): Promise<void> {
    this.logger?.info(`shutting down (binding: ${this.resolveBindingName()})`);
  }

  private resolveBindingName(): string {
    if (this.options.binding) return this.options.binding;
    return findD1Binding() ?? 'DB';
  }
}

function isD1Database(value: unknown): value is object {
  return (
    value !== null && typeof value === 'object' && typeof (value as any).prepare === 'function'
  );
}

function findD1Binding(): string | null {
  const sources: unknown[] = [globalThis, (globalThis as any).env, Platform.env()];
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const key of Object.keys(source as Record<string, unknown>)) {
      if (isD1Database((source as any)[key])) return key;
    }
  }
  return null;
}

async function healthCheck(db: any, bindingName: string): Promise<void> {
  try {
    await db.run('SELECT 1');
  } catch (cause) {
    throw new Error(
      `D1 health check failed for binding "${bindingName}": the binding has no active database session. ` +
        `Ensure the D1 database is bound correctly in your wrangler.toml and has been created (npx wrangler d1 create <name>).`,
      { cause },
    );
  }
}
