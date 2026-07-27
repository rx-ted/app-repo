# Pino Logger Integration Plan

> **Status: IMPLEMENTED** — Pino 结构化日志已集成到 platform-api。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable pino structured logging in platform-api with console + file output, auto-fallback to console-only on CF/Deno.

**Architecture:** The `Logger` class in `packages/core` already supports lazy pino upgrade via `LazyPinoLogger`. It starts with `ConsoleLogger`, then async-loads pino and creates a pino instance with configured transports. On edge runtimes (CF/Deno), `isEdgeRuntime` check forces `ConsoleLogger` directly. We add a `createFileTransport()` helper to `packages/core` for convenient pino-roll configuration, then switch `platform-api` from `ConsoleLogger` to `Logger` with proper transport config.

**Tech Stack:** pino 9, pino-roll 4, ConsoleLogger (existing), Logger/LazyPinoLogger (existing)

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `packages/core/src/logger/types.ts` | Modify | Add `FileTransportOptions` interface |
| `packages/core/src/logger/logger.ts` | Modify | Export `createFileTransport()` helper |
| `packages/core/src/logger/logger.test.ts` | Modify | Add tests for `createFileTransport()` |
| `packages/core/src/index.ts` | Modify | Export `createFileTransport` |
| `apps/platform-api/src/lib/logger.ts` | Modify | Switch from `ConsoleLogger` to `Logger` with file transport |
| `apps/platform-api/src/lib/plugins.ts` | Modify | Replace `console.log/warn` with `logger.info/warn` |
| `apps/platform-api/src/modules/auth/services/oauth.service.ts` | Modify | Replace `console.error` with `logger.error` |
| `apps/platform-api/src/modules/auth/auth-oauth.controller.ts` | Modify | Replace `console.error` with `logger.error` |
| `packages/honest-plugins/cache/src/redis/driver.ts` | Modify | Replace `console.error` with callback-based logging |
| `packages/honest-plugins/mail/src/providers/brevo.provider.ts` | Modify | Remove debug `console.log(payload)` |
| `apps/platform-api/package.json` | Modify | Remove `hono-pino`, `bullmq`, `pino-roll` deps |
| `packages/core/package.json` | Modify | Remove `pino-roll` dep (only platform-api needs it) |

---

## Task 1: Add `FileTransportOptions` and `createFileTransport()` to packages/core

The `Logger` class already supports `transport` in `LoggerOptions`. We add a typed config interface and a factory function that generates the correct `PinoTransportTarget` for pino-roll file output.

### Step 1: Add `FileTransportOptions` to types.ts

**File:** `packages/core/src/logger/types.ts`

Add after the `LoggerOptions` interface (after line 52):

```typescript
export interface FileTransportOptions {
  /** Base log file path (e.g. 'logs/app'). pino-roll appends rotation numbers. */
  file: string;
  /** Max file size before rotation. Accepts '10m', '1g', etc. */
  size?: string;
  /** Time-based rotation: 'daily', 'hourly', or ms number. */
  frequency?: string | number;
  /** Max rotated files to keep (in addition to active file). */
  limit?: number;
  /** Create parent directories if they don't exist. */
  mkdir?: boolean;
  /** Date format string for rotated filenames (date-fns format). */
  dateFormat?: string;
  /** Maintain a 'current.log' symlink. */
  symlink?: boolean;
}
```

### Step 2: Add `createFileTransport()` to logger.ts

**File:** `packages/core/src/logger/logger.ts`

Add at the bottom (before `createLogger`):

```typescript
export function createFileTransport(options: FileTransportOptions): PinoTransportTarget {
  return {
    target: 'pino-roll',
    options: {
      file: options.file,
      ...(options.size && { size: options.size }),
      ...(options.frequency && { frequency: options.frequency }),
      ...(options.limit && { limit: { count: options.limit } }),
      ...(options.mkdir !== undefined && { mkdir: options.mkdir }),
      ...(options.dateFormat && { dateFormat: options.dateFormat }),
      ...(options.symlink !== undefined && { symlink: options.symlink }),
    },
  };
}
```

Also update the import at line 1 to include the new type:

```typescript
import type { ILogger, LoggerOptions, LogLevel, FileTransportOptions, PinoTransportTarget } from './types';
```

### Step 3: Export from index.ts

**File:** `packages/core/src/index.ts`

Add `createFileTransport` to the logger export line (line 14):

```typescript
export { createLogger, Logger, createFileTransport } from './logger/logger';
```

Add `FileTransportOptions` to the type export (line 17):

```typescript
export type { ILogger, LoggerOptions, LogLevel, PinoTransportTarget, FileTransportOptions } from './logger/types';
```

### Step 4: Add tests

**File:** `packages/core/src/logger/logger.test.ts`

Add `createFileTransport` to the existing import (line 2):

