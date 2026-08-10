import type { ILogger } from '@rx-ted/packages-core';
import type { IPlugin, Application } from '@rx-ted/packages-honest';
import { ComponentManager, resolvePluginLogger } from '@rx-ted/packages-honest';
import { ENV_SYMBOL, type Env, resolveBinding, Platform } from '@rx-ted/packages-core';
import type { CounterDriver, FlushResult } from './types';
import { COUNTER_GLOBAL_KEY, COUNTER_PLUGIN_KEY } from './constants';

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
  /** Interval (ms) between automatic flushAll() passes. Set 0 to disable (default: 30000). */
  flushIntervalMs?: number;
  /** Debounce (ms) before flushing a single key after its last write. Set 0 to disable (default: 3000). */
  flushDebounceMs?: number;
}

export class CounterPlugin implements IPlugin {
  readonly name = 'counter-plugin';
  readonly version = '1.0.0';
  logger?: ILogger;

  private driver: CounterDriver | null = null;
  private flushHandlers = new Map<string, FlushHandler>();
  private hotKeys = new Set<string>();
  private flushTimer: ReturnType<typeof setInterval> | undefined;
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

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

    ComponentManager.registerPlugin(COUNTER_PLUGIN_KEY, this);

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
      this.driver = this.withDebouncedFlush(this.createMemoryDriver());
      ComponentManager.registerPlugin(COUNTER_GLOBAL_KEY, this.driver);
      this.startAutoFlush();
      return;
    }

    this.driver = this.withDebouncedFlush(this.createDriver(ns as any));
    ComponentManager.registerPlugin(COUNTER_GLOBAL_KEY, this.driver);
    this.startAutoFlush();
    this.logger.info('Counter: ready (Durable Objects)');
  }

  /**
   * Wrap a driver so writes are persisted shortly after they settle
   * (debounced per key), instead of waiting for the periodic flushAll().
   */
  private withDebouncedFlush(driver: CounterDriver): CounterDriver {
    return {
      ...driver,
      increment: async (key: string, delta = 1) => {
        const value = await driver.increment(key, delta);
        this.scheduleFlush(key);
        return value;
      },
      decrement: async (key: string, delta = 1) => {
        const value = await driver.decrement(key, delta);
        this.scheduleFlush(key);
        return value;
      },
    };
  }

  private scheduleFlush(key: string): void {
    const debounceMs = this.options?.flushDebounceMs ?? 3_000;
    if (debounceMs <= 0) return;
    const existing = this.debounceTimers.get(key);
    if (existing) clearTimeout(existing);
    this.debounceTimers.set(
      key,
      setTimeout(() => {
        this.debounceTimers.delete(key);
        void this.flushNow(key);
      }, debounceMs),
    );
  }

  private async flushNow(key: string): Promise<void> {
    if (!this.driver) return;
    try {
      const result = await this.driver.flush(key);
      if (!result.success) {
        this.logger?.warn(
          { key, error: result.error },
          'Counter: debounced flush failed, retrying on next pass',
        );
      }
    } catch (err) {
      this.logger?.error(
        { key, error: err instanceof Error ? err.message : String(err) },
        'Counter: debounced flush error',
      );
    }
  }

  private startAutoFlush(): void {
    const intervalMs = this.options?.flushIntervalMs ?? 30_000;
    if (intervalMs <= 0) return;
    this.flushTimer = setInterval(() => {
      void this.autoFlush();
    }, intervalMs);
  }

  private async autoFlush(): Promise<void> {
    if (!this.driver) return;
    try {
      const result = await this.driver.flushAll();
      if (!result.success) {
        this.logger?.warn(
          { error: result.error },
          'Counter: periodic flush failed, retrying on next pass',
        );
      } else if (result.flushed > 0) {
        this.logger?.debug({ flushed: result.flushed }, 'Counter: periodic flush complete');
      }
    } catch (err) {
      this.logger?.error(
        { error: err instanceof Error ? err.message : String(err) },
        'Counter: periodic flush error',
      );
    }
  }

  private createMemoryDriver(): CounterDriver {
    const values = new Map<string, number>();
    const pending = new Map<string, number>();
    const hotKeys = this.hotKeys;

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

    const consume = (key: string): number => {
      const delta = read(pending, key);
      pending.set(key, 0);
      return delta;
    };

    const settle = async (key: string): Promise<FlushResult> => {
      const delta = consume(key);
      if (delta === 0) return { flushed: 0, success: true };
      const result = await dispatch(key, delta);
      if (!result.success) {
        pending.set(key, read(pending, key) + delta);
        hotKeys.add(key);
      } else if (read(pending, key) === 0) {
        hotKeys.delete(key);
      }
      return result;
    };

    return {
      async increment(key: string, delta = 1): Promise<number> {
        values.set(key, read(values, key) + delta);
        pending.set(key, read(pending, key) + delta);
        hotKeys.add(key);
        return read(values, key);
      },

      async decrement(key: string, delta = 1): Promise<number> {
        values.set(key, read(values, key) - delta);
        pending.set(key, read(pending, key) - delta);
        hotKeys.add(key);
        return read(values, key);
      },

      async value(key: string): Promise<number> {
        return read(values, key);
      },

      async mget(keys: string[]): Promise<number[]> {
        return keys.map((key) => read(values, key));
      },

      async flush(key: string): Promise<FlushResult> {
        return settle(key);
      },

      async flushAll(): Promise<FlushResult> {
        let total = 0;
        let success = true;
        let error: string | undefined;
        for (const key of [...hotKeys]) {
          const result = await settle(key);
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

      async pendingKeys(): Promise<string[]> {
        return [...hotKeys];
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
        const value = await getStub(key).increment(delta);
        self.hotKeys.add(key);
        return value;
      },

      async decrement(key: string, delta = 1): Promise<number> {
        const value = await getStub(key).decrement(delta);
        self.hotKeys.add(key);
        return value;
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
              self.hotKeys.delete(key);
              return { flushed: Math.abs(delta), success: true };
            } catch (err) {
              await stub.increment(delta);
              return {
                flushed: 0,
                success: false,
                error: err instanceof Error ? err.message : String(err),
              };
            }
          }
        }

        self.hotKeys.delete(key);
        return { flushed: Math.abs(delta), success: true };
      },

      async flushAll(): Promise<FlushResult> {
        let total = 0;
        let success = true;
        let error: string | undefined;
        for (const key of [...self.hotKeys]) {
          const result = await this.flush(key);
          total += result.flushed;
          if (!result.success) {
            success = false;
            error ??= result.error;
          }
        }
        return { flushed: total, success, error };
      },

      async pending(key: string): Promise<number> {
        return getStub(key).getPending();
      },

      async pendingKeys(): Promise<string[]> {
        return [...self.hotKeys];
      },

      async close(): Promise<void> {},

      async healthCheck(): Promise<boolean> {
        return true;
      },
    };
  }

  async onShutdown(): Promise<void> {
    await this.close();
  }

  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    for (const timer of this.debounceTimers.values()) clearTimeout(timer);
    this.debounceTimers.clear();
    this.driver = null;
  }
}
