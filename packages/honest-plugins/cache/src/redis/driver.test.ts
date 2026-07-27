import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRedisDriver } from './driver';
import type { RedisClientOptions } from './driver';

vi.mock('redis', () => {
  const mockClient = {
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    set: vi.fn(),
    setEx: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    mGet: vi.fn(),
    multi: vi.fn(() => mockMulti),
    incr: vi.fn(),
    decr: vi.fn(),
    expire: vi.fn(),
    scan: vi.fn(),
    ping: vi.fn(),
    quit: vi.fn().mockResolvedValue(undefined),
  };

  const mockMulti = {
    set: vi.fn(() => mockMulti),
    setEx: vi.fn(() => mockMulti),
    exec: vi.fn(),
  };

  return {
    createClient: vi.fn(() => mockClient),
  };
});

describe('RedisDriver', () => {
  const options: RedisClientOptions = {
    host: '127.0.0.1',
    port: 6379,
    db: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates driver with url option', async () => {
    const { createClient } = await import('redis');
    await createRedisDriver({ url: 'redis://localhost:6379' });
    expect(createClient).toHaveBeenCalledWith({ url: 'redis://localhost:6379' });
  });

  it('creates driver with host/port options', async () => {
    const { createClient } = await import('redis');
    await createRedisDriver(options);
    expect(createClient).toHaveBeenCalledWith({
      socket: { host: '127.0.0.1', port: 6379 },
      username: undefined,
      password: undefined,
      database: 0,
    });
  });

  it('connects to redis', async () => {
    const redis = await import('redis');
    const createClient = redis.createClient as any;

    await createRedisDriver(options);
    expect(createClient).toHaveBeenCalledOnce();
    expect(createClient().connect).toHaveBeenCalled();
  });
});