```typescript
import { Logger, createLogger, createFileTransport } from './logger';
```

Add these test cases:

```typescript
it('createFileTransport returns valid PinoTransportTarget', () => {
  const target = createFileTransport({ file: 'logs/app', size: '10m', frequency: 'daily', mkdir: true });
  expect(target.target).toBe('pino-roll');
  expect(target.options.file).toBe('logs/app');
  expect(target.options.size).toBe('10m');
  expect(target.options.frequency).toBe('daily');
  expect(target.options.mkdir).toBe(true);
});

it('createFileTransport omits undefined options', () => {
  const target = createFileTransport({ file: 'logs/app' });
  expect(target.options).toEqual({ file: 'logs/app' });
});
```

### Step 5: Verify

Run: `pnpm --filter @rx-ted/packages-core typecheck && pnpm --filter @rx-ted/packages-core test`
Expected: All pass

### Step 6: Commit

```bash
git add packages/core/src/logger/types.ts packages/core/src/logger/logger.ts packages/core/src/logger/logger.test.ts packages/core/src/index.ts
git commit -m "feat(core): add createFileTransport helper for pino-roll file logging"
```

---

## Task 2: Switch platform-api from ConsoleLogger to Logger with file transport

### Step 1: Rewrite platform-api logger.ts

**File:** `apps/platform-api/src/lib/logger.ts`

Replace entire file:

```typescript
import { createLogger, createFileTransport, env, detectPlatform } from '@rx-ted/packages-core';
import type { LogLevel } from '@rx-ted/packages-core';

function detectLevel(): LogLevel {
  const raw = env.get('LOGGER_LEVEL')?.toLowerCase() as LogLevel | undefined;
  if (raw && ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(raw)) return raw;
  return 'info';
}

function buildFileTransport(): ReturnType<typeof createFileTransport> | undefined {
  const platform = detectPlatform();
  if (platform === 'cloudflare' || platform === 'deno') return undefined;

  const filePath = env.get('LOG_FILE_PATH');
  if (!filePath) return undefined;

  return createFileTransport({
    file: filePath,
    size: env.get('LOG_FILE_SIZE') ?? '50m',
    frequency: env.get('LOG_FILE_FREQUENCY') ?? 'daily',
    limit: Number(env.get('LOG_FILE_LIMIT')) || 7,
    mkdir: true,
    symlink: env.get('LOG_FILE_SYMLINK') === 'true',
  });
}

const fileTransport = buildFileTransport();

export const logger = createLogger({
  name: 'platform-api',
  level: detectLevel(),
  ...(fileTransport ? { transport: fileTransport } : {}),
});
```

Key behaviors:
- `detectPlatform()` checks for CF/Deno → no file transport → console only
- `LOG_FILE_PATH` env var controls file output; if unset, console only
- `LOG_FILE_SIZE`, `LOG_FILE_FREQUENCY`, `LOG_FILE_LIMIT`, `LOG_FILE_SYMLINK` for tuning
- The `Logger` class auto-upgrades to pino on Node/Bun; stays ConsoleLogger on edge

### Step 2: Verify typecheck

Run: `pnpm --filter @rx-ted/platform-api typecheck`
Expected: PASS

### Step 3: Commit

```bash
git add apps/platform-api/src/lib/logger.ts
git commit -m "feat(platform-api): switch to pino Logger with console + file output"
```

---

## Task 3: Migrate console.* calls in platform-api to logger

### Step 1: Migrate plugins.ts

**File:** `apps/platform-api/src/lib/plugins.ts`

Add import at top:

```typescript
import { logger } from '@/lib/logger';
```

Replace line 51 (`console.log('[cache] Tags cache warmed')`):

```typescript
    logger.info('[cache] Tags cache warmed');
```

Replace line 53 (`console.warn('[cache] Failed to warm tags cache:', err)`):

```typescript
    logger.warn({ err }, '[cache] Failed to warm tags cache');
```

### Step 2: Migrate oauth.service.ts

**File:** `apps/platform-api/src/modules/auth/services/oauth.service.ts`

Add import at top (after line 5):

```typescript
import { logger } from '@/lib/logger';
```

Replace line 64 (`console.error('[OAuth] raw token response:', tokenText)`):

```typescript
      logger.error({ response: tokenText }, '[OAuth] raw token response');
```

Replace line 92 (`console.error('[OAuth] raw user response:', userText)`):

```typescript
      logger.error({ response: userText }, '[OAuth] raw user response');
```

Replace line 111 (`console.error('[OAuth] raw emails response:', emailsText)`):

```typescript
        logger.error({ response: emailsText }, '[OAuth] raw emails response');
```

### Step 3: Migrate auth-oauth.controller.ts

**File:** `apps/platform-api/src/modules/auth/auth-oauth.controller.ts`

