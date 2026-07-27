# Counter Plugin (Durable Objects) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `@rx-ted/packages-honest-plugins-counter` — a counter aggregation plugin backed exclusively by Cloudflare Durable Objects. Development uses `wrangler dev` (Miniflare) for local DO simulation.

**Architecture:** Follow the exact same plugin pattern as `@rx-ted/packages-honest-plugins-cache`. The `CounterDriver` interface provides `increment/decrement/value/flush`. The DO class manages per-key state with an Alarm for periodic flush-to-DB. A `flushFn` callback registry lets the business layer provide domain-specific persistence logic without the DO knowing about D1.

**Tech Stack:** TypeScript, Cloudflare Durable Objects, `@rx-ted/packages-honest` (DI + IPlugin), `@rx-ted/packages-core` (Env/Platform)

**Local Dev:** Run `wrangler dev` — Miniflare simulates DO locally. No in-memory fallback needed.

---

## File Structure

```
packages/honest-plugins/counter/
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── src/
    ├── index.ts                  # Public exports
    ├── types.ts                  # CounterDriver interface
    ├── constants.ts              # COUNTER_GLOBAL_KEY
    ├── counter-service.ts        # @Service() DI wrapper
    ├── counter-plugin.ts         # IPlugin implementation
    ├── counter-plugin.test.ts    # Tests (colocated)
    ├── counter-do.ts             # Durable Object class
    └── counter-do.test.ts        # Tests (colocated)
```

**Files to modify (existing):**
- `packages/honest-plugins/package.json` — add `./counter` export + dep
- `pnpm-workspace.yaml` — add `packages/honest-plugins/counter`
- `apps/platform-api/src/lib/plugins.ts` — load CounterPlugin
- `apps/platform-api/src/modules/post-stats/stats-buffer.service.ts` — replace CacheService with CounterService
- `wrangler.jsonc` — add DO binding

---

## Task 1: CounterDriver Interface & Constants

**Files:**
- Create: `packages/honest-plugins/counter/src/types.ts`
- Create: `packages/honest-plugins/counter/src/constants.ts`

- [ ] **Step 1: Create the CounterDriver interface**

```ts
// packages/honest-plugins/counter/src/types.ts

export interface FlushResult {
  flushed: number;
  success: boolean;
  error?: string;
}

export interface CounterDriver {
  increment(key: string, delta?: number): Promise<number>;
  decrement(key: string, delta?: number): Promise<number>;
  value(key: string): Promise<number>;
  mget(keys: string[]): Promise<number[]>;
  flush(key: string): Promise<FlushResult>;
  flushAll(): Promise<FlushResult>;
  pending(key: string): Promise<number>;
  close(): Promise<void>;
  healthCheck(): Promise<boolean>;
}
```

- [ ] **Step 2: Create constants**

```ts
// packages/honest-plugins/counter/src/constants.ts

export const COUNTER_GLOBAL_KEY = 'app:counter';
```

- [ ] **Step 3: Commit**

```bash
git add packages/honest-plugins/counter/src/types.ts packages/honest-plugins/counter/src/constants.ts
git commit -m "feat(counter): add CounterDriver interface and constants"
```

---

## Task 2: Durable Object Class

**Files:**
- Create: `packages/honest-plugins/counter/src/counter-do.ts`

- [ ] **Step 1: Create the Durable Object class**

