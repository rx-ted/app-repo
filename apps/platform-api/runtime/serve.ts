import { serve } from '@hono/node-server';
import { createApp } from '../src/index';

const { app, hono } = await createApp();

const port = parseInt(process.env.PORT ?? '3000', 10);

if (Number.isNaN(port) || port < 1 || port > 65535) {
  console.error(`[platform-api] invalid PORT: ${process.env.PORT}`);
  process.exit(1);
}

const server = serve({ fetch: hono.fetch, port }, async (info) => {
  console.log(`[platform-api] server running at http://localhost:${info.port}`);
  // Runtime Phase: HTTP 已就绪，后台启动所有服务
  await app.getPluginEngine().runBootstrap();
  console.log('[platform-api] application ready');
});

const shutdown = async (signal: string) => {
  console.log(`[platform-api] received ${signal}, shutting down...`);
  await app.getPluginEngine().runShutdown();
  server.close(() => process.exit(0));
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
