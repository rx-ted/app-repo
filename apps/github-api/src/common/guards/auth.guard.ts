import { Service } from '@rx-ted/packages-honest';
import type { IGuard } from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { isPublicHandler } from './is-public.util';

@Service()
export class AuthGuard implements IGuard {
  async canActivate(c: Context): Promise<boolean> {
    if (isPublicHandler(c)) return true;

    const session = c.get('session') as { githubLogin?: string; platformUsername?: string } | undefined;
    let username = session?.githubLogin ?? session?.platformUsername ?? c.req.query('username') ?? c.req.header('x-username') ?? 'anonymous';

    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const parts = token.split('.');
      if (parts.length === 3) {
        try {
          const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
          if (payload?.username) username = String(payload.username);
        } catch {
          // ignore
        }
      }
    }

    if (!username || username === 'anonymous') {
      // allow anonymous but not throw to keep extraction usable
    }

    c.set('user', { userId: username, username, roles: [], permissions: [] });
    return true;
  }
}