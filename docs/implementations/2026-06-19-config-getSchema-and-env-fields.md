# Config Package: `getSchema` + `env` Runtime Fields

> **Status: IMPLEMENTED** — `getSchema` 和 `env` 字段已在 `packages/core` 中实现。

## Overview

Add two capabilities to `@rx-ted/packages-config`:

1. **`getSchema(prefix, schema, opts?)`** — parse env vars with a prefix into a typed JSON object, using Zod schema for validation and default values
2. **`env` runtime fields** — expose `ENV`, `PLATFORM`, `DEBUG`, `IS_PROD`, `IS_DEV`, `IS_TEST`, `ENV_KEYS` on the `env` singleton

No new files. Only modify existing files under `packages/config/src/`.

---

## 1. `getSchema`

### Purpose

Replace manually wiring env vars one by one into connection configs:

```typescript
// Before
connection: {
  host: appConfig.require('DB_HOST'),
  port: parseInt(appConfig.require('DB_PORT'), 10),
  user: appConfig.require('DB_USER'),
  password: appConfig.require('DB_PASSWORD'),
  database: appConfig.require('DB_DATABASE'),
}

// After
const db = getSchema('DB', {
  host: z.string().default('127.0.0.1'),
  port: z.coerce.number().default(3306),
  user: z.string(),
  password: z.string(),
  database: z.string(),
})
connection: { ...db }
```

### Signature

```typescript
function getSchema<T extends Record<string, z.ZodTypeAny>>(
  prefix: string,
  schema: T,
  options?: {
    env?: Record<string, string | undefined>
  }
): { [K in keyof T]: z.output<T[K]> }
```

### Behavior

1. Iterates schema keys. For each key `host`, constructs env var name `prefix + '_' + key.toUpperCase()` → `DB_HOST`
2. Looks up the env var in `options.env ?? getEnvSource(detectRuntime())` — works in Node, Bun, Deno, Cloudflare Workers, Vercel Edge
3. Search is case-insensitive: tries `DB_HOST`, then `db_host`, then `DB_Host` etc.
4. Passes the raw value (or `undefined`) through `zodType.parse()` — Zod handles coercion (`.default()`, `.coerce.number()`, etc.)
5. Returns a plain object keyed by schema keys with fully inferred types
6. If `env` options is passed (for testing), uses that instead of runtime env

### Where

`src/env.ts` — export `getSchema` alongside the `Env` class and `env` singleton.

---

## 2. Dotenv enhancement

### Purpose

Auto-detect environment and load the appropriate `.env` file cascade.

### Behavior

- `env.loadDotenv()` with no args:
  1. Always loads `.env` (if exists)
  2. Reads `NODE_ENV` (fallback `APP_ENV`) from current env
  3. If env is `prod` / `test` / `dev`, loads `.env.{env}` (if exists) — values override `.env`
- `env.loadDotenv({ path: 'config' })`:
  1. Loads `config` (if exists)
  2. If env detected, loads `config.{env}` (if exists)

### Where

`src/dotenv.ts` — only modified within existing functions.

---

## 3. `env` Runtime Fields

### Fields

| Field | Type | Source |
|-------|------|--------|
| `env.ENV` | `'prod' \| 'test' \| 'dev'` | `NODE_ENV` or `APP_ENV`; `'dev'` fallback |
| `env.PLATFORM` | `string` | Same as `env.runtime` (alias) |
| `env.DEBUG` | `boolean` | `env.ENV !== 'prod'` |
| `env.IS_PROD` | `boolean` | `env.ENV === 'prod'` |
| `env.IS_DEV` | `boolean` | `env.ENV === 'dev'` |
| `env.IS_TEST` | `boolean` | `env.ENV === 'test'` |
| `env.ENV_KEYS` | `string[]` | All keys from last `getSchema` call (debugging) |

### Where

All fields computed at construction time in `src/env.ts`.

---

## 4. Exports

### `src/index.ts`

Add: `getSchema`

---

## 5. Tests

### `tests/env.test.ts`

- getSchema with default values
- getSchema overriding via env
- getSchema case-insensitive lookup
- getSchema with custom env source (test injection)
- env.ENV, env.IS_PROD, env.DEBUG values
- env.PLATFORM === env.runtime

### `tests/dotenv.test.ts`

- loadDotenv with NODE_ENV=prod loads `.env` + `.env.prod`
- loadDotenv respects override order

---

## 6. Non-goals

- No new source files
- No changing Zod from `import type { z }` to runtime import (keep as peer dep)
- No breaking the existing `env` singleton API
- No MySQL-specific or Redis-specific logic — `getSchema` is generic
