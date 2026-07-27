import type { ILogger } from '@rx-ted/packages-core';

export interface MailCacheDriver {
  incr(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<boolean>;
  get?(key: string): Promise<unknown>;
}

export class RateLimiter {
  constructor(
    private quota: number,
    private providerName: string,
    private cache?: MailCacheDriver | null,
    private logger?: ILogger,
  ) {}

  async checkAndIncrement(): Promise<void> {
    if (!this.cache) return;
    const key = `mail:quota:${this.providerName}:${today()}`;
    const count = await this.cache.incr(key);
    if (count === 1) {
      await this.cache.expire(key, 86400);
    }
    if (count > this.quota) {
      this.logger?.warn?.('Daily quota exceeded', {
        provider: this.providerName,
        quota: this.quota,
      });
      const { MailQuotaExceededError } = await import('./types');
      throw new MailQuotaExceededError(this.providerName, this.quota);
    }
  }

  async markHealthCheckDone(): Promise<void> {
    if (!this.cache) return;
    const key = `mail:healthcheck:${this.providerName}:${today()}`;
    await this.cache.incr(key);
    await this.cache.expire(key, 86400);
  }

  async wasHealthCheckDoneToday(): Promise<boolean> {
    if (!this.cache) return false;
    const key = `mail:healthcheck:${this.providerName}:${today()}`;
    if (typeof this.cache.get === 'function') {
      const val = await this.cache.get(key);
      return val !== null && val !== undefined;
    }
    return false;
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