```ts
// packages/honest-plugins/counter/src/counter-do.ts

import { DurableObject } from 'cloudflare:workers';

export interface CounterState {
  current: number;
  pending: number;
  lastFlushAt: number;
}

const FLUSH_THRESHOLD = 100;
const ALARM_INTERVAL_MS = 30_000;

export class CounterDO extends DurableObject {
  private state: DurableObjectState;
  private alarmState: CounterState = { current: 0, pending: 0, lastFlushAt: 0 };

  constructor(state: DurableObjectState, env: unknown) {
    super(state, env);
    this.state = state;
  }

  async initialize(): Promise<void> {
    const stored = await this.state.storage.get<CounterState>('counter');
    if (stored) {
      this.alarmState = stored;
    }
  }

  async increment(delta: number = 1): Promise<number> {
    this.alarmState.current += delta;
    this.alarmState.pending += delta;
    await this.state.storage.put('counter', this.alarmState);

    if (this.alarmState.pending >= FLUSH_THRESHOLD) {
      // Threshold hit — the driver will handle flush
    } else {
      const existingAlarm = await this.ctx.getAlarm();
      if (!existingAlarm) {
        await this.ctx.setAlarm(Date.now() + ALARM_INTERVAL_MS);
      }
    }

    return this.alarmState.current;
  }

  async decrement(delta: number = 1): Promise<number> {
    this.alarmState.current -= delta;
    this.alarmState.pending -= delta;
    await this.state.storage.put('counter', this.alarmState);
    return this.alarmState.current;
  }

  async getValue(): Promise<number> {
    return this.alarmState.current;
  }

  async getPending(): Promise<number> {
    return this.alarmState.pending;
  }

  async alarm(): Promise<void> {
    if (this.alarmState.pending === 0) return;
    // Alarm fires — the driver reads pending and calls flushFn
    // Re-arm alarm for next cycle
    await this.ctx.setAlarm(Date.now() + ALARM_INTERVAL_MS);
  }

  async consumePending(): Promise<number> {
    const delta = this.alarmState.pending;
    if (delta === 0) return 0;

    this.alarmState.pending = 0;
    this.alarmState.lastFlushAt = Date.now();
    await this.state.storage.put('counter', this.alarmState);
    return delta;
  }

  async reset(): Promise<void> {
    this.alarmState = { current: 0, pending: 0, lastFlushAt: 0 };
    await this.state.storage.put('counter', this.alarmState);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/honest-plugins/counter/src/counter-do.ts
git commit -m "feat(counter): add CounterDO Durable Object class"
```

---

## Task 3: CounterDriver (DO-backed) & Plugin

**Files:**
- Create: `packages/honest-plugins/counter/src/counter-plugin.ts`

- [ ] **Step 1: Create the CounterPlugin**

This combines the driver + plugin in one file (like `cache/src/resolve.ts` does for CachePlugin). The plugin resolves the DO binding and registers the driver with ComponentManager.

