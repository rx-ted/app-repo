export interface FlushResult {
  flushed: number;
  success: boolean;
  error?: string;
}

export interface CounterDriver {
  increment(key: string, delta?: number): Promise<number>;
  decrement(key: string, delta?: number): Promise<number>;
  value(key: string): Promise<number>;
  mget(keys: string[]): Promise<number[]>;
  flush(key: string): Promise<FlushResult>;
  flushAll(): Promise<FlushResult>;
  pending(key: string): Promise<number>;
  /** Snapshot of keys touched since the last successful flush (hot keys). */
  pendingKeys(): Promise<string[]>;
  close(): Promise<void>;
  healthCheck(): Promise<boolean>;
}
