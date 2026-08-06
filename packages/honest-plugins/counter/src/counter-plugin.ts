import type { ILogger } from '@rx-ted/packages-core';
import type { IPlugin, Application } from '@rx-ted/packages-honest';
import { ComponentManager, resolvePluginLogger } from '@rx-ted/packages-honest';
import { ENV_SYMBOL, type Env, resolveBinding, Platform } from '@rx-ted/packages-core';
import type { CounterDriver, FlushResult } from './types';
import { COUNTER_GLOBAL_KEY } from './constants';

export type FlushHandler = (key: string, delta: number) => Promise<void>;

export interface CounterDOStub {
  increment(delta?: number): Promise<number>;
  decrement(delta?: number): Promise<number>;
  getValue(): Promise<number>;
  getPending(): Promise<number>;
  consumePending(): Promise<number>;
  reset(): Promise<void>;
}

export interface CounterPluginOptions {
  /** DO class name as registered in wrangler.jsonc (default: "COUNTER_DO") */
  doBinding?: string;
}

export class CounterPlugin implements IPlugin {
  readonly name = 'counter-plugin';
  readonly version = '1.0.0';
  logger?: ILogger;

  private driver: CounterDriver | null = null;
  private flushHandlers = new Map<string, FlushHandler>();

  constructor(private options?: CounterPluginOptions) {}

  /**
   * Register a flush handler for a counter key pattern.
   * Called by the business layer to provide domain-specific DB write logic.
   */
  registerFlushHandler(keyPattern: string, handler: FlushHandler): void {
    this.flushHandlers.set(keyPattern, handler);
  }

  getClient(): CounterDriver {
    if (!this.driver) {
      throw new Error('Counter not initialized. Ensure beforeModulesRegistered has run.');
    }
    return this.driver;
  }

  async beforeModulesRegistered(app: Application, _hono: any): Promise<void> {
    this.logger ??= resolvePluginLogger(this.name);
    this.logger.info('Counter: initializing...');

    const appEnv = ComponentManager.hasPlugin(ENV_SYMBOL)
      ? ComponentManager.getPlugin<Env>(ENV_SYMBOL)
      : undefined;

    const doBinding = this.options?.doBinding || 'COUNTER_DO';
    const ns = resolveBinding(doBinding, appEnv);

    if (!ns) {
      if (Platform.platform() === 'cloudflare') {
        throw new Error(
          `Counter: DO binding "${doBinding}" not found. ` +
            `Add durable_objects binding to wrangler.jsonc.`,
        );
      }
      this.logger.warn(
        `Counter: DO binding "${doBinding}" not found on ${Platform.platform()}. ` +
          `Falling back to an in-memory driver (counters will not survive restarts).`,
      );
      this.driver = this.createMemoryDriver();
      ComponentManager.registerPlugin(COUNTER_GLOBAL_KEY, this.driver);
      return;
    }

    this.driver = this.createDriver(ns as any);
    ComponentManager.registerPlugin(COUNTER_GLOBAL_KEY, this.driver);
    this.logger.info('Counter: ready (Durable Objects)');
  }

  private createMemoryDriver(): CounterDriver {
    const values = new Map<string, number>();
    const pending = new Map<string, number>();

    const read = (map: Map<string, number>, key: string): number => map.get(key) ?? 0;

    const dispatch = async (key: string, delta: number): Promise<FlushResult> => {
      for (const [pattern, handler] of this.flushHandlers) {
        if (key.startsWith(pattern)) {
          try {
            await handler(key, delta);
            return { flushed: Math.abs(delta), success: true };
          } catch (err) {
            return {
              flushed: 0,
              success: false,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        }
      }
      return { flushed: Math.abs(delta), success: true };
    };

    return {
      async increment(key: string, delta = 1): Promise<number> {
        values.set(key, read(values, key) + delta);
        pending.set(key, read(pending, key) + delta);
        return read(values, key);
      },

      async decrement(key: string, delta = 1): Promise<number> {
        values.set(key, read(values, key) - delta);
        pending.set(key, read(pending, key) - delta);
        return read(values, key);
      },

      async value(key: string): Promise<number> {
        return read(values, key);
      },

      async mget(keys: string[]): Promise<number[]> {
        return keys.map((key) => read(values, key));
      },

      async flush(key: string): Promise<FlushResult> {
        const delta = read(pending, key);
        pending.set(key, 0);
        if (delta === 0) return { flushed: 0, success: true };
        return dispatch(key, delta);
      },

      async flushAll(): Promise<FlushResult> {
        let total = 0;
        let success = true;
        let error: string | undefined;
        for (const key of [...pending.keys()]) {
          const delta = read(pending, key);
          if (delta === 0) continue;
          const result = await dispatch(key, delta);
          pending.set(key, 0);
          total += result.flushed;
          if (!result.success) {
            success = false;
            error ??= result.error;
          }
        }
        return { flushed: total, success, error };
      },

      async pending(key: string): Promise<number> {
        return read(pending, key);
      },

      async close(): Promise<void> {},

      async healthCheck(): Promise<boolean> {
        return true;
      },
    };
  }

  private createDriver(namespace: {
    idFromName(name: string): { toString(): string };
    get(id: { toString(): string }): CounterDOStub;
  }): CounterDriver {
    const getStub = (key: string): CounterDOStub => {
      const id = namespace.idFromName(key);
      return namespace.get(id) as unknown as CounterDOStub;
    };

    const self = this;

    return {
      async increment(key: string, delta = 1): Promise<number> {
        return getStub(key).increment(delta);
      },

      async decrement(key: string, delta = 1): Promise<number> {
        return getStub(key).decrement(delta);
      },

      async value(key: string): Promise<number> {
        return getStub(key).getValue();
      },

      async mget(keys: string[]): Promise<number[]> {
        return Promise.all(keys.map((key) => getStub(key).getValue()));
      },

      async flush(key: string): Promise<FlushResult> {
        const stub = getStub(key);
        const delta = await stub.consumePending();
        if (delta === 0) return { flushed: 0, success: true };

        for (const [pattern, handler] of self.flushHandlers) {
          if (key.startsWith(pattern)) {
            try {
              await handler(key, delta);
              return { flushed: Math.abs(delta), success: true };
            } catch (err) {
              return {
                flushed: 0,
                success: false,
                error: err instanceof Error ? err.message : String(err),
              };
            }
          }
        }

        return { flushed: Math.abs(delta), success: true };
      },

      async flushAll(): Promise<FlushResult> {
        return { flushed: 0, success: true };
      },

      async pending(key: string): Promise<number> {
        return getStub(key).getPending();
      },

      async close(): Promise<void> {},

      async healthCheck(): Promise<boolean> {
        return true;
      },
    };
  }

  async close(): Promise<void> {
    this.driver = null;
  }
}