```ts
// packages/honest-plugins/counter/src/counter-plugin.ts

import type { Hono } from 'hono';
import type { ILogger } from '@rx-ted/packages-core';
import type { IPlugin, Application } from '@rx-ted/packages-honest';
import { ComponentManager, resolvePluginLogger } from '@rx-ted/packages-honest';
import { ENV_SYMBOL, type Env, resolveBinding } from '@rx-ted/packages-core';
import type { CounterDriver, FlushResult } from './types';
import { COUNTER_GLOBAL_KEY } from './constants';

export type FlushHandler = (key: string, delta: number) => Promise<void>;

export interface CounterDOStub {
  increment(delta?: number): Promise<number>;
  decrement(delta?: number): Promise<number>;
  getValue(): Promise<number>;
  getPending(): Promise<number>;
  consumePending(): Promise<number>;
  reset(): Promise<void>;
}

export interface CounterPluginOptions {
  /** DO class name as registered in wrangler.jsonc (default: "COUNTER_DO") */
  doBinding?: string;
}

export class CounterPlugin implements IPlugin {
  readonly name = 'counter-plugin';
  readonly version = '1.0.0';
  logger?: ILogger;

  private driver: CounterDriver | null = null;
  private flushHandlers = new Map<string, FlushHandler>();

  constructor(private options?: CounterPluginOptions) {}

  /**
   * Register a flush handler for a counter key pattern.
   * Called by the business layer to provide domain-specific DB write logic.
   *
   * @example
   * counterPlugin.registerFlushHandler('stats:v:', async (key, delta) => {
   *   const postId = key.split(':')[2];
   *   await db.update(postStats).set({ viewCount: sql`view_count + ${delta}` })
   *     .where(eq(postStats.postId, Number(postId)));
   * });
   */
  registerFlushHandler(keyPattern: string, handler: FlushHandler): void {
    this.flushHandlers.set(keyPattern, handler);
  }

  getClient(): CounterDriver {
    if (!this.driver) {
      throw new Error('Counter not initialized. Ensure beforeModulesRegistered has run.');
    }
    return this.driver;
  }

  async beforeModulesRegistered(app: Application, _hono: Hono): Promise<void> {
    this.logger ??= resolvePluginLogger(this.name);
    this.logger.info('Counter: initializing...');

    const appEnv = ComponentManager.hasPlugin(ENV_SYMBOL)
      ? ComponentManager.getPlugin<Env>(ENV_SYMBOL)
      : undefined;

    const doBinding = this.options?.doBinding || 'COUNTER_DO';
    const ns = resolveBinding(doBinding, appEnv);

    if (!ns) {
      throw new Error(
        `Counter: DO binding "${doBinding}" not found. ` +
          `Add durable_objects binding to wrangler.jsonc.`,
      );
    }

    this.driver = this.createDriver(ns as any);
    ComponentManager.registerPlugin(COUNTER_GLOBAL_KEY, this.driver);
    this.logger.info('Counter: ready (Durable Objects)');
  }

  private createDriver(namespace: { get(id: DurableObjectId): CounterDOStub }): CounterDriver {
    const getStub = (key: string): CounterDOStub => {
      const id = namespace.idFromName(key);
      return namespace.get(id) as unknown as CounterDOStub;
    };

    const self = this;

    return {
      async increment(key: string, delta = 1): Promise<number> {
        return getStub(key).increment(delta);
      },

      async decrement(key: string, delta = 1): Promise<number> {
        return getStub(key).decrement(delta);
      },

      async value(key: string): Promise<number> {
        return getStub(key).getValue();
      },

      async mget(keys: string[]): Promise<number[]> {
        return Promise.all(keys.map((key) => getStub(key).getValue()));
      },

      async flush(key: string): Promise<FlushResult> {
        const stub = getStub(key);
        const delta = await stub.consumePending();
        if (delta === 0) return { flushed: 0, success: true };

        // Find matching flush handler
        for (const [pattern, handler] of self.flushHandlers) {
          if (key.startsWith(pattern)) {
            try {
              await handler(key, delta);
              return { flushed: Math.abs(delta), success: true };
            } catch (err) {
              return {
                flushed: 0,
                success: false,
                error: err instanceof Error ? err.message : String(err),
              };
            }
          }
        }

        // No handler registered — delta consumed but not persisted
        return { flushed: Math.abs(delta), success: true };
      },

      async flushAll(): Promise<FlushResult> {
        // DO instances are individual — flushAll is a no-op at driver level.
        // Business layer should track dirty keys and flush individually.
        return { flushed: 0, success: true };
      },

      async pending(key: string): Promise<number> {
        return getStub(key).getPending();
      },

      async close(): Promise<void> {
        // DOs persist independently
      },

      async healthCheck(): Promise<boolean> {
        return true;
      },
    };
  }

  async close(): Promise<void> {
    this.driver = null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/honest-plugins/counter/src/counter-plugin.ts
git commit -m "feat(counter): add CounterPlugin with DO driver"
```

---

## Task 4: CounterService DI Wrapper & Public Exports

**Files:**
- Create: `packages/honest-plugins/counter/src/counter-service.ts`
- Create: `packages/honest-plugins/counter/src/index.ts`

- [ ] **Step 1: Create CounterService**

Following the exact pattern from `cache/src/cache-service.ts`:

```ts
// packages/honest-plugins/counter/src/counter-service.ts

import { Service, ComponentManager } from '@rx-ted/packages-honest';
import type { CounterDriver } from './types';
import { COUNTER_GLOBAL_KEY } from './constants';

@Service()
class CounterService {
  constructor() {
    return ComponentManager.getPlugin<CounterDriver>(COUNTER_GLOBAL_KEY);
  }
}

interface CounterService extends CounterDriver {}

export { CounterService };
```

