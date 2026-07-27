# Pino Logger Refactor Implementation Plan

> **Status: SUPERSEDED** — This plan has been completed via a different approach.
> The pino wrapper landed in `packages/core/src/logger/` (not a separate `packages/logger`).
> See `2026-07-12-pino-logger-integration.md` for the final integration work.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom `packages/logger` implementation with pino while keeping the same public API (`createLogger`, `Logger`, `ILogger`) and auto-inject request-scoped loggers with `reqId` via `hono-pino` middleware.

**Architecture:**
- `packages/logger` becomes a thin pino wrapper: `Logger` class wraps a `pino` instance, `createLogger()` returns it. The `ILogger` interface stays the same for framework consumers (`packages/honest`, `packages/mail`, `packages/search`). File rotation via `pino-roll` transport.
- `apps/platform-api` uses `hono-pino` middleware to auto-attach a request-scoped child logger (with `reqId` bound) to each Hono context. Error filter and all other consumers use `c.get('logger')` within requests.
- No request-scoped DI needed — `pino.child({ reqId })` per-request is sufficient.

**Tech Stack:** `pino`, `pino-roll`, `pino-pretty`, `hono-pino`

---

### File Inventory

| File | Action | Responsibility |
|------|--------|---------------|
| `packages/logger/package.json` | Modify | Deps: pino, pino-roll; remove std-env |
| `packages/logger/src/index.ts` | Modify | Export createLogger, Logger, ILogger, LogLevel, LoggerOptions |
| `packages/logger/src/logger.ts` | Rewrite | Logger class wrapping pino instance |
| `packages/logger/src/types.ts` | Rewrite | Keep ILogger, LogLevel; simplify LoggerOptions to pino-compatible |
| `packages/logger/src/levels.ts` | Remove | Replaced by pino levels |
| `packages/logger/src/handler/` | Remove | Replaced by pino transports |
| `packages/logger/src/formatter/` | Remove | Replaced by pino-pretty / pino-roll |
| `packages/logger/src/logger.test.ts` | Rewrite | Test pino wrapper API |
| `packages/logger/src/levels.test.ts` | Remove | No longer needed |
| `packages/logger/src/handler/*.test.ts` | Remove | No longer needed |
| `packages/logger/src/formatter/*.test.ts` | Remove | No longer needed |
| `packages/honest/src/application.ts` | Modify | `resolveLogger` — remove `instanceof Logger` check, use `ILogger.child()` if available |
| `apps/platform-api/src/lib/logger.ts` | Rewrite | Create pino instance with pino-roll transport |
| `apps/platform-api/src/index.ts` | Modify | Add hono-pino middleware, pass pino as root logger |
| `apps/platform-api/src/common/filters/api-error.filter.ts` | Modify | Switch to pino param order `({...ctx}, msg)`, use `c.get('logger')` |
| `apps/platform-api/src/common/middleware/request-context.middleware.ts` | Modify | Keep but simplify — hono-pino handles reqId |
| `apps/platform-api/src/modules/comment/services/comment-notification.service.ts` | Modify | console.error → logger.error |
| `apps/platform-api/src/common/guards/auth.guard.ts` | Modify | console.warn → logger.warn |
| `apps/platform-api/src/modules/mail/mail.service.ts` | Modify | console.error → logger.error |

---

### Task 1: Rewrite `packages/logger` as pino wrapper

**Files:**
- Modify: `packages/logger/package.json`
- Modify: `packages/logger/src/index.ts`
- Rewrite: `packages/logger/src/logger.ts`
- Rewrite: `packages/logger/src/types.ts`
- Remove: `packages/logger/src/levels.ts`
- Remove: `packages/logger/src/handler/` (entire dir)
- Remove: `packages/logger/src/formatter/` (entire dir)
- Rewrite: `packages/logger/src/logger.test.ts`
- Remove: `packages/logger/src/levels.test.ts`
- Remove: `packages/logger/src/handler/*.test.ts`
- Remove: `packages/logger/src/formatter/*.test.ts`

- [ ] **Step 1: Update package.json**

Replace `std-env` dep with `pino` and `pino-roll`:

