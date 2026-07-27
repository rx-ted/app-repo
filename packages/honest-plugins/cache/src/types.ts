export interface CacheDriver {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttl?: number): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  mget<T = unknown>(keys: string[]): Promise<(T | null)[]>;
  mset(items: Array<{ key: string; value: unknown; ttl?: number }>): Promise<boolean>;
  deleteByPattern(pattern: string): Promise<number>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<boolean>;
  close(): Promise<void>;
  healthCheck(): Promise<boolean>;
}
