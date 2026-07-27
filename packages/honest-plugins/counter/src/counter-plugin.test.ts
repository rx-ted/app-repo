import { describe, it, expect, vi } from 'vitest';
import type { FlushHandler } from './counter-plugin';

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
