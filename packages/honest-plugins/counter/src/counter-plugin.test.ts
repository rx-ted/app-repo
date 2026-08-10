import { describe, it, expect, vi } from 'vitest';
import type { FlushHandler } from './counter-plugin';
import { CounterPlugin } from './counter-plugin';
import { COUNTER_GLOBAL_KEY } from './constants';
import { ComponentManager } from '@rx-ted/packages-honest';

const silentLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  fatal: vi.fn(),
  trace: vi.fn(),
  child: vi.fn().mockReturnThis(),
} as never;

function createMockStub(initial = { current: 0, pending: 0, lastFlushAt: 0 }) {
  const state = { ...initial };
  return {
    increment: vi.fn(async (delta = 1) => {
      state.current += delta;
      state.pending += delta;
      return state.current;
    }),
    decrement: vi.fn(async (delta = 1) => {
      state.current -= delta;
      state.pending -= delta;
      return state.current;
    }),
    getValue: vi.fn(async () => state.current),
    getPending: vi.fn(async () => state.pending),
    consumePending: vi.fn(async () => {
      const d = state.pending;
      state.pending = 0;
      state.lastFlushAt = Date.now();
      return d;
    }),
    reset: vi.fn(async () => {
      state.current = 0;
      state.pending = 0;
    }),
    _state: state,
  };
}

/**
 * Helper: create a driver that delegates to a mock stub
 * Mirrors the driver logic from counter-plugin.ts without needing real DOs
 */