```json
{
  "name": "@rx-ted/packages-logger",
  "version": "1.0.0",
  "type": "module",
  "description": "Pino-based logging library with console & rotating file output.",
  "main": "./dist/index.cjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "vitest": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "author": "rx-ted",
  "license": "MIT",
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "pino": "^9.6.0",
    "pino-roll": "^4.0.0"
  },
  "optionalDependencies": {
    "pino-pretty": "^13.0.0"
  },
  "devDependencies": {
    "@types/node": "^25.9.1",
    "@vitest/coverage-v8": "^4.1.7",
    "tsup": "^8.5.1",
    "typescript": "^6.0.3",
    "vitest": "^4.1.7"
  }
}
```

- [ ] **Step 2: Rewrite `src/types.ts`**

```ts
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'trace';

export interface ILogger {
  debug(obj: unknown, msg?: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
  info(obj: unknown, msg?: string, ...args: unknown[]): void;
  info(msg: string, ...args: unknown[]): void;
  warn(obj: unknown, msg?: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(obj: unknown, msg?: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
  child(bindings: Record<string, unknown>): ILogger;
  setLevel(level: LogLevel): void;
  close(): Promise<void>;
}

export interface PinoTransportTarget {
  target: string;
  options?: Record<string, unknown>;
  level?: LogLevel;
}

export interface LoggerOptions {
  name?: string;
  level?: LogLevel;
  transport?: PinoTransportTarget | PinoTransportTarget[];
  pino?: Record<string, unknown>;
}
```

- [ ] **Step 3: Rewrite `src/logger.ts`**

```ts
import pino from 'pino';
import type { Logger as PinoLogger } from 'pino';
import type { ILogger, LoggerOptions, LogLevel } from './types';

export class Logger implements ILogger {
  readonly instance: PinoLogger;

  constructor(options: LoggerOptions = {}) {
    const transportOpts = options.transport;
    let stream: pino.DestinationStream | undefined;

    if (transportOpts) {
      const targets = Array.isArray(transportOpts) ? transportOpts : [transportOpts];
      stream = pino.transport({ targets: targets as any });
    }

    this.instance = pino(
      {
        name: options.name ?? 'app',
        level: options.level ?? 'info',
        ...options.pino,
      },
      stream,
    );
  }

  debug(obj: unknown, msg?: string, ...args: unknown[]): void {
    if (typeof obj === 'string') {
      (this.instance.debug as any)(obj, msg, ...args);
    } else {
      (this.instance.debug as any)(obj, msg, ...args);
    }
  }

  info(obj: unknown, msg?: string, ...args: unknown[]): void {
    if (typeof obj === 'string') {
      (this.instance.info as any)(obj, msg, ...args);
    } else {
      (this.instance.info as any)(obj, msg, ...args);
    }
  }

  warn(obj: unknown, msg?: string, ...args: unknown[]): void {
    if (typeof obj === 'string') {
      (this.instance.warn as any)(obj, msg, ...args);
    } else {
      (this.instance.warn as any)(obj, msg, ...args);
    }
  }

  error(obj: unknown, msg?: string, ...args: unknown[]): void {
    if (typeof obj === 'string') {
      (this.instance.error as any)(obj, msg, ...args);
    } else {
      (this.instance.error as any)(obj, msg, ...args);
    }
  }

  child(bindings: Record<string, unknown>): ILogger {
    const child = this.instance.child(bindings);
    return pinoInstanceToLogger(child);
  }

  setLevel(level: LogLevel): void {
    this.instance.level = level;
  }

  async close(): Promise<void> {
    await this.instance.flush();
  }
}

function pinoInstanceToLogger(instance: PinoLogger): ILogger {
  return {
    debug(obj: unknown, msg?: string, ...args: unknown[]) {
      if (typeof obj === 'string') (instance.debug as any)(obj, msg, ...args);
      else (instance.debug as any)(obj, msg, ...args);
    },
    info(obj: unknown, msg?: string, ...args: unknown[]) {
      if (typeof obj === 'string') (instance.info as any)(obj, msg, ...args);
      else (instance.info as any)(obj, msg, ...args);
    },
    warn(obj: unknown, msg?: string, ...args: unknown[]) {
      if (typeof obj === 'string') (instance.warn as any)(obj, msg, ...args);
      else (instance.warn as any)(obj, msg, ...args);
    },
    error(obj: unknown, msg?: string, ...args: unknown[]) {
      if (typeof obj === 'string') (instance.error as any)(obj, msg, ...args);
      else (instance.error as any)(obj, msg, ...args);
    },
    child(bindings: Record<string, unknown>) {
      return pinoInstanceToLogger(instance.child(bindings));
    },
    setLevel(level: LogLevel) { instance.level = level; },
    async close() { await instance.flush(); },
  };
}

export function createLogger(options?: LoggerOptions): Logger {
  return new Logger(options);
}
```

