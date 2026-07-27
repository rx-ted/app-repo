import type { IMiddleware } from '@rx-ted/packages-honest';
import type { Context, Next } from 'hono';

export class RequestContextMiddleware implements IMiddleware {
  async use(c: Context, next: Next): Promise<void> {
    c.set('requestId', crypto.randomUUID());
    c.set('serviceName', 'platform-api');
    await next();
  }
}
