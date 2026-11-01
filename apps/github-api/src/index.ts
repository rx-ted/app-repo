import 'reflect-metadata';

import type { Hono } from 'hono';
import { Application } from '@rx-ted/packages-honest';
import AppModule from '@/app.module';
import { env } from '@rx-ted/packages-core';
import { homeHandler } from '@/pages/home';
import { callbackHandler } from '@/pages/callback';
import { SessionMiddleware } from '@/common/middleware/session.middleware';
import { githubHandler } from '@/pages/github';
import { notFoundHandler } from '@/pages/not-found';
import { getPlugins } from '@/lib/plugins';

function parseApiPrefix(raw: string): { prefix?: string; version?: number } {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '/') return {};
  const versionMatch = trimmed.match(/\/v(\d+)$/);
  if (versionMatch) {
    return {
      prefix: trimmed.replace(/\/v\d+$/, '').replace(/^\//, ''),
      version: Number(versionMatch[1]),
    };
  }
  return { prefix: trimmed.replace(/^\//, '') };
}

export async function createApp(existingHono?: Hono): Promise<{ app: Application; hono: Hono }> {
  const plugins = await getPlugins();
  const apiPrefix = '/api/v1';
  const routing = parseApiPrefix(apiPrefix);

  const app = new Application({
    debug: env.DEBUG,
    notFound: notFoundHandler,
    hono: { strict: true },
    routing,
    components: { middleware: [SessionMiddleware] },
    existingHono,
    plugins,
  });
  await app.create(AppModule);

  const hono = app.hono;
  hono.get('/', homeHandler);
  hono.get('/callback', callbackHandler);
  hono.get('/github', githubHandler);
  hono.get('/oauth/github/callback', githubHandler);
  hono.get('/openapi.json', (c) => c.redirect(`${apiPrefix}/openapi.json`));
  hono.get('/docs', (c) => c.redirect(`${apiPrefix}/docs`));
  return { app, hono };
}

export type HonoApp = Awaited<ReturnType<typeof createApp>>['hono'];