import type { IGuard } from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { env } from '@rx-ted/packages-core';

export class InitKeyGuard implements IGuard {
  canActivate(c: Context): boolean {
    const configuredKey = env.get('INIT_KEY');

    if (!configuredKey) {
      return true;
    }

    const headerKey = c.req.header('X-Init-Key');

    if (!headerKey || headerKey !== configuredKey) {
      return false;
    }

    return true;
  }
}