- [ ] **Step 4: Update `src/index.ts`**

```ts
export { createLogger, Logger } from './logger';
export type { ILogger, LoggerOptions, LogLevel } from './types';
```

- [ ] **Step 5: Delete unused files**

```bash
rm -rf packages/logger/src/levels.ts
rm -rf packages/logger/src/levels.test.ts
rm -rf packages/logger/src/handler/
rm -rf packages/logger/src/formatter/
```

- [ ] **Step 6: Rewrite `src/logger.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { Logger, createLogger } from './logger';
import type { ILogger } from './types';

describe('Logger', () => {
  it('creates with default name', () => {
    const logger = new Logger();
    expect(logger.instance).toBeDefined();
  });

  it('creates with custom options', () => {
    const logger = new Logger({ name: 'test', level: 'debug' });
    expect(logger.instance).toBeDefined();
  });

  it('implements ILogger interface', () => {
    const logger: ILogger = new Logger();
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.child).toBe('function');
    expect(typeof logger.setLevel).toBe('function');
    expect(typeof logger.close).toBe('function');
  });

  it('child returns ILogger', () => {
    const logger = new Logger();
    const child = logger.child({ module: 'test' });
    expect(typeof child.info).toBe('function');
  });

  it('setLevel changes level', () => {
    const logger = new Logger();
    logger.setLevel('error');
    expect(logger.instance.level).toBe('error');
  });

  it('close flushes and resolves', async () => {
    const logger = new Logger();
    await expect(logger.close()).resolves.toBeUndefined();
  });

  it('createLogger returns Logger instance', () => {
    const logger = createLogger();
    expect(logger).toBeInstanceOf(Logger);
  });
});
```

- [ ] **Step 7: Install deps**

```bash
cd packages/logger && pnpm remove std-env && pnpm add pino pino-roll && pnpm add -D pino-pretty
```

- [ ] **Step 8: Run tests**

```bash
cd packages/logger && pnpm test
```

Expected: test file passes (1 file, ~7 tests)

- [ ] **Step 9: Run typecheck + build**

```bash
cd packages/logger && pnpm typecheck && pnpm build
```

Expected: tsc passes, tsup builds dist/

- [ ] **Step 10: Commit**

```bash
git add packages/logger/
git commit -m "refactor(Logger): rewrite packages/logger as pino wrapper

Replace custom handler/formatter architecture with pino.
- Remove handler/, formatter/, levels.ts
- Logger class wraps pino instance, supports pino-roll transport
- Keep ILogger interface for framework consumers
- pino-pretty used for dev console output
"
```

---

### Task 2: Update `packages/honest` for pino compatibility

**Files:**
- Modify: `packages/honest/src/application.ts`

The `resolveLogger` function uses `instanceof Logger` to create child loggers. Since the new `Logger.wrap()` returns an `ILogger` (not `Logger` instance), this check won't match. We need to change the logic.

- [ ] **Step 1: Modify `resolveLogger` in `application.ts`**

Replace the `instanceof Logger` check with a duck-type check for `.child()`:

```ts
function resolveLogger(
  loggerOption: ILogger | undefined,
  debugOption: HonestOptions['debug'],
): ILogger {
  if (loggerOption) {
    if (typeof loggerOption.child === 'function') {
      return loggerOption.child({ category: 'honest' });
    }
    return loggerOption;
  }

  if (typeof process !== 'undefined' && process.env?.VITEST) {
    return {
      debug() {},
      info() {},
      warn() {},
      error() {},
      child() { return this; },
      setLevel() {},
      close() { return Promise.resolve(); },
    };
  }

  const debugEnabled =
    debugOption === true ||
    (typeof debugOption === 'object' && Object.values(debugOption).some(Boolean));
  return new Logger({ name: 'honest', level: debugEnabled ? 'debug' : 'info' });
}
```

Note: The fallback `new Logger()` needs to be available. The import currently is:
```ts
import { Logger } from '@rx-ted/packages-logger';
```
This import stays — but `Logger` is now a pino wrapper. The fallback path won't create child loggers in the old way (it creates a new root Logger), which is fine.

