import { hono } from '../src/index.ts';

Deno.serve({ port: 3000 }, hono.fetch);
