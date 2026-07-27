import { createClient } from 'redis';
import type { CacheDriver } from '../types';

type RedisClientInstance = ReturnType<typeof createClient>;

export interface RedisClientOptions {
  url?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  db?: number;
}

export async function createRedisDriver(options: RedisClientOptions): Promise<CacheDriver> {
  const client = createClient(
    options.url
      ? { url: options.url }
      : {
          socket: {
            host: options.host ?? '127.0.0.1',
            port: options.port ?? 6379,
          },
          username: options.username,
          password: options.password,
          database: options.db ?? 0,
        },
  );

  await client.connect();

  return new RedisDriver(client);
}

class RedisDriver implements CacheDriver {
  constructor(private client: RedisClientInstance) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (value === null) return null;
    return JSON.parse(value) as T;
  }

  async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
    const serialized = JSON.stringify(value);
    let result: string;
    if (ttl) {
      result = await this.client.setEx(key, ttl, serialized);
    } else {
      result = (await this.client.set(key, serialized)) ?? '';
    }
    return result === 'OK';
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.client.del(key);
    return result > 0;
  }

  async deleteByPattern(pattern: string): Promise<number> {
    let cursor = 0;
    let total = 0;
    do {
      const result = await this.client.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = result.cursor;
      if (result.keys.length > 0) {
        const count = await this.client.del(result.keys);
        total += count;
      }
    } while (cursor !== 0);
    return total;
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result > 0;
  }

  async mget<T = unknown>(keys: string[]): Promise<(T | null)[]> {
    const values = await this.client.mGet(keys);
    return values.map((v: string | null) => (v ? (JSON.parse(v) as T) : null));
  }

  async mset(items: Array<{ key: string; value: unknown; ttl?: number }>): Promise<boolean> {
    const pipeline = this.client.multi();
    for (const item of items) {
      const serialized = JSON.stringify(item.value);
      if (item.ttl) {
        pipeline.setEx(item.key, item.ttl, serialized);
      } else {
        pipeline.set(item.key, serialized);
      }
    }
    const results = await pipeline.exec();
    if (!results) return false;
    return results.every((r: unknown) => r === 'OK');
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    const result = (await this.client.expire(key, ttl)) as unknown as number;
    return result === 1;
  }

  async close(): Promise<void> {
    await this.client.quit();
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }
}
