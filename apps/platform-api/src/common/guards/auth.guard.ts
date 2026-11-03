import jwt from 'jsonwebtoken';
import { Inject, Service } from '@rx-ted/packages-honest';
import type { IGuard } from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { IAuthContextService } from '@/common/guards/auth-context.interface';
import { AuthContextService } from '@/modules/auth/auth-context.service';
import { isPublicHandler } from '@/common/guards/is-public.util';
import { AUTH } from '@/constants/auth';
import { logger } from '@/lib/logger';
import { env } from '@rx-ted/packages-core';

@Service()
export class AuthGuard implements IGuard {
  constructor(@Inject(AuthContextService) private authContext: IAuthContextService) {}

  async canActivate(c: Context): Promise<boolean> {
    if (isPublicHandler(c)) return true;

    const authHeader = c.req.header('Authorization');
    let username: string | undefined;
    let sessionId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      if (!token) {
        throw new HTTPException(401, { message: 'Token is empty' });
      }

      let payload: { username: string; sessionId?: string; tokenVersion?: number };
      try {
        payload = jwt.verify(token, env.require('JWT_SECRET')) as {
          username: string;
          sessionId?: string;
          tokenVersion?: number;
        };
      } catch {
        throw new HTTPException(401, { message: 'Invalid or expired token' });
      }

      username = payload.username;
      sessionId = payload.sessionId ?? null;

      // session validation when a sessionId is present in the bearer token.
      if (sessionId) {
        const session = await this.authContext.findSession(sessionId);
        if (!session) {
          throw new HTTPException(401, { message: 'Session has been revoked' });
        }

        const anomalyMode = env.var('ANOMALY_DETECTION_MODE', 'off');
        if (anomalyMode !== 'off') {
          const currentIp =
            c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? null;
          if (session.ip && currentIp && session.ip !== currentIp) {
            const lastActive = new Date(session.lastActiveAt).getTime();
            const now = Date.now();
            if (now - lastActive < AUTH.ANOMALY_WINDOW_MS) {
              if (anomalyMode === 'reject') {
                throw new HTTPException(401, { message: 'Suspicious activity detected' });
              }
              logger.warn(
                { sessionId, oldIp: session.ip, newIp: currentIp },
                'Anomaly: IP changed for session',
              );
            }
          }
        }

        await this.authContext.touchSession(session);
      }
    } else {
      // Fall back to the HttpOnly session-id cookie when no bearer token is supplied.
      const cookieHeader = c.req.header('Cookie') || '';
      const cookieMatch = cookieHeader.match(/(?:^|;\\s*)session=([^;]+)/);
      const sessionCookie = cookieMatch ? decodeURIComponent(cookieMatch[1]) : '';
      if (!sessionCookie) {
        throw new HTTPException(401, { message: 'Missing or invalid authorization header' });
      }

      const session = await this.authContext.findSession(sessionCookie);
      if (!session?.username) {
        throw new HTTPException(401, { message: 'Session has been revoked' });
      }

      username = session.username;
      sessionId = session.id;
      await this.authContext.touchSession(session);
    }

    if (!username) {
      throw new HTTPException(401, { message: 'Missing or invalid authorization header' });
    }

    const user = await this.authContext.resolveUser(username);
    if (!user) {
      throw new HTTPException(401, { message: 'User not found' });
    }

    c.set('user', user);
    c.set('sessionId', sessionId);
    return true;
  }
}