function createTestDriver(
  stub: ReturnType<typeof createMockStub>,
  flushHandlers: Record<string, FlushHandler> = {},
) {
  const handlers = new Map(Object.entries(flushHandlers));

  return {
    increment: async (_key: string, delta = 1) => stub.increment(delta),
    decrement: async (_key: string, delta = 1) => stub.decrement(delta),
    value: stub.getValue,
    mget: async (keys: string[]) => Promise.all(keys.map(() => stub.getValue())),
    pending: stub.getPending,
    close: async () => {},
    healthCheck: async () => true,
    flush: async (key: string) => {
      const delta = await stub.consumePending();
      if (delta === 0) return { flushed: 0, success: true };
      for (const [pattern, handler] of handlers) {
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
    flushAll: async () => ({ flushed: 0, success: true }),
  };
}

describe('CounterDriver', () => {
  it('should increment and return new value', async () => {
    const stub = createMockStub();
    const driver = createTestDriver(stub);

    const v1 = await driver.increment('stats:v:1');
    const v2 = await driver.increment('stats:v:1');
    expect(v1).toBe(1);
    expect(v2).toBe(2);
    expect(stub.increment).toHaveBeenCalledTimes(2);
  });

  it('should increment with custom delta', async () => {
    const stub = createMockStub();
    const driver = createTestDriver(stub);

    await driver.increment('stats:v:1', 5);
    expect(stub.increment).toHaveBeenCalledWith(5);
  });

  it('should decrement', async () => {
    const stub = createMockStub({ current: 10, pending: 0, lastFlushAt: 0 });
    const driver = createTestDriver(stub);

    await driver.decrement('stats:v:1', 3);
    expect(stub.decrement).toHaveBeenCalledWith(3);
  });

  it('should get value', async () => {
    const stub = createMockStub({ current: 42, pending: 0, lastFlushAt: 0 });
    const driver = createTestDriver(stub);

    const v = await driver.value('stats:v:1');
    expect(v).toBe(42);
    expect(stub.getValue).toHaveBeenCalled();
  });

  it('should get pending', async () => {
    const stub = createMockStub({ current: 10, pending: 5, lastFlushAt: 0 });
    const driver = createTestDriver(stub);

    const p = await driver.pending('stats:v:1');
    expect(p).toBe(5);
  });

  it('should flush and return delta', async () => {
    const stub = createMockStub({ current: 10, pending: 7, lastFlushAt: 0 });
    const driver = createTestDriver(stub);

    const result = await driver.flush('stats:v:1');
    expect(result.flushed).toBe(7);
    expect(result.success).toBe(true);
    expect(stub.consumePending).toHaveBeenCalled();
  });

  it('should return flushed: 0 when pending is 0', async () => {
    const stub = createMockStub({ current: 10, pending: 0, lastFlushAt: 0 });
    const driver = createTestDriver(stub);

    const result = await driver.flush('stats:v:1');
    expect(result.flushed).toBe(0);
    expect(result.success).toBe(true);
  });

  it('should call flushHandler on flush', async () => {
    const stub = createMockStub({ current: 10, pending: 5, lastFlushAt: 0 });
    const handler = vi.fn();
    const driver = createTestDriver(stub, { 'stats:v:': handler });

    await driver.flush('stats:v:1');
    expect(handler).toHaveBeenCalledWith('stats:v:1', 5);
  });

  it('should return error if flushHandler throws', async () => {
    const stub = createMockStub({ current: 10, pending: 5, lastFlushAt: 0 });
    const handler = vi.fn().mockRejectedValue(new Error('DB down'));
    const driver = createTestDriver(stub, { 'stats:v:': handler });

    const result = await driver.flush('stats:v:1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('DB down');
  });

  it('should mget multiple values', async () => {
    const stub = createMockStub({ current: 99, pending: 0, lastFlushAt: 0 });
    const driver = createTestDriver(stub);

    const values = await driver.mget(['a', 'b', 'c']);
    expect(values).toEqual([99, 99, 99]);
  });
});

describe('CounterPlugin in-memory fallback', () => {
  async function bootMemoryPlugin(handlers: Record<string, FlushHandler> = {}) {
    const plugin = new CounterPlugin({ flushIntervalMs: 0, flushDebounceMs: 0 });
    plugin.logger = silentLogger;
    for (const [pattern, handler] of Object.entries(handlers)) {
      plugin.registerFlushHandler(pattern, handler);
    }
    await plugin.beforeModulesRegistered({} as never, {} as never);
    return plugin;
  }

  it('falls back to an in-memory driver when the DO binding is missing', async () => {
    const plugin = await bootMemoryPlugin();
    const driver = ComponentManager.getPlugin(COUNTER_GLOBAL_KEY) as never;

    await (driver as any).increment('stats:v:1');
    await (driver as any).increment('stats:v:1', 5);
    expect(await (driver as any).value('stats:v:1')).toBe(6);
    expect(await (driver as any).pending('stats:v:1')).toBe(6);
    expect(silentLogger.warn).toHaveBeenCalled();
    expect(plugin.getClient()).toBe(driver);
  });

  it('decrements and reports mget values', async () => {
    const plugin = await bootMemoryPlugin();
    const driver = plugin.getClient();

    await driver.increment('stats:v:1', 10);
    await driver.decrement('stats:v:1', 3);
    expect(await driver.mget(['stats:v:1', 'stats:v:2'])).toEqual([7, 0]);
  });

  it('pendingKeys returns hot keys until they are flushed', async () => {
    const handler = vi.fn();
    const plugin = await bootMemoryPlugin({ 'stats:v:': handler });
    const driver = plugin.getClient();

    await driver.increment('stats:v:1', 2);
    await driver.increment('stats:l:2', 3);
    expect((await driver.pendingKeys()).sort()).toEqual(['stats:l:2', 'stats:v:1']);

    await driver.flushAll();
    expect(await driver.pendingKeys()).toEqual([]);
  });

  it('flush dispatches pending delta to registered handler and clears it', async () => {
    const handler = vi.fn();
    const plugin = await bootMemoryPlugin({ 'stats:v:': handler });
    const driver = plugin.getClient();

    await driver.increment('stats:v:1', 4);
    const result = await driver.flush('stats:v:1');

    expect(result).toEqual({ flushed: 4, success: true });
    expect(handler).toHaveBeenCalledWith('stats:v:1', 4);
    expect(await driver.pending('stats:v:1')).toBe(0);
  });

  it('flush returns success without handler when none match', async () => {
    const plugin = await bootMemoryPlugin();
    const driver = plugin.getClient();

    await driver.increment('unmatched:key', 2);
    const result = await driver.flush('unmatched:key');
    expect(result).toEqual({ flushed: 2, success: true });
  });

  it('flush reports handler errors without losing counts', async () => {
    const plugin = await bootMemoryPlugin({
      'stats:v:': vi.fn().mockRejectedValue(new Error('DB down')),
    });
    const driver = plugin.getClient();

    await driver.increment('stats:v:1', 3);
    const result = await driver.flush('stats:v:1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('DB down');
    expect(await driver.value('stats:v:1')).toBe(3);
  });

  it('flushAll drains every key through its handlers', async () => {
    const handler = vi.fn();
    const plugin = await bootMemoryPlugin({ 'stats:': handler });
    const driver = plugin.getClient();

    await driver.increment('stats:v:1', 2);
    await driver.increment('stats:l:2', 3);

    const result = await driver.flushAll();
    expect(result.flushed).toBe(5);
    expect(result.success).toBe(true);
    expect(handler).toHaveBeenCalledWith('stats:v:1', 2);
    expect(handler).toHaveBeenCalledWith('stats:l:2', 3);
    expect(await driver.pending('stats:v:1')).toBe(0);
    expect(await driver.pending('stats:l:2')).toBe(0);
  });

  it('reports an error when a handler throws during flushAll', async () => {
    const plugin = await bootMemoryPlugin({
      'stats:': vi.fn().mockRejectedValue(new Error('boom')),
    });
    const driver = plugin.getClient();

    await driver.increment('stats:v:1', 1);
    const result = await driver.flushAll();
    expect(result.success).toBe(false);
    expect(result.error).toBe('boom');
  });

  it('keeps pending on flush failure and retries on the next pass', async () => {
    let fail = true;
    const handler = vi.fn(async () => {
      if (fail) throw new Error('DB down');
    });
    const plugin = await bootMemoryPlugin({ 'stats:v:': handler });
    const driver = plugin.getClient();

    await driver.increment('stats:v:1', 3);
    const first = await driver.flush('stats:v:1');
    expect(first.success).toBe(false);
    expect(await driver.pending('stats:v:1')).toBe(3);

    fail = false;
    const second = await driver.flush('stats:v:1');
    expect(second).toEqual({ flushed: 3, success: true });
    expect(await driver.pending('stats:v:1')).toBe(0);
  });

  it('tracks hot keys again after a full flush', async () => {
    const handler = vi.fn();
    const plugin = await bootMemoryPlugin({ 'stats:v:': handler });
    const driver = plugin.getClient();

    await driver.increment('stats:v:1', 1);
    await driver.flushAll();
    await driver.increment('stats:v:1', 2);
    await driver.flushAll();

    expect(handler).toHaveBeenNthCalledWith(1, 'stats:v:1', 1);
    expect(handler).toHaveBeenNthCalledWith(2, 'stats:v:1', 2);
    expect(await driver.pending('stats:v:1')).toBe(0);
  });

  it('registers itself under the plugin key for flush-handler wiring', async () => {
    const plugin = await bootMemoryPlugin();
    expect(ComponentManager.getPlugin('app:counter-plugin')).toBe(plugin);
  });

  it('auto-flushes hot keys on the configured interval', async () => {
    vi.useFakeTimers();
    try {
      const handler = vi.fn();
      const plugin = new CounterPlugin({ flushIntervalMs: 100, flushDebounceMs: 0 });
      plugin.logger = silentLogger;
      plugin.registerFlushHandler('stats:v:', handler);
      await plugin.beforeModulesRegistered({} as never, {} as never);
      const driver = plugin.getClient();

      await driver.increment('stats:v:1', 2);
      await vi.advanceTimersByTimeAsync(100);

      expect(handler).toHaveBeenCalledWith('stats:v:1', 2);
      expect(await driver.pending('stats:v:1')).toBe(0);
      await plugin.close();
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears the auto-flush timer on close', async () => {
    vi.useFakeTimers();
    try {
      const handler = vi.fn();
      const plugin = new CounterPlugin({ flushIntervalMs: 100, flushDebounceMs: 0 });
      plugin.logger = silentLogger;
      plugin.registerFlushHandler('stats:v:', handler);
      await plugin.beforeModulesRegistered({} as never, {} as never);
      const driver = plugin.getClient();

      await driver.increment('stats:v:1', 2);
      await plugin.close();
      await vi.advanceTimersByTimeAsync(300);

      expect(handler).not.toHaveBeenCalled();
      expect(await driver.pending('stats:v:1')).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('debounces a per-key flush shortly after writes', async () => {
    vi.useFakeTimers();
    try {
      const handler = vi.fn();
      const plugin = new CounterPlugin({ flushIntervalMs: 0, flushDebounceMs: 3000 });
      plugin.logger = silentLogger;
      plugin.registerFlushHandler('stats:v:', handler);
      await plugin.beforeModulesRegistered({} as never, {} as never);
      const driver = plugin.getClient();

      await driver.increment('stats:v:1', 1);
      await vi.advanceTimersByTimeAsync(1000);
      await driver.increment('stats:v:1', 2);
      await vi.advanceTimersByTimeAsync(2999);

      expect(handler).not.toHaveBeenCalled();
      expect(await driver.pending('stats:v:1')).toBe(3);

      await vi.advanceTimersByTimeAsync(1);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('stats:v:1', 3);
      expect(await driver.pending('stats:v:1')).toBe(0);
      await plugin.close();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps pending and retries when a debounced flush fails', async () => {
    vi.useFakeTimers();
    try {
      let fail = true;
      const handler = vi.fn(async () => {
        if (fail) throw new Error('DB down');
      });
      const plugin = new CounterPlugin({ flushIntervalMs: 0, flushDebounceMs: 3000 });
      plugin.logger = silentLogger;
      plugin.registerFlushHandler('stats:v:', handler);
      await plugin.beforeModulesRegistered({} as never, {} as never);
      const driver = plugin.getClient();

      await driver.increment('stats:v:1', 3);
      await vi.advanceTimersByTimeAsync(3000);

      expect(handler).toHaveBeenCalledWith('stats:v:1', 3);
      expect(await driver.pending('stats:v:1')).toBe(3);

      fail = false;
      await driver.increment('stats:v:1', 2);
      await vi.advanceTimersByTimeAsync(3000);

      expect(handler).toHaveBeenLastCalledWith('stats:v:1', 5);
      expect(await driver.pending('stats:v:1')).toBe(0);
      await plugin.close();
    } finally {
      vi.useRealTimers();
    }
  });
});