Add import at top:

```typescript
import { logger } from '@/lib/logger';
```

Replace line 193 (`console.error('[OAuth] githubCallback error:', e)`):

```typescript
      logger.error({ err: e }, '[OAuth] githubCallback error');
```

### Step 4: Verify

Run: `pnpm --filter @rx-ted/platform-api typecheck`
Expected: PASS

### Step 5: Commit

```bash
git add apps/platform-api/src/lib/plugins.ts apps/platform-api/src/modules/auth/services/oauth.service.ts apps/platform-api/src/modules/auth/auth-oauth.controller.ts
git commit -m "refactor(platform-api): migrate console.* calls to structured logger"
```

---

## Task 4: Fix stray console.* in packages

### Step 1: Fix redis driver

**File:** `packages/honest-plugins/cache/src/redis/driver.ts`

The `console.error('[Redis] error', err)` on line 31 is in a low-level driver callback where we don't have a logger instance. The `redis` client handles reconnection internally and logs its own warnings. Remove the `error` event listener entirely — it adds no value over the client's built-in behavior.

Remove lines 30-32:

```typescript
  client.on('error', (err: Error) => {
    console.error('[Redis] error', err);
  });
```

### Step 2: Remove debug console.log in brevo provider

**File:** `packages/honest-plugins/mail/src/providers/brevo.provider.ts`

Remove line 48 (`console.log(payload)`). This is a debug leftover that leaks email payloads to stdout.

### Step 3: Verify

Run: `pnpm --filter @rx-ted/packages-honest-plugins-cache typecheck && pnpm --filter @rx-ted/packages-honest-plugins-mail typecheck`
Expected: PASS

### Step 4: Commit

```bash
git add packages/honest-plugins/cache/src/redis/driver.ts packages/honest-plugins/mail/src/providers/brevo.provider.ts
git commit -m "fix: remove stray console.* calls in cache and mail plugins"
```

---

## Task 5: Clean up unused dependencies

### Step 1: Remove unused deps from platform-api

**File:** `apps/platform-api/package.json`

Remove from `dependencies`:
- `"bullmq": "^5.78.0"` — redundant (event-bus has its own)
- `"hono-pino": "^0.10.3"` — never imported

Keep `"pino-roll": "^4.0.0"` — needed at runtime when `LOG_FILE_PATH` is set (pino dynamically imports it as a transport target).

### Step 2: Remove pino-roll from packages/core

**File:** `packages/core/package.json`

Remove from `dependencies`:
- `"pino-roll": "^4.0.0"` — core never imports it; only platform-api needs it at runtime

### Step 3: Install

Run: `pnpm install`
Expected: Lockfile updated, node_modules cleaned

### Step 4: Verify

Run: `pnpm --filter @rx-ted/packages-core build && pnpm --filter @rx-ted/platform-api typecheck`
Expected: PASS

### Step 5: Commit

```bash
git add apps/platform-api/package.json packages/core/package.json pnpm-lock.yaml
git commit -m "chore: remove unused bullmq, hono-pino, pino-roll dependencies"
```

---

## Task 6: Update pino refactor plan status

### Step 1: Mark old plan as superseded

**File:** `docs/plans/2026-06-21-pino-logger-refactor.md`

Add at the top (after the title):

```markdown
> **Status: SUPERSEDED** — This plan has been completed via a different approach.
> The pino wrapper landed in `packages/core/src/logger/` (not a separate `packages/logger`).
> See `2026-07-12-pino-logger-integration.md` for the final integration work.
```

### Step 2: Commit

```bash
git add docs/plans/2026-06-21-pino-logger-refactor.md
git commit -m "docs: mark pino refactor plan as superseded"
```

---

## Summary

After these 6 tasks:
- `platform-api` uses pino structured logging with JSON output
- Console output always works (all platforms)
- File output via pino-roll when `LOG_FILE_PATH` is set (Node/Bun only; auto-disabled on CF/Deno)
- All `console.*` calls in platform-api migrated to logger
- Stray `console.*` in packages fixed
- Unused `bullmq`, `hono-pino` removed from platform-api
- Unused `pino-roll` removed from packages/core (kept in platform-api where it's actually used)
- Old refactor plan marked as superseded

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOGGER_LEVEL` | `info` | Log level: trace, debug, info, warn, error, fatal |
| `LOG_FILE_PATH` | (unset) | File path for pino-roll (e.g. `logs/app`). Unset = console only |
| `LOG_FILE_SIZE` | `50m` | Max file size before rotation |
| `LOG_FILE_FREQUENCY` | `daily` | Rotation frequency: `daily`, `hourly`, or ms |
| `LOG_FILE_LIMIT` | `7` | Max rotated files to keep |
| `LOG_FILE_SYMLINK` | `false` | Maintain `current.log` symlink |
