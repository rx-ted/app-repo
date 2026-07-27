import type { IGuard } from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { env } from '@rx-ted/packages-core';

export class EnvironmentGuard implements IGuard {
  canActivate(c: Context): boolean {
    const e = env.mode ?? 'prod';

    if (e === 'prod') {
      return false;
    }

    return true;
  }
}