- [ ] **Step 2: Run honest tests**

```bash
cd packages/honest && pnpm test
```

Expected: tests pass

- [ ] **Step 3: Commit**

```bash
git add packages/honest/src/application.ts
git commit -m "fix(honest): update resolveLogger for new pino-based Logger

Remove instanceof Logger check, use duck-type .child() check instead.
Fallback now creates a pino-backed Logger via packages/logger.
"
```

---

### Task 3: Integrate pino + hono-pino into platform-api

**Files:**
- Modify: `apps/platform-api/src/lib/logger.ts`
- Modify: `apps/platform-api/src/index.ts`
- Modify: `apps/platform-api/src/common/filters/api-error.filter.ts`
- Modify: `apps/platform-api/src/common/middleware/request-context.middleware.ts`

- [ ] **Step 1: Add hono-pino dep**

```bash
cd apps/platform-api && pnpm add hono-pino
```

- [ ] **Step 2: Rewrite `src/lib/logger.ts`**

Create the pino root logger with pino-roll transport for production and pino-pretty for dev:

```ts
import { Logger } from '@rx-ted/packages-logger';
import type { LoggerOptions } from '@rx-ted/packages-logger';
import { envParams } from '@/constants/env';

const isDev = process.env.NODE_ENV !== 'production';

const options: LoggerOptions = {
  name: 'platform-api',
  level: envParams.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  ...(isDev
    ? {
        pino: {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, singleLine: true },
          },
        },
      }
    : {
        transport: [
          {
            target: 'pino-roll',
            level: 'warn',
            options: {
              file: 'logs/error.log',
              frequency: 'daily',
              size: '10m',
              mkdir: true,
            },
          },
          {
            target: 'pino-roll',
            level: 'info',
            options: {
              file: 'logs/app.log',
              frequency: 'daily',
              size: '10m',
              maxFiles: 7,
              mkdir: true,
            },
          },
        ],
      }),
};

export const logger = new Logger(options);
```

Note: `envParams.LOG_LEVEL` doesn't exist yet — add it to `constants/env.ts`. If you don't want to add it now, just use a fallback constant.

- [ ] **Step 3: Update `constants/env.ts`** (if you want LOG_LEVEL env support)

Add a lazy getter for `LOG_LEVEL`:

```ts
// Add to the envParams object:
LOG_LEVEL: new Proxy({}, {
  get: () => process.env.LOG_LEVEL || 'info',
}) as unknown as string,
```

Or simpler — just import from process.env directly in logger.ts.

- [ ] **Step 4: Update `src/index.ts` — add hono-pino middleware**

```ts
import { pinoLogger } from 'hono-pino';
import { logger } from '@/lib/logger';

// After Application.create(...)
hono.use(
  pinoLogger({
    pino: logger.instance,
    autoLogging: {
      ignore: (req) => req.url === '/api/v1/openapi.json' || req.url.startsWith('/api/v1/docs'),
    },
  }),
);
```

- [ ] **Step 5: Update `api-error.filter.ts` — use request-scoped logger**

```ts
// In catch method, use c.get('logger') instead of imported logger:
async catch(exception: Error, c: Context): Promise<Response | undefined> {
  const reqLogger = (c.get('logger') || logger) as ILogger;
  const ctx = getErrorContext(c);

  if (exception instanceof ApiError) {
    const level = exception.status >= 400 && exception.status < 500 ? 'warn' : 'error';
    reqLogger[level]({ ...ctx, code: exception.code, status: exception.status }, `ApiError: ${exception.code}`);
    return buildResponse(c, exception.status, exception.code, exception.message, exception.details);
  }

  if (exception instanceof HTTPException) {
    reqLogger.warn({ ...ctx, status: exception.status }, `HTTPException: ${exception.status}`);
    return buildResponse(c, exception.status, 'HTTP_ERROR', exception.message);
  }

  if ('issues' in exception && Array.isArray((exception as any).issues)) {
    reqLogger.warn({ ...ctx, issues: (exception as any).issues }, 'ValidationError');
    return buildResponse(c, 400, 'VALIDATION_ERROR', 'Request validation failed.', (exception as any).issues);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const cause = (exception as { cause?: unknown }).cause;
  reqLogger.error({ ...ctx, message: exception.message, stack: exception.stack, ...(cause ? { cause: cause instanceof Error ? cause.message : cause } : {}) }, 'UnhandledError');
  const causeMsg = cause instanceof Error ? cause.message : cause;
  return buildResponse(c, 500, 'INTERNAL_SERVER_ERROR', isProduction ? 'An unexpected error occurred.' : causeMsg ? `${exception.message}: ${causeMsg}` : exception.message, cause ? { cause: causeMsg } : undefined);
}
```

