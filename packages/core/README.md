# @rx-ted/packages-core

Unified runtime context, environment config, and logging for multi-platform TypeScript (Node, Bun, Deno, Cloudflare Workers, Vercel Edge).

```
packages/core/src/
├── config/          — Runtime detection, env vars, dotenv loading
│   ├── runtime.ts       Runtime detection (node/bun/deno/cf/edge)
│   ├── env.ts           Env class (get / var / require / setLogger)
│   ├── dotenv.ts        parseDotenv + async loadEnv with directory traversal
│   ├── prefixes.ts      resolveKey / filterKeys for prefixed env vars
│   ├── create-env.ts    Zod-schema-driven typed env validation
│   └── runtime-helpers.ts  createNodeContext / createCloudflareContext
├── logger/          — Console and Pino logging
│   ├── types.ts         ILogger / NOOP_LOGGER / LoggerOptions
│   ├── logger.ts        Logger class (Console fallback → Pino upgrade)
│   └── console-logger.ts  Zero-dependency console implementation
└── utils/
    └── shared.ts        ConfigError / assertString / assertNumber / assertBoolean / assertUrl
```

All tests are co-located with their source files (`*.test.ts` next to each module).

## Usage

```ts
import { env, Runtime, Logger } from '@rx-ted/packages-core';
```

### Runtime

Detect platform and access per-request context (ALS-based):

```ts
Runtime.platform()           // 'node' | 'bun' | 'deno' | 'cloudflare' | 'vercel-edge'
Runtime.env()                // platform-aware env source
Runtime.request()            // current Request (inside run())
Runtime.run({ platform, env, request }, () => { /* per-request scope */ })
```

### Env

```ts
env.get('PORT')              // string | undefined
env.get('PORT', 'number')    // number | undefined
env.var('DB_PATH', './db')   // string — falls back to './db' if unset
env.require('JWT_SECRET')    // string — throws if missing
env.has('SOME_KEY')          // boolean
env.setLogger(logger)        // inject ILogger for debug traces
```

### Logger

```ts
const log = new Logger({ name: 'app', level: 'debug' });
// or
const log = createLogger({ name: 'app', level: 'info', destination: 'logs/app.log' });

log.debug('connecting to %s', host);
log.info({ userId }, 'user logged in');
log.error(err, 'request failed');
log.child({ module: 'auth' }).warn('rate limit hit');
```

- **Node/Bun**: upgrades from `ConsoleLogger` → `pino` (async, best-effort)
- **Edge/CF**: uses `ConsoleLogger` directly (no dynamic imports)
- **File output**: set `destination` — adds `pino/file` transport automatically
- **NOOP_LOGGER**: import for tests or when logging should be silenced

### Dotenv

```ts
await loadEnv();             // searches .env up to 3 parent dirs from CWD
await loadEnv('/path');      // start search from /path
```

Strategy: `.env` (base) → merges `.env.dev` if `DEBUG=true` or `.env.prod` if not.
Safe in Cloudflare Workers (returns `{}` when filesystem unavailable).

### Zod-schema env validation

```ts
import { createEnv, z } from '@rx-ted/packages-core';

const cfg = createEnv({
  schema: { PORT: z.coerce.number().default(3000) },
  prefixes: ['MY_APP'],
});
// reads MY_APP_PORT → falls back to PORT → defaults to 3000
```

### getSchema

```ts
import { getSchema, z } from '@rx-ted/packages-core';

const db = getSchema('DB', {
  host: z.string().default('127.0.0.1'),
  port: z.coerce.number().default(3306),
  user: z.string(),
  password: z.string(),
});
// Reads DB_HOST, DB_PORT, DB_USER, DB_PASSWORD
```

## Platform compatibility

| Feature        | Node | Bun | Deno | Cloudflare | Vercel Edge |
|----------------|------|-----|------|------------|-------------|
| Runtime        | ✅   | ✅  | ✅   | ✅         | ✅          |
| Env (get/var)  | ✅   | ✅  | ✅   | ✅         | ✅          |
| Env (require)  | ✅   | ✅  | ✅   | ✅         | ✅          |
| loadEnv        | ✅   | ✅  | ❌   | ❌ (safe)  | ❌ (safe)   |
| Logger (console)| ✅   | ✅  | ✅   | ✅         | ✅          |
| Logger (pino)  | ✅   | ✅  | ❌   | ❌         | ❌          |
| Logger (file)  | ✅   | ✅  | ❌   | ❌         | ❌          |

The package exports a single barrel (`index.ts`) — all platforms import from `@rx-ted/packages-core`.
