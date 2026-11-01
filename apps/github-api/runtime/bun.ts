import { loadEnv } from '@rx-ted/packages-core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/index';

const __dirname = dirname(fileURLToPath(import.meta.url));
await loadEnv(resolve(__dirname, '..'));

const port = parseInt(process.env.PORT ?? '3001', 10);
const { app, hono } = await createApp();

// eslint-disable-next-line no-undef
Bun.serve({ fetch: hono.fetch, port });
console.log(`[github-api] server running at http://localhost:${port}`);
app.getPluginEngine().runBootstrap();