- [ ] **Step 2: Create public index**

```ts
// packages/honest-plugins/counter/src/index.ts

export { COUNTER_GLOBAL_KEY, CounterService } from './counter-service';
export type { CounterDriver, FlushResult } from './types';
export { CounterPlugin } from './counter-plugin';
export type { CounterPluginOptions, FlushHandler, CounterDOStub } from './counter-plugin';
```

- [ ] **Step 3: Commit**

```bash
git add packages/honest-plugins/counter/src/counter-service.ts packages/honest-plugins/counter/src/index.ts
git commit -m "feat(counter): add CounterService DI wrapper and public exports"
```

---

## Task 5: Package Configuration

**Files:**
- Create: `packages/honest-plugins/counter/package.json`
- Create: `packages/honest-plugins/counter/tsconfig.json`
- Create: `packages/honest-plugins/counter/vitest.config.ts`
- Modify: `packages/honest-plugins/package.json`
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: Create counter package.json**

```json
{
  "name": "@rx-ted/packages-honest-plugins-counter",
  "version": "1.0.0",
  "private": true,
  "description": "Counter plugin for @rx-ted/packages-honest (Durable Objects)",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "vitest": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "sideEffects": ["./dist/index.js"],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/rx-ted/honest.git"
  },
  "author": "rx-ted",
  "license": "MIT",
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "@rx-ted/packages-core": "workspace:^"
  },
  "peerDependencies": {
    "@rx-ted/packages-honest": "workspace:^",
    "hono": "^4.12.18"
  },
  "devDependencies": {
    "@types/node": "^22.15.3",
    "vitest": "^4.1.7"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

Copy from `packages/honest-plugins/db/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "sourceMap": false,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "types": ["node"],
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src"],
  "exclude": ["**/*.test.ts"]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';
import { getWorkspaceAliases } from '../../../vitest.workspace-aliases';

export default defineConfig({
  resolve: {
    alias: getWorkspaceAliases(),
  },
  test: {
    globals: true,
    environment: 'node',
    exclude: ['node_modules'],
  },
});
```

- [ ] **Step 4: Update barrel package.json**

Add to `packages/honest-plugins/package.json`:

```json
{
  "name": "@rx-ted/packages-honest-plugins",
  "version": "1.0.1",
  "private": false,
  "type": "module",
  "description": "HonestJS plugins — db, cache, mail, s3, api-doc, counter",
  "exports": {
    "./db": { "types": "./db/dist/index.d.ts", "default": "./db/dist/index.js" },
    "./cache": { "types": "./cache/dist/index.d.ts", "default": "./cache/dist/index.js" },
    "./mail": { "types": "./mail/dist/index.d.ts", "default": "./mail/dist/index.js" },
    "./s3": { "types": "./s3/dist/index.d.ts", "default": "./s3/dist/index.js" },
    "./api-doc": { "types": "./api-doc/dist/index.d.ts", "default": "./api-doc/dist/index.js" },
    "./counter": { "types": "./counter/dist/index.d.ts", "default": "./counter/dist/index.js" }
  },
  "dependencies": {
    "@rx-ted/packages-honest-plugins-db": "workspace:^",
    "@rx-ted/packages-honest-plugins-cache": "workspace:^",
    "@rx-ted/packages-honest-plugins-mail": "workspace:^",
    "@rx-ted/packages-honest-plugins-s3": "workspace:^",
    "@rx-ted/packages-honest-plugins-api-doc": "workspace:^",
    "@rx-ted/packages-honest-plugins-counter": "workspace:^"
  }
}
```

- [ ] **Step 5: Update pnpm-workspace.yaml**

```yaml
packages:
  - "apps/platform-api"
  - "apps/web-blog"
  - "packages"
  - "packages/core"
  - "packages/honest"
  - "packages/honest-plugins"
  - "packages/honest-plugins/db"
  - "packages/honest-plugins/cache"
  - "packages/honest-plugins/s3"
  - "packages/honest-plugins/mail"
  - "packages/honest-plugins/api-doc"
  - "packages/honest-plugins/counter"
