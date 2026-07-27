import type { CacheDriver } from '../types';

export interface KvNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; cursor?: string }): Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cursor?: string;
    cacheStatus: string | null;
  }>;
}

export interface CloudflareKvOptions {
  namespace: KvNamespace;
}

class CloudflareKvDriver implements CacheDriver {
  constructor(private namespace: KvNamespace) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.namespace) return null;
    const value = await this.namespace.get(key);
    if (value === null) return null;
    return JSON.parse(value) as T;
  }

  async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
    if (!this.namespace) return false;
    const serialized = JSON.stringify(value);
    const options: { expirationTtl?: number } = {};
    if (ttl) {
      options.expirationTtl = Math.max(ttl, 60);
    }
    await this.namespace.put(key, serialized, options);
    return true;
  }

  async delete(key: string): Promise<boolean> {
    if (!this.namespace) return false;
    await this.namespace.delete(key);
    return true;
  }

  async exists(key: string): Promise<boolean> {
    if (!this.namespace) return false;
    const value = await this.namespace.get(key);
    return value !== null;
  }

  async mget<T = unknown>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map((key) => this.get<T>(key)));
  }

  async mset(items: Array<{ key: string; value: unknown; ttl?: number }>): Promise<boolean> {
    await Promise.all(items.map((item) => this.set(item.key, item.value, item.ttl)));
    return true;
  }

  async deleteByPattern(pattern: string): Promise<number> {
    if (!this.namespace) return 0;
    const prefix = pattern.replace(/\*.*$/, '');
    let cursor: string | undefined;
    let total = 0;
    do {
      const result = await this.namespace.list({ prefix, cursor });
      if (result.keys.length > 0) {
        await Promise.all(result.keys.map((k) => this.namespace.delete(k.name)));
        total += result.keys.length;
      }
      cursor = result.list_complete ? undefined : result.cursor;
    } while (cursor);
    return total;
  }

  async incr(key: string): Promise<number> {
    if (!this.namespace) return 0;
    const raw = await this.namespace.get(key);
    const current = raw !== null ? Number(JSON.parse(raw)) : 0;
    const next = current + 1;
    await this.namespace.put(key, JSON.stringify(next));
    return next;
  }

  async decr(key: string): Promise<number> {
    if (!this.namespace) return 0;
    const raw = await this.namespace.get(key);
    const current = raw !== null ? Number(JSON.parse(raw)) : 0;
    const next = current - 1;
    await this.namespace.put(key, JSON.stringify(next));
    return next;
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.namespace) return false;
    const value = await this.namespace.get(key);
    if (value === null) return false;
    await this.namespace.put(key, value, { expirationTtl: ttl });
    return true;
  }

  async close(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    if (!this.namespace) return false;
    try {
      await this.namespace.get('__health_check__');
      return true;
    } catch {
      return false;
    }
  }
}

export function createCloudflareKvDriver(namespace: KvNamespace): CacheDriver {
  return new CloudflareKvDriver(namespace);
}