Also update the import — remove `import { logger } from '@/lib/logger'` and import `ILogger` type instead:

```ts
import type { ILogger } from '@rx-ted/packages-logger';
```

- [ ] **Step 6: Simplify `request-context.middleware.ts`**

Since hono-pino handles `reqId`, the middleware no longer needs to set `requestId` (hono-pino uses `req.id`). But it still sets `serviceName`. Simplify:

```ts
import type { IMiddleware } from '@rx-ted/packages-honest';
import type { Context, Next } from 'hono';

export class RequestContextMiddleware implements IMiddleware {
  async use(c: Context, next: Next): Promise<void> {
    c.set('serviceName', 'platform-api');
    await next();
  }
}
```

- [ ] **Step 7: Run platform-api tests**

```bash
cd apps/platform-api && pnpm test
```

Expected: tests pass (update snapshots if needed)

- [ ] **Step 8: Commit**

```bash
git add apps/platform-api/src/lib/logger.ts apps/platform-api/src/index.ts apps/platform-api/src/common/
git commit -m "feat(platform-api): integrate pino via hono-pino middleware

- Replace custom logger with pino-backed Logger
- hono-pino middleware provides request-scoped logger with reqId
- Error filter uses request-scoped logger from Hono context
- pino-roll for production file rotation, pino-pretty for dev
"
```

---

### Task 4: Migrate `console.*` calls to logger

**Files:**
- Modify: `apps/platform-api/src/modules/comment/services/comment-notification.service.ts`
- Modify: `apps/platform-api/src/common/guards/auth.guard.ts`
- Modify: `apps/platform-api/src/modules/mail/mail.service.ts`

- [ ] **Step 1: `comment-notification.service.ts` — console.error → logger.error**

```ts
// Top: add logger import
import { logger } from '@/lib/logger';

// Replace:
console.error('Failed to send reply notification:', err);
// With:
logger.error({ err }, 'Failed to send reply notification');

// Replace:
console.error('Failed to send mention notification:', err);
// With:
logger.error({ err }, 'Failed to send mention notification');
```

- [ ] **Step 2: `auth.guard.ts` — console.warn → logger.warn**

```ts
import { logger } from '@/lib/logger';

// Replace:
console.warn(...);
// With:
logger.warn({ ... }, '...');
```

- [ ] **Step 3: `mail.service.ts` — console.error → logger.error**

```ts
import { logger } from '@/lib/logger';

// Replace:
console.error('[MailService] Failed to send verification email:', err);
// With:
logger.error({ err }, 'MailService: Failed to send verification email');
```

- [ ] **Step 4: Run tests**

```bash
cd apps/platform-api && pnpm test
```

Expected: tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/platform-api/src/modules/comment/ apps/platform-api/src/common/guards/auth.guard.ts apps/platform-api/src/modules/mail/
git commit -m "refactor(platform-api): migrate console.* calls to pino logger"
```

---

### Task 5: Run global verification

- [ ] **Step 1: Run all monorepo checks**

```bash
cd packages/logger && pnpm test && pnpm typecheck
cd apps/platform-api && pnpm test && pnpm typecheck
cd packages/honest && pnpm test && pnpm typecheck
cd packages/mail && pnpm test && pnpm typecheck
cd packages/search && pnpm test && pnpm typecheck
```

- [ ] **Step 2: Verify end-to-end**

Build the logger package:
```bash
cd packages/logger && pnpm build
```

Start platform-api in dev mode and verify:
- Console output is colorized via pino-pretty
- Each log line includes `reqId`
- Error filter logs look correct
```bash
cd apps/platform-api && pnpm dev
```

Expected: server starts, requests produce structured logs with reqId

- [ ] **Step 3: Final commit if any fixes**

```bash
git add -A && git commit -m "chore: fix lint/type issues after pino migration"
```
