import { serve } from '@hono/node-server';
import { createApp } from '../src/index';

const { app, hono } = await createApp();
const port = parseInt(process.env.PORT ?? '3001', 10);
const server = serve({ fetch: hono.fetch, port }, (info) => {
  console.log(`[github-api] server running at http://localhost:${info.port}`);
  app.getPluginEngine().runBootstrap();
});
process.on('SIGTERM', async () => { await app.getPluginEngine().runShutdown(); server.close(() => process.exit(0)); });
process.on('SIGINT', async () => { await app.getPluginEngine().runShutdown(); server.close(() => process.exit(0)); });