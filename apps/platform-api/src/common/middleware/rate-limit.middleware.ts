import { Service, Inject } from '@rx-ted/packages-honest';
import { CacheService } from '@rx-ted/packages-honest-plugins/cache';
import {
  HONEST_PIPELINE_CONTROLLER_KEY,
  HONEST_PIPELINE_HANDLER_KEY,
} from '@rx-ted/packages-honest';
import type { IMiddleware } from '@rx-ted/packages-honest';
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { RATE_LIMIT_KEY, type RateLimitRule } from '@/common/decorators/rate-limit.decorator';
import { env } from '@rx-ted/packages-core';

@Service()
export class RateLimitMiddleware implements IMiddleware {
  constructor(@Inject(CacheService) private cache: CacheService) {}

  async use(c: Context, next: Next): Promise<Response | void> {
    if (env.var('RATE_LIMIT_ENABLED', 'false') !== 'true') return next();
    if (!this.cache) return next();

    const rules = this.getRules(c);
    if (!rules?.length) return next();

    for (const rule of rules) {
      const key = await this.getKey(c, rule);
      if (!key) continue;

      const count = (await this.cache.get<number>(key)) ?? 0;
      if (count >= rule.limit) {
        throw new HTTPException(429, { message: 'Too many requests' });
      }
    }

    await next();

    const status = c.res?.status;
    if (!status || status >= 500) return;

    for (const rule of rules) {
      const key = await this.getKey(c, rule);
      if (!key) continue;

      const count = (await this.cache.get<number>(key)) ?? 0;
      await this.cache.set(key, count + 1, rule.window);
    }
  }

  private getRules(c: Context): RateLimitRule[] | null {
    const controllerClass = c.get(HONEST_PIPELINE_CONTROLLER_KEY) as
      | (new (
          ...args: any[]
        ) => any)
      | undefined;
    if (!controllerClass) return null;

    const handlerName = c.get(HONEST_PIPELINE_HANDLER_KEY) as string | undefined;
    return (
      (handlerName && Reflect.getMetadata(RATE_LIMIT_KEY, controllerClass, handlerName)) ??
      (Reflect.getMetadata(RATE_LIMIT_KEY, controllerClass) as RateLimitRule[] | undefined) ??
      null
    );
  }

  private async getKey(c: Context, rule: RateLimitRule): Promise<string | null> {
    switch (rule.keyBy) {
      case 'ip': {
        const ip =
          c.req.header('x-forwarded-for') ??
          c.req.header('cf-connecting-ip') ??
          c.req.header('x-real-ip') ??
          'unknown';
        return `rl:ip:${ip}:${rule.window}`;
      }
      case 'user': {
        const user = c.get('user') as { username?: string } | undefined;
        if (user?.username) {
          return `rl:user:${user.username}:${rule.window}`;
        }
        try {
          const body = (await c.req.json()) as { username?: string };
          if (body?.username) {
            return `rl:user:${body.username}:${rule.window}`;
          }
        } catch {}
        return null;
      }
    }
  }
}
