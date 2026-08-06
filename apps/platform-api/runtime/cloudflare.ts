import type { ExecutionContext } from 'hono';
import { Hono } from 'hono';
import { Platform } from '@rx-ted/packages-core';
import { CounterDO } from '@rx-ted/packages-honest-plugins/counter/do';
import { createApp } from '../src/index';

export { CounterDO };

let cachedHono: Hono | null = null;

function addCorsHeaders(request: Request, response: Response): Response {
  const origin = request.headers.get('Origin') ?? '*';
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Allow-Methods', '*');
  headers.set('Access-Control-Allow-Headers', '*');
  headers.set('Access-Control-Expose-Headers', '*');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, executionCtx: ExecutionContext) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': request.headers.get('Origin') ?? '*',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    return Platform.run(
      {
        platform: 'cloudflare',
        env: env as Record<string, any>,
        request,
        executionContext: executionCtx,
        waitUntil: executionCtx.waitUntil.bind(executionCtx),
      },
      async () => {
        if (!cachedHono) {
          const hono = new Hono();
          const { app } = await createApp(hono);

          // Runtime Phase: HTTP 已就绪，后台启动所有服务 via waitUntil
          app.getContext().waitUntil(app.getPluginEngine().runBootstrap());

          cachedHono = hono;
        }
        const response = await cachedHono.fetch(request, env, executionCtx);
        return addCorsHeaders(request, response);
      },
    );
  },
};