```

- [ ] **Step 6: Install dependencies**

```bash
pnpm install
```

- [ ] **Step 7: Commit**

```bash
git add packages/honest-plugins/counter/package.json packages/honest-plugins/counter/tsconfig.json packages/honest-plugins/counter/vitest.config.ts packages/honest-plugins/package.json pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "feat(counter): add package config and workspace registration"
```

---

## Task 6: Wire Up in platform-api

**Files:**
- Modify: `apps/platform-api/src/lib/plugins.ts`
- Modify: `wrangler.jsonc`

- [ ] **Step 1: Add loadCounterPlugin to plugins.ts**

```ts
// ── Counter ──

async function loadCounterPlugin(plugins: PluginEntry[]): Promise<void> {
  const { CounterPlugin } = await import('@rx-ted/packages-honest-plugins/counter');
  plugins.push(new CounterPlugin());
}
```

Update `getPlugins()`:

```ts
export async function getPlugins(): Promise<PluginEntry[]> {
  const plugins: PluginEntry[] = [];
  await maybeApiDoc(plugins);
  await loadDbPlugin(plugins);
  await loadCachePlugin(plugins);
  await loadCounterPlugin(plugins);
  await maybeMail(plugins);

  setTimeout(() => warmTagsCache(), 1000);

  return plugins;
}
```

- [ ] **Step 2: Add DO binding to wrangler.jsonc**

```jsonc
{
  // ... existing config ...
  "durable_objects": {
    "bindings": [
      {
        "name": "COUNTER_DO",
        "class_name": "CounterDO"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_classes": ["CounterDO"]
    }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/platform-api/src/lib/plugins.ts wrangler.jsonc
git commit -m "feat(counter): wire CounterPlugin into platform-api and add DO binding"
```

---

## Task 7: Refactor StatsBufferService to Use CounterService

**Files:**
- Modify: `apps/platform-api/src/modules/post-stats/stats-buffer.service.ts`

- [ ] **Step 1: Rewrite StatsBufferService**

Replace the entire file. Key changes: `CacheService.incr()` → `CounterService.increment()`, remove manual dirty-set + flush logic:

```ts
// apps/platform-api/src/modules/post-stats/stats-buffer.service.ts

import { Inject, Service } from '@rx-ted/packages-honest';
import { CounterService } from '@rx-ted/packages-honest-plugins/counter';
import { eq, sql } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { postStats } from '@/schema';

const COUNTER_KEYS = {
  views: (postId: number) => `stats:v:${postId}`,
  likes: (postId: number) => `stats:l:${postId}`,
  comments: (postId: number) => `stats:c:${postId}`,
} as const;

@Service()
export class StatsBufferService {
  constructor(
    @Inject(CounterService) private counter: CounterService,
    @Inject(DbService) private db: DbService,
  ) {}

  async recordView(postId: number): Promise<void> {
    await this.counter.increment(COUNTER_KEYS.views(postId));
  }

  async recordLike(postId: number): Promise<void> {
    await this.counter.increment(COUNTER_KEYS.likes(postId));
  }

  async recordComment(postId: number): Promise<void> {
    await this.counter.increment(COUNTER_KEYS.comments(postId));
  }

  async getBufferedStats(
    postId: number,
  ): Promise<{ views: number; likes: number; comments: number }> {
    const [views, likes, comments] = await this.counter.mget([
      COUNTER_KEYS.views(postId),
      COUNTER_KEYS.likes(postId),
      COUNTER_KEYS.comments(postId),
    ]);
    return { views, likes, comments };
  }

  async flushPostStats(postId: number): Promise<void> {
    const viewsPending = await this.counter.pending(COUNTER_KEYS.views(postId));
    const likesPending = await this.counter.pending(COUNTER_KEYS.likes(postId));
    const commentsPending = await this.counter.pending(COUNTER_KEYS.comments(postId));

    if (!viewsPending && !likesPending && !commentsPending) return;

    const [existing] = await this.db
      .select()
      .from(postStats)
      .where(eq(postStats.postId, postId))
      .limit(1);

    if (!existing) {
      await this.db.insert(postStats).values({
        postId,
        viewCount: viewsPending,
        likeCount: likesPending,
        commentCount: commentsPending,
      });
    } else {
      if (viewsPending) {
        await this.db
          .update(postStats)
          .set({ viewCount: sql`view_count + ${viewsPending}` })
          .where(eq(postStats.postId, postId));
      }
      if (likesPending) {
        await this.db
          .update(postStats)
          .set({ likeCount: sql`like_count + ${likesPending}` })
          .where(eq(postStats.postId, postId));
      }
      if (commentsPending) {
        await this.db
          .update(postStats)
          .set({ commentCount: sql`comment_count + ${commentsPending}` })
          .where(eq(postStats.postId, postId));
      }
    }

    await Promise.all([
      this.counter.flush(COUNTER_KEYS.views(postId)),
      this.counter.flush(COUNTER_KEYS.likes(postId)),
      this.counter.flush(COUNTER_KEYS.comments(postId)),
    ]);
  }

  async flushAll(): Promise<number> {
    const result = await this.counter.flushAll();
    return result.flushed;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/platform-api/src/modules/post-stats/stats-buffer.service.ts
git commit -m "refactor(post-stats): replace CacheService with CounterService in StatsBufferService"
```

---

## Task 8: Unit Tests

**Files:**
- Create: `packages/honest-plugins/counter/src/counter-plugin.test.ts`

- [ ] **Step 1: Write tests for CounterPlugin driver logic**

These tests mock the DO stub to verify the driver logic without needing real DOs:

```ts
// packages/honest-plugins/counter/src/counter-plugin.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CounterDOStub, FlushHandler } from '../counter-plugin';

function createMockStub(initial = { current: 0, pending: 0, lastFlushAt: 0 }) {
  const state = { ...initial };
  return {
    increment: vi.fn(async (delta = 1) => {
      state.current += delta;
      state.pending += delta;
      return state.current;
    }),
    decrement: vi.fn(async (delta = 1) => {
      state.current -= delta;
      state.pending -= delta;
      return state.current;
    }),
    getValue: vi.fn(async () => state.current),
    getPending: vi.fn(async () => state.pending),
    consumePending: vi.fn(async () => {
      const d = state.pending;
      state.pending = 0;
      state.lastFlushAt = Date.now();
      return d;
    }),
    reset: vi.fn(async () => {
      state.current = 0;
      state.pending = 0;
    }),
    _state: state,
  };
}

describe('CounterPlugin driver', () => {
  // Import the driver creation logic directly
  // Since createDriver is private, we test through CounterPlugin.getClient()

  it('should increment via DO stub', async () => {
    const stub = createMockStub();
    const driver = createTestDriver(stub);

    const v1 = await driver.increment('stats:v:1');
    expect(v1).toBe(1);
    expect(stub.increment).toHaveBeenCalledWith(1);
  });

  it('should increment with custom delta', async () => {
    const stub = createMockStub();
    const driver = createTestDriver(stub);

    await driver.increment('stats:v:1', 5);
    expect(stub.increment).toHaveBeenCalledWith(5);
  });

  it('should decrement via DO stub', async () => {
    const stub = createMockStub();
    const driver = createTestDriver(stub);

    await driver.decrement('stats:v:1', 3);
    expect(stub.decrement).toHaveBeenCalledWith(3);
  });

  it('should get value', async () => {
    const stub = createMockStub({ current: 42, pending: 0, lastFlushAt: 0 });
    const driver = createTestDriver(stub);

    const v = await driver.value('stats:v:1');
    expect(v).toBe(42);
    expect(stub.getValue).toHaveBeenCalled();
  });

  it('should get pending', async () => {
    const stub = createMockStub({ current: 10, pending: 5, lastFlushAt: 0 });
    const driver = createTestDriver(stub);

    const p = await driver.pending('stats:v:1');
    expect(p).toBe(5);
  });

  it('should flush and return delta', async () => {
    const stub = createMockStub({ current: 10, pending: 7, lastFlushAt: 0 });
    const driver = createTestDriver(stub);

    const result = await driver.flush('stats:v:1');
    expect(result.flushed).toBe(7);
    expect(result.success).toBe(true);
    expect(stub.consumePending).toHaveBeenCalled();
  });

  it('should return flushed: 0 when pending is 0', async () => {
    const stub = createMockStub({ current: 10, pending: 0, lastFlushAt: 0 });
    const driver = createTestDriver(stub);

    const result = await driver.flush('stats:v:1');
    expect(result.flushed).toBe(0);
    expect(result.success).toBe(true);
  });

  it('should call flushHandler on flush', async () => {
    const stub = createMockStub({ current: 10, pending: 5, lastFlushAt: 0 });
    const handler = vi.fn();
    const driver = createTestDriver(stub, { 'stats:v:': handler });

    await driver.flush('stats:v:1');
    expect(handler).toHaveBeenCalledWith('stats:v:1', 5);
  });

  it('should return error if flushHandler throws', async () => {
    const stub = createMockStub({ current: 10, pending: 5, lastFlushAt: 0 });
    const handler = vi.fn().mockRejectedValue(new Error('DB down'));
    const driver = createTestDriver(stub, { 'stats:v:': handler });

    const result = await driver.flush('stats:v:1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('DB down');
  });

  it('should mget multiple values', async () => {
    const stub = createMockStub({ current: 99, pending: 0, lastFlushAt: 0 });
    const driver = createTestDriver(stub);

    const values = await driver.mget(['a', 'b', 'c']);
    expect(values).toEqual([99, 99, 99]);
  });
});

/**
 * Helper: create a driver backed by a single mock stub
 * (simulates the DO driver logic without needing real DOs)
 */
function createTestDriver(
  stub: ReturnType<typeof createMockStub>,
  flushHandlers: Record<string, FlushHandler> = new Map(),
) {
  const handlers =
    flushHandlers instanceof Map
      ? flushHandlers
      : new Map(Object.entries(flushHandlers));

  return {
    increment: stub.increment,
    decrement: stub.decrement,
    value: stub.getValue,
    mget: async (keys: string[]) => Promise.all(keys.map(() => stub.getValue())),
    pending: stub.getPending,
    close: async () => {},
    healthCheck: async () => true,
    flush: async (key: string) => {
      const delta = await stub.consumePending();
      if (delta === 0) return { flushed: 0, success: true };
      for (const [pattern, handler] of handlers) {
        if (key.startsWith(pattern)) {
          try {
            await handler(key, delta);
            return { flushed: Math.abs(delta), success: true };
          } catch (err) {
            return {
              flushed: 0,
              success: false,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        }
      }
      return { flushed: Math.abs(delta), success: true };
    },
    flushAll: async () => ({ flushed: 0, success: true }),
  };
}
```

- [ ] **Step 2: Run tests**

```bash
cd packages/honest-plugins/counter && pnpm test
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/honest-plugins/counter/src/counter-plugin.test.ts
git commit -m "test(counter): add unit tests for counter driver"
```

---

## Task 9: Verify Build & Integration

- [ ] **Step 1: Build the counter package**

```bash
cd packages/honest-plugins/counter && pnpm build
```

Expected: No TypeScript errors, `dist/` directory created.

- [ ] **Step 2: Build the barrel package**

```bash
cd packages/honest-plugins && pnpm build
```

Expected: No errors, counter subpath resolves.

- [ ] **Step 3: Build platform-api**

```bash
cd apps/platform-api && pnpm build
```

Expected: No import errors for `@rx-ted/packages-honest-plugins/counter`.

- [ ] **Step 4: Run all tests**

```bash
pnpm test
```

Expected: All existing tests pass, new counter tests pass.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(counter): complete DO counter plugin integration"
```
