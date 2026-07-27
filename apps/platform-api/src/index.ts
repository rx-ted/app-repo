import 'reflect-metadata';

import type { Hono } from 'hono';
import { Application } from '@rx-ted/packages-honest';
import AppModule from '@/app.module';
import { env } from '@rx-ted/packages-core';
import { ApiErrorFilter } from '@/common/filters';
import {
  RequestLoggerMiddleware,
  RequestContextMiddleware,
  ResponseWrapper,
} from '@/common/middleware';
import { logger } from '@/lib/logger';
import { homeHandler } from '@/pages/home';
import { notFoundHandler } from '@/pages/not-found';
import { getPlugins } from '@/lib/plugins';
import SystemInitService from '@/modules/system/system-init.service';
import { envParams } from '@/constants/env';

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
  const apiPrefix = envParams.API_PREFIX;
  const routing = parseApiPrefix(apiPrefix);
  logger.info({ apiPrefix, routing }, '[app] routing configured');

  const app = new Application({
    debug: env.DEBUG,
    notFound: notFoundHandler,
    hono: { strict: true },
    routing,
    components: {
      middleware: [RequestLoggerMiddleware, RequestContextMiddleware, ResponseWrapper],
      filters: [ApiErrorFilter],
    },
    logger,
    existingHono,
    plugins,
  });
  await app.create(AppModule);

  if (!(env.get('VITEST') === 'true')) {
    try {
      const initService = app.getContainer().resolve(SystemInitService);
      const results = await initService.runAllIfNeeded();
      if (results.length > 0) {
        for (const r of results) {
          if (r.status === 'ok') {
            logger.info(`[seed] ${r.module} ok`);
          } else {
            logger.error(`[seed] ${r.module} failed: ${r.error}`);
          }
        }
      }
    } catch (err) {
      logger.warn({ err }, '[seed] auto-seed skipped (db not ready?)');
    }
  }

  const hono = app.hono;

  hono.get('/', homeHandler);
  hono.get('/openapi.json', (c) => c.redirect(`${apiPrefix}/openapi.json`));
  hono.get('/docs', (c) => c.redirect(`${apiPrefix}/docs`));
  return { app, hono };
}

export type HonoApp = Awaited<ReturnType<typeof createApp>>['hono'];
