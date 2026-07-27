import { LOGGER_SYMBOL, type ILogger } from '@rx-ted/packages-core';
import { ComponentManager } from '@rx-ted/packages-honest';
import type { Context, Next } from 'hono';

export class RequestLoggerMiddleware {
  async use(c: Context, next: Next): Promise<void> {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;

    const logger: ILogger | undefined = ComponentManager.hasPlugin(LOGGER_SYMBOL)
      ? ComponentManager.getPlugin<ILogger>(LOGGER_SYMBOL)
      : undefined;

    logger?.info({ method, path }, `${method} ${path}`);

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    if (status >= 500) {
      logger?.error(
        { method, path, status, duration },
        `${method} ${path} ${status} ${duration}ms`,
      );
    } else if (status >= 400) {
      logger?.warn({ method, path, status, duration }, `${method} ${path} ${status} ${duration}ms`);
    } else {
      logger?.info({ method, path, status, duration }, `${method} ${path} ${status} ${duration}ms`);
    }
  }
}
