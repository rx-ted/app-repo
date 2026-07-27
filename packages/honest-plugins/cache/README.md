# @rx-ted/packages-honest-plugins-cache

Cache plugin for [@rx-ted/packages-honest](https://github.com/rx-ted/honest). Supports Redis, Cloudflare KV, and in-memory caching.

## Features

- **Multi-driver**: Redis, Cloudflare KV, local in-memory
- **Auto-detect**: driver resolved from `CACHE` env var
- **Runtime-agnostic**: works on Node.js, Bun, Deno, and Cloudflare Workers
- **Cacheable helper**: `cacheable()` for easy cache-through patterns

## Installation

```bash
pnpm add @rx-ted/packages-honest-plugins-cache
```

Peer dependencies: `@rx-ted/packages-honest`, `hono`

## Usage

### Register as a plugin

```ts
import { CachePlugin } from '@rx-ted/packages-honest-plugins/cache';

const plugin = new CachePlugin({
  // driver is auto-detected from CACHE env var
});

const { hono } = await Application.create(AppModule, {
  plugins: [plugin],
});
```

### Subpath exports

```ts
import { CachePlugin } from '@rx-ted/packages-honest-plugins/cache'       // auto-detect
import { CachePlugin } from '@rx-ted/packages-honest-plugins/cache/redis' // Redis
import { CachePlugin } from '@rx-ted/packages-honest-plugins/cache/local' // in-memory
```

### Access the cache

```ts
import { ComponentManager } from '@rx-ted/packages-honest';
import { CacheService } from '@rx-ted/packages-honest-plugins/cache';

const cache = ComponentManager.getPlugin<CacheService>('cache');
await cache.set('key', 'value', 3600); // TTL in seconds
const value = await cache.get('key');
await cache.del('key');
```

### Cacheable helper

```ts
import { cacheable } from '@rx-ted/packages-honest-plugins/cache';

const user = await cacheable('user:123', 300, async () => {
  return await db.query.users.findFirst({ where: eq(users.id, '123') });
});
```

## Supported Drivers

| Driver | Env var | Package |
|--------|---------|---------|
| Redis | `CACHE=redis` | `redis` |
| Cloudflare KV | `CACHE=kv` | (Wrangler bindings) |
| Local (memory) | `CACHE=local` | (none) |

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm test` | Run tests |
| `pnpm build` | Build |
