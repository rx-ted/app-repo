import { loadEnv } from '@rx-ted/packages-core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/index';

const __dirname = dirname(fileURLToPath(import.meta.url));

await loadEnv(resolve(__dirname, '..'));

const port = parseInt(process.env.PORT ?? '3000', 10);

if (Number.isNaN(port) || port < 1 || port > 65535) {
  console.error(`[platform-api] invalid PORT: ${process.env.PORT}`);
  process.exit(1);
}

const { app, hono } = await createApp();

// eslint-disable-next-line no-undef
Bun.serve({
  fetch: hono.fetch,
  port,
  error(error) {
    console.error('[platform-api] Bun.serve error:', error);
    return new Response(error.message, { status: 500 });
  },
});

console.log(`[platform-api] server running at http://localhost:${port}`);
app.getPluginEngine().runBootstrap();
