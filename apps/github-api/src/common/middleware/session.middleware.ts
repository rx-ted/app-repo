import type { Context, Next } from 'hono';
import { setCookie } from 'hono/cookie';
import { ComponentManager } from '@rx-ted/packages-honest';
import { CACHE_GLOBAL_KEY } from '@rx-ted/packages-honest-plugins/cache';

interface SessionRecord {
  sessionId: string;
  platformUsername?: string;
  githubLogin?: string;
  source?: string;
  frontend?: string;
  redirect?: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

const SESSION_COOKIE = 'session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function isValidSessionId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function cacheClient(): any {
  try {
    return ComponentManager.getPlugin(CACHE_GLOBAL_KEY);
  } catch {
    return null;
  }
}

export class SessionMiddleware {
  async use(c: Context, next: Next): Promise<Response | void> {
    let sessionId = c.req.header('x-session-id') || '';
    // Also read cookie if present.
    const cookieHeader = c.req.header('cookie') || '';
    const cookieMatch = cookieHeader.match(/(?:^|;\s*)(?:session|github_session)=([^;]+)/);
    if (!sessionId && cookieMatch) sessionId = decodeURIComponent(cookieMatch[1]);

    if (!sessionId || !isValidSessionId(sessionId)) {
      sessionId = crypto.randomUUID();
    }

    let session: SessionRecord | null = null;
    const cache = cacheClient();
    if (cache) {
      try {
        session = await (cache.get as any)(`session:${sessionId}`);
      } catch {
        session = null;
      }
    }

    const now = new Date();
    if (!session) {
      session = {
        sessionId,
        createdAt: now.toISOString(),
        lastActiveAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString(),
      };
    } else {
      session.lastActiveAt = now.toISOString();
    }

    if (cache) {
      try {
        await cache.set(`session:${sessionId}`, session, SESSION_TTL_SECONDS);
      } catch {
        // ignore cache failures
      }
    }

    c.set('session_id', sessionId);
    c.set('session', session);

    const isHttps = c.req.url.startsWith('https://');
    setCookie(c, SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'Lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });

    return next();
  }
}