# Layout Redesign & User Preferences Implementation Plan

> **Status: PARTIALLY IMPLEMENTED** — 前端布局系统已实现（Pinia store + localStorage），但 BullMQ 队列（`@rx-ted/packages-event-bus`）已从项目中移除，异步持久化方案未实现。当前使用 API 同步 + MySQL 持久化。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign web-blog layout system with 2 layouts, user-configurable components, and Redis-first → BullMQ → MySQL async persistence.

**Architecture:** Frontend Vue 3 stores layout config in Pinia, syncs via API to backend. Backend writes to Redis immediately, pushes job to BullMQ queue. Consumer worker asynchronously persists to MySQL. On read, checks Redis first, falls back to MySQL, then to localStorage defaults.

**Tech Stack:** Vue 3 + Pinia, Naive UI, NestJS/HonestJS, Drizzle ORM, MySQL, Redis, BullMQ

---

### Task 1: Add BullMQ dependency & create queue service

**Files:**
- Modify: `apps/platform-api/package.json`
- Create: `apps/platform-api/src/modules/user-layout/user-layout.queue.ts`

- [ ] **Step 1: Add bullmq to package.json**

Read `apps/platform-api/package.json`, add `"bullmq": "^5.0.0"` to `dependencies`.

- [ ] **Step 2: Install**

```bash
cd /Users/ben/projects/app && pnpm install
```

- [ ] **Step 3: Create BullMQ queue service**

Create `apps/platform-api/src/modules/user-layout/user-layout.queue.ts`:

```typescript
import { Service } from '@rx-ted/packages-honest';
import { Queue, Worker, type Job } from 'bullmq';
import { appConfig } from '../../lib/config';
import { logger } from '../../lib/logger';

export interface LayoutSyncJobData {
  userId: number;
  layoutId: string;
  config: Record<string, unknown>;
  version: number;
  timestamp: number;
}

@Service()
export class UserLayoutQueue {
  private queue: Queue<LayoutSyncJobData>;

  constructor() {
    const connection = {
      host: appConfig.get('REDIS_HOST', 'localhost'),
      port: Number(appConfig.get('REDIS_PORT', '6379')),
      username: appConfig.get('REDIS_USERNAME', undefined),
      password: appConfig.get('REDIS_PASSWORD', undefined),
    };

    this.queue = new Queue<LayoutSyncJobData>('layout-config-sync', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    });
  }

  async enqueue(data: LayoutSyncJobData): Promise<void> {
    await this.queue.add(`layout:${data.userId}`, data, {
      jobId: `layout:${data.userId}:${data.timestamp}`,
      deduplication: { id: `layout:${data.userId}` },
    });
  }

  createWorker(processor: (job: Job<LayoutSyncJobData>) => Promise<void>): Worker {
    const connection = {
      host: appConfig.get('REDIS_HOST', 'localhost'),
      port: Number(appConfig.get('REDIS_PORT', '6379')),
      username: appConfig.get('REDIS_USERNAME', undefined),
      password: appConfig.get('REDIS_PASSWORD', undefined),
    };

    const worker = new Worker<LayoutSyncJobData>('layout-config-sync', processor, {
      connection,
      concurrency: 5,
    });

    worker.on('failed', (job, err) => {
      logger.error(`Layout sync job ${job?.id} failed:`, err.message);
    });

    return worker;
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /Users/ben/projects/app && pnpm --filter @rx-ted/platform-api typecheck`
Expected: pass

- [ ] **Step 5: Commit**

```bash
git add apps/platform-api/package.json apps/platform-api/src/modules/user-layout/user-layout.queue.ts
git commit -m "feat(api): add bullmq queue for layout config sync"
```

---

### Task 2: Create UserLayout Drizzle entity & schema

**Files:**
- Create: `apps/platform-api/src/modules/user-layout/entities/user-layout.entity.ts`
- Modify: `apps/platform-api/src/schema/index.ts`

- [ ] **Step 1: Create Drizzle entity**

Create `apps/platform-api/src/modules/user-layout/entities/user-layout.entity.ts`:

```typescript
import { mysqlTable, bigint, varchar, json, int, datetime } from 'drizzle-orm/mysql-core';

export const userLayoutConfigs = mysqlTable('user_layout_configs', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  userId: bigint('user_id', { mode: 'number' }).unique().notNull(),
  layoutId: varchar('layout_id', { length: 20 }).notNull(),
  config: json('config').notNull().$type<Record<string, unknown>>(),
  version: int('version').default(1).notNull(),
  syncedAt: datetime('synced_at', { fsp: 3 }),
  createdAt: datetime('created_at', { fsp: 3 }).defaultNow().notNull(),
  updatedAt: datetime('updated_at', { fsp: 3 }).defaultNow().notNull().onUpdateNow(),
});

export type UserLayoutConfigEntity = typeof userLayoutConfigs.$inferSelect;
export type NewUserLayoutConfigEntity = typeof userLayoutConfigs.$inferInsert;
```

- [ ] **Step 2: Export from schema barrel**

Read `apps/platform-api/src/schema/index.ts` and add:

```typescript
export { userLayoutConfigs } from '../modules/user-layout/entities/user-layout.entity';
```

- [ ] **Step 3: Check types pass**

Run: `cd /Users/ben/projects/app && pnpm --filter @rx-ted/platform-api typecheck`
Expected: pass

- [ ] **Step 4: Commit**

```bash
git add apps/platform-api/src/modules/user-layout/entities/user-layout.entity.ts apps/platform-api/src/schema/index.ts
git commit -m "feat(api): add user_layout_configs drizzle entity"
```

---

### Task 3: Create UserLayout DTOs

**Files:**
- Create: `apps/platform-api/src/modules/user-layout/dtos/user-layout.schema.ts`
- Create: `apps/platform-api/src/modules/user-layout/dtos/user-layout.request.dto.ts`
- Create: `apps/platform-api/src/modules/user-layout/dtos/user-layout.response.dto.ts`

- [ ] **Step 1: Create Zod schemas**

Create `apps/platform-api/src/modules/user-layout/dtos/user-layout.schema.ts`:

```typescript
import { z } from 'zod';

export const LayoutIdSchema = z.enum(['layout-1', 'layout-2']);

export const LayoutComponentsSchema = z.object({
  topPinned: z.boolean().default(true),
  asideLeft: z.boolean().default(true),
  asideRight: z.boolean().default(false),
  footer: z.boolean().default(true),
  menuItems: z.array(z.object({
    icon: z.string(),
    label: z.string(),
    path: z.string().optional(),
    disabled: z.boolean().optional(),
  })).optional(),
});

export const LayoutConfigSchema = z.object({
  layoutId: LayoutIdSchema,
  components: LayoutComponentsSchema,
});

export const UpdateLayoutConfigSchema = z.object({
  layoutId: LayoutIdSchema,
  components: LayoutComponentsSchema.optional(),
});
```

- [ ] **Step 2: Create request DTO**

Create `apps/platform-api/src/modules/user-layout/dtos/user-layout.request.dto.ts`:

```typescript
import { z } from 'zod';
import { UpdateLayoutConfigSchema } from './user-layout.schema';

export type UpdateLayoutConfigInput = z.infer<typeof UpdateLayoutConfigSchema>;
```

- [ ] **Step 3: Create response DTO**

Create `apps/platform-api/src/modules/user-layout/dtos/user-layout.response.dto.ts`:

```typescript
export interface LayoutConfigResponse {
  userId: number;
  layoutId: string;
  components: Record<string, unknown>;
  version: number;
  updatedAt: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/platform-api/src/modules/user-layout/dtos/
git commit -m "feat(api): add user-layout DTOs and zod schemas"
```

---

### Task 4: Create UserLayout service (Redis-first read/write + queue)

**Files:**
- Create: `apps/platform-api/src/modules/user-layout/user-layout.service.ts`
- Modify: `apps/platform-api/src/constants/cache-keys.ts`

- [ ] **Step 1: Add cache keys**

Read `apps/platform-api/src/constants/cache-keys.ts`. Add:

```typescript
layoutUser: (userId: number) => `user:layout:${userId}`,
layoutDefault: 'user:layout:default',
layoutUserPattern: 'user:layout:*',
```

- [ ] **Step 2: Create service**

Create `apps/platform-api/src/modules/user-layout/user-layout.service.ts`:

```typescript
import { Service } from '@rx-ted/packages-honest';
import { DbService, CacheService } from '@rx-ted/packages-honest';
import { eq } from 'drizzle-orm';
import { userLayoutConfigs, type UserLayoutConfigEntity } from './entities/user-layout.entity';
import { UserLayoutQueue, type LayoutSyncJobData } from './user-layout.queue';
import { CACHE_KEYS } from '../../constants/cache-keys';
import type { UpdateLayoutConfigInput } from './dtos/user-layout.request.dto';
import type { LayoutConfigResponse } from './dtos/user-layout.response.dto';
import { ok, created } from '../../lib/response';

const DEFAULT_CONFIG = {
  layoutId: 'layout-1',
  components: {
    topPinned: true,
    asideLeft: true,
    asideRight: false,
    footer: true,
    menuItems: [
      { icon: 'tabler:home', label: 'nav.home', path: '/' },
      { icon: 'tabler:article', label: 'nav.posts', path: '/posts' },
      { icon: 'tabler:pencil', label: 'nav.write', path: '/editor' },
      { icon: 'tabler:user', label: 'nav.about', path: '/about' },
      { icon: 'tabler:settings', label: 'nav.settings', path: '/dashboard/settings' },
    ],
  },
};

@Service()
export class UserLayoutService {
  private layoutCacheTTL = 7 * 24 * 60 * 60; // 7 days

  constructor(
    private readonly db: DbService,
    private readonly cache: CacheService,
    private readonly queue: UserLayoutQueue,
  ) {}

  async getConfig(userId: number): Promise<LayoutConfigResponse> {
    // 1. Try Redis
    const cacheKey = CACHE_KEYS.layoutUser(userId);
    const cached = await this.cache.get<LayoutConfigResponse>(cacheKey);
    if (cached) return cached;

    // 2. Fallback to MySQL
    const rows = await this.db
      .select()
      .from(userLayoutConfigs)
      .where(eq(userLayoutConfigs.userId, userId))
      .limit(1);

    if (rows.length > 0) {
      const row = rows[0];
      const result: LayoutConfigResponse = {
        userId: row.userId,
        layoutId: row.layoutId,
        components: row.config as Record<string, unknown>,
        version: row.version,
        updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
      };
      // Backfill Redis
      await this.cache.set(cacheKey, result, this.layoutCacheTTL);
      return result;
    }

    // 3. Return default
    return {
      userId,
      layoutId: DEFAULT_CONFIG.layoutId,
      components: DEFAULT_CONFIG.components as unknown as Record<string, unknown>,
      version: 1,
      updatedAt: new Date().toISOString(),
    };
  }

  async updateConfig(userId: number, input: UpdateLayoutConfigInput): Promise<LayoutConfigResponse> {
    const cacheKey = CACHE_KEYS.layoutUser(userId);
    const now = new Date();
    const result: LayoutConfigResponse = {
      userId,
      layoutId: input.layoutId,
      components: input.components as unknown as Record<string, unknown>,
      version: 1,
      updatedAt: now.toISOString(),
    };

    // 1. Write to Redis immediately
    await this.cache.set(cacheKey, result, this.layoutCacheTTL);

    // 2. Enqueue async sync job
    await this.queue.enqueue({
      userId,
      layoutId: input.layoutId,
      config: input.components as unknown as Record<string, unknown>,
      version: 1,
      timestamp: now.getTime(),
    });

    return result;
  }

  async resetConfig(userId: number): Promise<LayoutConfigResponse> {
    const cacheKey = CACHE_KEYS.layoutUser(userId);
    const now = new Date();
    const result: LayoutConfigResponse = {
      userId,
      layoutId: DEFAULT_CONFIG.layoutId,
      components: DEFAULT_CONFIG.components as unknown as Record<string, unknown>,
      version: 1,
      updatedAt: now.toISOString(),
    };

    // 1. Write default to Redis
    await this.cache.set(cacheKey, result, this.layoutCacheTTL);

    // 2. Enqueue sync
    await this.queue.enqueue({
      userId,
      layoutId: DEFAULT_CONFIG.layoutId,
      config: DEFAULT_CONFIG.components as unknown as Record<string, unknown>,
      version: 1,
      timestamp: now.getTime(),
    });

    return result;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/platform-api/src/constants/cache-keys.ts apps/platform-api/src/modules/user-layout/user-layout.service.ts
git commit -m "feat(api): add user-layout service with redis-first read/write"
```

---

### Task 5: Create UserLayout controller

**Files:**
- Create: `apps/platform-api/src/modules/user-layout/user-layout.controller.ts`

- [ ] **Step 1: Create controller**

Create `apps/platform-api/src/modules/user-layout/user-layout.controller.ts`:

```typescript
import { Controller, Get, Put, Post, Body, Ctx, UseGuards } from '@rx-ted/packages-honest';
import { AuthGuard } from '../../common/guards/auth.guard';
import { UserLayoutService } from './user-layout.service';
import { UpdateLayoutConfigSchema } from './dtos/user-layout.schema';
import { ok } from '../../lib/response';

@Controller('user/layout-config', { tag: { name: '用户布局配置', description: '用户个性化布局配置' } })
@UseGuards(AuthGuard)
export class UserLayoutController {
  constructor(private readonly layoutService: UserLayoutService) {}

  @Get('/', {
    apiDoc: { summary: '获取布局配置', description: '获取当前用户的布局配置' },
  })
  async getConfig(@Ctx('userId') userId: number) {
    const config = await this.layoutService.getConfig(userId);
    return ok(config);
  }

  @Put('/', {
    apiDoc: { summary: '更新布局配置', description: '保存/更新当前用户的布局配置' },
  })
  async updateConfig(@Ctx('userId') userId: number, @Body(UpdateLayoutConfigSchema) body: unknown) {
    const config = await this.layoutService.updateConfig(userId, body as Parameters<typeof this.layoutService.updateConfig>[1]);
    return ok(config);
  }

  @Post('/reset', {
    apiDoc: { summary: '重置布局配置', description: '重置为系统默认布局' },
  })
  async resetConfig(@Ctx('userId') userId: number) {
    const config = await this.layoutService.resetConfig(userId);
    return ok(config);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/platform-api/src/modules/user-layout/user-layout.controller.ts
git commit -m "feat(api): add user-layout controller with get/put/reset"
```

---

### Task 6: Create BullMQ Consumer & Cron Processor

**Files:**
- Create: `apps/platform-api/src/modules/user-layout/user-layout.consumer.ts`
- Create: `apps/platform-api/src/modules/user-layout/user-layout.processor.ts`

- [ ] **Step 1: Create consumer**

Create `apps/platform-api/src/modules/user-layout/user-layout.consumer.ts`:

```typescript
import { Service } from '@rx-ted/packages-honest';
import { DbService } from '@rx-ted/packages-honest';
import { UserLayoutQueue, type LayoutSyncJobData } from './user-layout.queue';
import { userLayoutConfigs } from './entities/user-layout.entity';
import { logger } from '../../lib/logger';

@Service()
export class UserLayoutConsumer {
  constructor(
    private readonly db: DbService,
    private readonly queue: UserLayoutQueue,
  ) {
    this.start();
  }

  private start(): void {
    const worker = this.queue.createWorker(async (job) => {
      const { userId, layoutId, config, version } = job.data;

      await this.db
        .insert(userLayoutConfigs)
        .values({
          userId,
          layoutId,
          config: config as Record<string, unknown>,
          version,
          syncedAt: new Date(),
        })
        .onDuplicateKeyUpdate({
          set: {
            layoutId,
            config: config as Record<string, unknown>,
            version,
            syncedAt: new Date(),
          },
        });

      logger.info(`Layout config synced for user ${userId}`, { userId, layoutId });
    });
  }
}
```

- [ ] **Step 2: Create cron processor**

Create `apps/platform-api/src/modules/user-layout/user-layout.processor.ts`:

```typescript
import { Service } from '@rx-ted/packages-honest';
import { DbService, CacheService } from '@rx-ted/packages-honest';
import { UserLayoutQueue } from './user-layout.queue';
import { CACHE_KEYS } from '../../constants/cache-keys';
import { logger } from '../../lib/logger';

@Service()
export class UserLayoutCronProcessor {
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly db: DbService,
    private readonly cache: CacheService,
    private readonly queue: UserLayoutQueue,
  ) {}

  start(): void {
    // Run every 30 minutes
    this.interval = setInterval(() => this.flush(), 30 * 60 * 1000);
    logger.info('UserLayoutCronProcessor started (every 30min)');
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async flush(): Promise<void> {
    try {
      // Find Redis keys matching user layout pattern
      const keys = await this.cache.keys(CACHE_KEYS.layoutUserPattern);
      const userKeys = keys.filter((k) => k.startsWith('user:layout:') && !k.endsWith(':default'));

      for (const key of userKeys) {
        const cached = await this.cache.get<{
          userId: number;
          layoutId: string;
          components: Record<string, unknown>;
          version: number;
        }>(key);

        if (!cached) continue;

        await this.db
          .insert(userLayoutConfigs)
          .values({
            userId: cached.userId,
            layoutId: cached.layoutId,
            config: cached.components,
            version: cached.version,
            syncedAt: new Date(),
          })
          .onDuplicateKeyUpdate({
            set: {
              layoutId: cached.layoutId,
              config: cached.components,
              version: cached.version,
              syncedAt: new Date(),
            },
          });
      }

      logger.info(`Layout config flush completed: ${userKeys.length} users`);
    } catch (err) {
      logger.error('Layout config flush failed:', err);
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/platform-api/src/modules/user-layout/user-layout.consumer.ts apps/platform-api/src/modules/user-layout/user-layout.processor.ts
git commit -m "feat(api): add bullmq consumer and cron processor for layout sync"
```

---

### Task 7: Create UserLayout module & register in app

**Files:**
- Create: `apps/platform-api/src/modules/user-layout/user-layout.module.ts`
- Modify: `apps/platform-api/src/app.module.ts`

- [ ] **Step 1: Create module**

Create `apps/platform-api/src/modules/user-layout/user-layout.module.ts`:

```typescript
import { Module } from '@rx-ted/packages-honest';
import { UserLayoutController } from './user-layout.controller';
import { UserLayoutService } from './user-layout.service';
import { UserLayoutQueue } from './user-layout.queue';
import { UserLayoutConsumer } from './user-layout.consumer';
import { UserLayoutCronProcessor } from './user-layout.processor';

@Module({
  controllers: [UserLayoutController],
  services: [UserLayoutService, UserLayoutQueue, UserLayoutConsumer, UserLayoutCronProcessor],
})
class UserLayoutModule {}
export default UserLayoutModule;
```

- [ ] **Step 2: Register in app.module.ts**

Read `apps/platform-api/src/app.module.ts`. Add import at top and `UserLayoutModule` to `imports` array.

- [ ] **Step 3: Verify typecheck**

Run: `cd /Users/ben/projects/app && pnpm --filter @rx-ted/platform-api typecheck`
Expected: pass

- [ ] **Step 4: Commit**

```bash
git add apps/platform-api/src/modules/user-layout/user-layout.module.ts apps/platform-api/src/schema/index.ts apps/platform-api/src/app.module.ts
git commit -m "feat(api): register user-layout module in app"
```

---

### Task 8: Write backend tests

**Files:**
- Create: `apps/platform-api/src/modules/user-layout/user-layout.service.spec.ts`
- Create: `apps/platform-api/src/modules/user-layout/user-layout.controller.spec.ts`

- [ ] **Step 1: Write service test**

Create `apps/platform-api/src/modules/user-layout/user-layout.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserLayoutService } from './user-layout.service';
import { CACHE_KEYS } from '../../constants/cache-keys';

const mockDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve([])),
      })),
    })),
  })),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      onDuplicateKeyUpdate: vi.fn(() => ({
        set: vi.fn(() => Promise.resolve()),
      })),
    })),
  })),
};

const mockCache = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

const mockQueue = {
  enqueue: vi.fn(),
};

describe('UserLayoutService', () => {
  let service: UserLayoutService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserLayoutService(mockDb as any, mockCache as any, mockQueue as any);
  });

  it('returns cached config when Redis has it', async () => {
    const cached = { userId: 1, layoutId: 'layout-1', components: { topPinned: true }, version: 1, updatedAt: '2024-01-01' };
    mockCache.get.mockResolvedValue(cached);

    const result = await service.getConfig(1);

    expect(result).toEqual(cached);
    expect(mockCache.get).toHaveBeenCalledWith(CACHE_KEYS.layoutUser(1));
  });

  it('falls back to MySQL when Redis misses', async () => {
    mockCache.get.mockResolvedValue(null);
    mockDb.select().from().where().limit.mockResolvedValue([]);

    const result = await service.getConfig(1);

    expect(result.layoutId).toBe('layout-1');
    expect(mockCache.set).toHaveBeenCalled();
  });

  it('writes to Redis and enqueues on update', async () => {
    const input = { layoutId: 'layout-2', components: { topPinned: false, asideLeft: false, asideRight: false, footer: false } };

    const result = await service.updateConfig(1, input);

    expect(mockCache.set).toHaveBeenCalled();
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, layoutId: 'layout-2' }),
    );
    expect(result.layoutId).toBe('layout-2');
  });
});
```

- [ ] **Step 2: Write controller test**

Create `apps/platform-api/src/modules/user-layout/user-layout.controller.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { UserLayoutController } from './user-layout.controller';

const mockService = {
  getConfig: vi.fn(),
  updateConfig: vi.fn(),
  resetConfig: vi.fn(),
};

describe('UserLayoutController', () => {
  const controller = new UserLayoutController(mockService as any);

  it('getConfig returns ok response', async () => {
    mockService.getConfig.mockResolvedValue({ userId: 1, layoutId: 'layout-1', components: {}, version: 1, updatedAt: '' });

    const result = await controller.getConfig(1);

    expect(result.status).toBe(200);
    expect(result.code).toBe('OK');
  });

  it('updateConfig returns ok response', async () => {
    const input = { layoutId: 'layout-2', components: { topPinned: false, asideLeft: false, asideRight: false, footer: false } };
    mockService.updateConfig.mockResolvedValue({ userId: 1, ...input, version: 1, updatedAt: '' });

    const result = await controller.updateConfig(1, input);

    expect(result.status).toBe(200);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `cd /Users/ben/projects/app && pnpm --filter @rx-ted/platform-api test`
Expected: pass

- [ ] **Step 4: Commit**

```bash
git add apps/platform-api/src/modules/user-layout/user-layout.service.spec.ts apps/platform-api/src/modules/user-layout/user-layout.controller.spec.ts
git commit -m "test(api): add user-layout service and controller tests"
```

---

### Task 9: Add layout config types & constants (frontend)

**Files:**
- Create: `apps/web-blog/src/constants/layout.ts`
- Modify: `apps/web-blog/src/constants/storage.ts`
- Modify: `apps/web-blog/src/theme/app.ts`

- [ ] **Step 1: Create layout constants**

Create `apps/web-blog/src/constants/layout.ts`:

```typescript
export const LAYOUT = {
  IDS: ['layout-1', 'layout-2'] as const,
  DEFAULT_ID: 'layout-1',
} as const;

export interface LayoutConfig {
  layoutId: (typeof LAYOUT.IDS)[number];
  components: LayoutComponents;
}

export interface LayoutComponents {
  topPinned: boolean;
  asideLeft: boolean;
  asideRight: boolean;
  footer: boolean;
  menuItems: MenuItem[];
}

export interface MenuItem {
  icon: string;
  label: string;
  path?: string;
  disabled?: boolean;
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  layoutId: 'layout-1',
  components: {
    topPinned: true,
    asideLeft: true,
    asideRight: false,
    footer: true,
    menuItems: [
      { icon: 'tabler:home', label: 'nav.home', path: '/' },
      { icon: 'tabler:article', label: 'nav.posts', path: '/posts' },
      { icon: 'tabler:pencil', label: 'nav.write', path: '/editor' },
      { icon: 'tabler:user', label: 'nav.about', path: '/about' },
      { icon: 'tabler:settings', label: 'nav.settings', path: '/dashboard/settings' },
    ],
  },
};
```

- [ ] **Step 2: Add storage key**

Read `apps/web-blog/src/constants/storage.ts`. Add:

```typescript
LAYOUT_CONFIG: 'app:layout-config',
```

- [ ] **Step 3: Commit**

```bash
git add apps/web-blog/src/constants/layout.ts apps/web-blog/src/constants/storage.ts
git commit -m "feat(blog): add layout config types and constants"
```

---

### Task 10: Create layout API client (frontend)

**Files:**
- Create: `apps/web-blog/src/http/api/layout.ts`

- [ ] **Step 1: Create API client**

Create `apps/web-blog/src/http/api/layout.ts`:

```typescript
import { http } from '@/http/client';
import type { LayoutConfig } from '@/constants/layout';

export interface LayoutConfigResponse {
  userId: number;
  layoutId: string;
  components: Record<string, unknown>;
  version: number;
  updatedAt: string;
}

export async function fetchLayoutConfig(): Promise<LayoutConfigResponse> {
  const res = await http.get<LayoutConfigResponse>('/user/layout-config');
  return res.data;
}

export async function updateLayoutConfig(config: LayoutConfig): Promise<LayoutConfigResponse> {
  const res = await http.put<LayoutConfigResponse>('/user/layout-config', config);
  return res.data;
}

export async function resetLayoutConfig(): Promise<LayoutConfigResponse> {
  const res = await http.post<LayoutConfigResponse>('/user/layout-config/reset', {});
  return res.data;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web-blog/src/http/api/layout.ts
git commit -m "feat(blog): add layout config API client"
```

---

### Task 11: Create layout Pinia store

**Files:**
- Create: `apps/web-blog/src/stores/layout.ts`

- [ ] **Step 1: Create store**

Create `apps/web-blog/src/stores/layout.ts`:

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useStorage } from '@/composables/useStorage';
import { STORAGE_KEYS } from '@/constants/storage';
import { LAYOUT, DEFAULT_LAYOUT_CONFIG } from '@/constants/layout';
import type { LayoutConfig, LayoutComponents } from '@/constants/layout';
import * as layoutApi from '@/http/api/layout';

export const useLayoutStore = defineStore('layout', () => {
  const storage = useStorage();

  const layoutId = ref<string>(LAYOUT.DEFAULT_ID);
  const components = ref<LayoutComponents>({ ...DEFAULT_LAYOUT_CONFIG.components });
  const loading = ref(false);
  const error = ref(false);
  const online = ref(navigator.onLine);

  const isLayout1 = computed(() => layoutId.value === 'layout-1');
  const isLayout2 = computed(() => layoutId.value === 'layout-2');

  function loadLocalDefault() {
    const stored = storage.get(STORAGE_KEYS.LAYOUT_CONFIG);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as LayoutConfig;
        layoutId.value = parsed.layoutId ?? LAYOUT.DEFAULT_ID;
        components.value = { ...DEFAULT_LAYOUT_CONFIG.components, ...parsed.components };
        return;
      } catch {
        // ignore parse error
      }
    }
    layoutId.value = LAYOUT.DEFAULT_ID;
    components.value = { ...DEFAULT_LAYOUT_CONFIG.components };
  }

  function persistLocal() {
    storage.set(STORAGE_KEYS.LAYOUT_CONFIG, JSON.stringify({
      layoutId: layoutId.value,
      components: components.value,
    }));
  }

  async function fetchConfig() {
    loading.value = true;
    error.value = false;

    try {
      const res = await layoutApi.fetchLayoutConfig();
      layoutId.value = res.layoutId;
      components.value = { ...DEFAULT_LAYOUT_CONFIG.components, ...res.components as Partial<LayoutComponents> };
      persistLocal();
    } catch {
      error.value = true;
      loadLocalDefault();
    } finally {
      loading.value = false;
    }
  }

  async function updateConfig(config: Partial<LayoutConfig>) {
    loading.value = true;
    error.value = false;

    if (config.layoutId) layoutId.value = config.layoutId;
    if (config.components) components.value = { ...components.value, ...config.components };

    persistLocal();

    try {
      await layoutApi.updateLayoutConfig({
        layoutId: layoutId.value,
        components: components.value,
      });
    } catch {
      error.value = true;
      // Keep local changes, will sync later
    } finally {
      loading.value = false;
    }
  }

  async function resetConfig() {
    loading.value = true;

    try {
      await layoutApi.resetLayoutConfig();
    } catch {
      // ignore
    }

    layoutId.value = LAYOUT.DEFAULT_ID;
    components.value = { ...DEFAULT_LAYOUT_CONFIG.components };
    persistLocal();
    loading.value = false;
  }

  return {
    layoutId,
    components,
    loading,
    error,
    online,
    isLayout1,
    isLayout2,
    fetchConfig,
    updateConfig,
    resetConfig,
    loadLocalDefault,
    persistLocal,
  };
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web-blog/src/stores/layout.ts
git commit -m "feat(blog): add layout pinia store with api sync and local fallback"
```

---

### Task 12: Create Layout2.vue

**Files:**
- Create: `apps/web-blog/src/layouts/Layout2.vue`

- [ ] **Step 1: Create Layout2 component**

Create `apps/web-blog/src/layouts/Layout2.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useThemeTransition } from '@/theme/useTheme';
import { useLayoutStore } from '@/stores/layout';
import TopBar from './TopBar.vue';
import SideBar from './SideBar.vue';
import SearchModal from '@/components/SearchModal.vue';
import AnnouncementBar from '@/components/AnnouncementBar.vue';
import { useAppNotices } from '@/composables/useAppNotices';

const siderCollapsed = ref(false);
const searchModalRef = ref<InstanceType<typeof SearchModal> | null>(null);
const layout = useLayoutStore();

useThemeTransition();
const { show: showNotices } = useAppNotices();

onMounted(() => {
  showNotices();
});

function onSearchClick() {
  searchModalRef.value?.openSearch();
}
</script>

<template>
  <div class="layout2-root">
    <AnnouncementBar
      v-if="layout.components.topPinned"
      id="site-maintenance"
      icon="tabler:alert-triangle"
      message="系统将于本周日凌晨 2:00-4:00 进行维护升级"
      :link="{ text: '详情', to: '/changelog' }"
    />
    <TopBar @search-click="onSearchClick" />

    <div class="layout2-body">
      <SideBar
        v-model:collapsed="siderCollapsed"
      />
      <div class="layout2-content">
        <main class="layout2-main">
          <slot />
        </main>
      </div>
    </div>

    <SearchModal ref="searchModalRef" />
  </div>
</template>

<style scoped>
.layout2-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  height: 100dvh;
}

.layout2-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.layout2-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-y: auto;
  background: var(--app-bg);
}

.layout2-main {
  flex: 1;
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  padding: 0 32px;
}

@media (max-width: 767px) {
  .layout2-main {
    padding: 0 16px;
  }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web-blog/src/layouts/Layout2.vue
git commit -m "feat(blog): add Layout2 - compact dual-panel layout"
```

---

### Task 13: Update LayoutResolver, FullLayout, SideBar, TopBar

**Files:**
- Modify: `apps/web-blog/src/layouts/LayoutResolver.vue`
- Modify: `apps/web-blog/src/layouts/FullLayout.vue`
- Modify: `apps/web-blog/src/layouts/SideBar.vue`
- Modify: `apps/web-blog/src/layouts/TopBar.vue`

- [ ] **Step 1: Update LayoutResolver**

Read and rewrite `apps/web-blog/src/layouts/LayoutResolver.vue`:

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useLayoutStore } from '@/stores/layout';
import DocLayout from './DocLayout.vue';
import BlankLayout from './BlankLayout.vue';
import FullLayout from './FullLayout.vue';
import Layout2 from './Layout2.vue';

const route = useRoute();
const layout = useLayoutStore();

onMounted(() => {
  layout.fetchConfig().catch(() => layout.loadLocalDefault());
});

function layoutComponent(pageLayout: string | undefined) {
  if (pageLayout === 'doc') return DocLayout;
  if (pageLayout === 'blank') return BlankLayout;
  if (layout.isLayout2) return Layout2;
  return FullLayout;
}
</script>

<template>
  <component :is="layoutComponent(route.meta.layout as string | undefined)">
    <router-view />
  </component>
</template>
```

- [ ] **Step 2: Update FullLayout with conditional components**

Read and rewrite `apps/web-blog/src/layouts/FullLayout.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useThemeTransition } from '@/theme/useTheme';
import { useLayoutStore } from '@/stores/layout';
import TopBar from './TopBar.vue';
import SideBar from './SideBar.vue';
import SearchModal from '@/components/SearchModal.vue';
import AnnouncementBar from '@/components/AnnouncementBar.vue';
import { useAppNotices } from '@/composables/useAppNotices';

const siderCollapsed = ref(false);
const searchModalRef = ref<InstanceType<typeof SearchModal> | null>(null);
const layout = useLayoutStore();

useThemeTransition();
const { show: showNotices } = useAppNotices();

onMounted(() => {
  showNotices();
});

function onSearchClick() {
  searchModalRef.value?.openSearch();
}
</script>

<template>
  <div class="app-root">
    <AnnouncementBar
      v-if="layout.components.topPinned"
      id="site-maintenance"
      icon="tabler:alert-triangle"
      message="系统将于本周日凌晨 2:00-4:00 进行维护升级"
      :link="{ text: '详情', to: '/changelog' }"
    />
    <TopBar @search-click="onSearchClick" />

    <div class="app-body-row">
      <SideBar
        v-model:collapsed="siderCollapsed"
      />

      <div class="app-content">
        <div v-if="layout.components.asideLeft" class="app-aside-left">
          <!-- left aside content -->
        </div>
        <main class="app-main">
          <slot />
        </main>
        <div v-if="layout.components.asideRight" class="app-aside-right">
          <!-- right aside content -->
        </div>
      </div>
    </div>

    <footer v-if="layout.components.footer" class="app-footer">
      <span>© 2026 Blog</span>
      <span class="footer-links">
        <a href="/about">关于</a>
        <a href="/copyright">版权</a>
      </span>
    </footer>

    <SearchModal ref="searchModalRef" />
  </div>
</template>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  height: 100dvh;
}

.app-body-row {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.app-content {
  flex: 1;
  display: flex;
  min-width: 0;
  overflow-y: auto;
  background: var(--app-bg);
}

.app-main {
  flex: 1;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 32px;
}

.app-aside-left,
.app-aside-right {
  flex-shrink: 0;
  width: 70px;
  padding: 16px 0;
}

.app-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 16px;
  border-top: 1px solid var(--app-border);
  font-size: 12px;
  color: var(--app-text-tertiary);
}

.footer-links a {
  color: var(--app-text-secondary);
  text-decoration: none;
}

@media (max-width: 767px) {
  .app-main {
    padding: 0 16px;
  }
  .app-aside-left,
  .app-aside-right {
    display: none;
  }
}
</style>
```

- [ ] **Step 3: Update SideBar to accept menuItems**

Read `apps/web-blog/src/layouts/SideBar.vue`. Modify the `navItems` computed to accept items from the layout store. Add:

```typescript
import { useLayoutStore } from '@/stores/layout';

// Inside setup:
const layout = useLayoutStore();
```

Replace the `navItems` computed with:

```typescript
const navItems = computed<SiderItem[]>(() =>
  layout.components.menuItems
    .filter((item) => item.path)
    .map((item) => ({
      icon: item.icon,
      label: item.label,
      path: item.path,
      disabled: item.disabled,
    })),
);
```

- [ ] **Step 4: Run typecheck**

Run: `cd /Users/ben/projects/app && pnpm --filter @rx-ted/web-blog typecheck`
Expected: pass

- [ ] **Step 5: Commit**

```bash
git add apps/web-blog/src/layouts/LayoutResolver.vue apps/web-blog/src/layouts/FullLayout.vue apps/web-blog/src/layouts/SideBar.vue
git commit -m "feat(blog): update layouts to use config-driven rendering"
```

---

### Task 14: Create layout settings UI components

**Files:**
- Create: `apps/web-blog/src/components/settings/LayoutSettings.vue`
- Create: `apps/web-blog/src/components/settings/ComponentToggles.vue`
- Modify: `apps/web-blog/src/pages/dashboard/SettingsPage.vue`

- [ ] **Step 1: Create LayoutSettings component**

Create `apps/web-blog/src/components/settings/LayoutSettings.vue`:

```vue
<script setup lang="ts">
import { useLayoutStore } from '@/stores/layout';
import { LAYOUT } from '@/constants/layout';

const layout = useLayoutStore();

const layouts = [
  {
    id: 'layout-1',
    title: '完整三栏布局',
    desc: 'header + 左翼栏 + 内容区 + 右翼栏 + footer',
    preview: '┌─ header ─┐\n│ L | C | R │\n├─┬──┬──┬─┤\n│L│  │C │R│\n│A│  │O │A│\n└─┴──┴──┴─┘',
  },
  {
    id: 'layout-2',
    title: '简洁双栏布局',
    desc: 'topbar + 侧栏 + 内容区，无 footer',
    preview: '┌─ topbar ─┐\n│ L | C | R │\n├──┬───────┤\n│S │       │\n│I │CONTENT│\n│D │       │\n└──┴───────┘',
  },
];

function selectLayout(id: string) {
  layout.updateConfig({ layoutId: id as (typeof LAYOUT.IDS)[number] });
}
</script>

<template>
  <div class="layout-settings">
    <h3>布局选择</h3>
    <p class="subtitle">选择你偏好的页面布局方式，全局生效</p>
    <div class="layout-options">
      <div
        v-for="item in layouts"
        :key="item.id"
        class="layout-card"
        :class="{ active: layout.layoutId === item.id }"
        @click="selectLayout(item.id)"
      >
        <div class="layout-preview">
          <pre>{{ item.preview }}</pre>
        </div>
        <div class="layout-info">
          <div class="layout-name">{{ item.title }}</div>
          <div class="layout-desc">{{ item.desc }}</div>
        </div>
        <div class="layout-check">
          <span v-if="layout.layoutId === item.id">✓</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout-settings {
  margin-bottom: 24px;
}

.layout-settings h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 13px;
  color: var(--app-text-secondary);
  margin-bottom: 16px;
}

.layout-options {
  display: flex;
  gap: 16px;
}

.layout-card {
  flex: 1;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.layout-card:hover {
  border-color: var(--app-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.layout-card.active {
  border-color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 6%, transparent);
}

.layout-preview pre {
  font-family: monospace;
  font-size: 10px;
  line-height: 1.4;
  background: var(--app-bg-muted);
  padding: 8px;
  border-radius: 4px;
  color: var(--app-text-secondary);
}

.layout-info {
  flex: 1;
}

.layout-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.layout-desc {
  font-size: 12px;
  color: var(--app-text-secondary);
}

.layout-check {
  font-size: 18px;
  color: var(--app-primary);
  font-weight: 700;
}
</style>
```

- [ ] **Step 2: Create ComponentToggles**

Create `apps/web-blog/src/components/settings/ComponentToggles.vue`:

```vue
<script setup lang="ts">
import { useLayoutStore } from '@/stores/layout';

const layout = useLayoutStore();

interface ToggleItem {
  key: string;
  label: string;
  desc: string;
  show: boolean;
}

const allToggles = [
  { key: 'topPinned', label: '通知栏', desc: '顶部 pinned 通知栏' },
  { key: 'asideLeft', label: '左翼栏', desc: '内容区左侧信息栏' },
  { key: 'asideRight', label: '右翼栏', desc: '内容区右侧信息栏' },
  { key: 'footer', label: '页脚', desc: '底部 footer' },
];

const toggles = $computed(() =>
  allToggles
    .filter((t) => t.key === 'topPinned' || layout.isLayout1)
    .map((t) => ({
      ...t,
      show: layout.components[t.key as keyof typeof layout.components] as boolean,
    })),
);

function toggle(key: string) {
  layout.updateConfig({
    components: {
      ...layout.components,
      [key]: !layout.components[key as keyof typeof layout.components],
    },
  });
}
</script>

<template>
  <div class="component-toggles">
    <h3>组件开关</h3>
    <p class="subtitle">控制页面各区域的显示与隐藏</p>
    <div class="toggle-list">
      <div
        v-for="item in toggles"
        :key="item.key"
        class="toggle-item"
        :class="{ disabled: !item.show }"
      >
        <div class="toggle-info">
          <div class="toggle-label">{{ item.label }}</div>
          <div class="toggle-desc">{{ item.desc }}</div>
        </div>
        <button
          class="toggle-btn"
          :class="{ active: item.show }"
          @click="toggle(item.key)"
        >
          {{ item.show ? '开' : '关' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.component-toggles {
  margin-bottom: 24px;
}

.component-toggles h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 13px;
  color: var(--app-text-secondary);
  margin-bottom: 16px;
}

.toggle-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  transition: all 0.15s;
}

.toggle-item.disabled {
  opacity: 0.5;
}

.toggle-label {
  font-size: 14px;
  font-weight: 500;
}

.toggle-desc {
  font-size: 12px;
  color: var(--app-text-secondary);
  margin-top: 2px;
}

.toggle-btn {
  padding: 4px 16px;
  border-radius: 6px;
  border: 1px solid var(--app-border);
  background: var(--app-bg-muted);
  color: var(--app-text-secondary);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.12s;
}

.toggle-btn.active {
  background: var(--app-primary);
  color: white;
  border-color: var(--app-primary);
}
</style>
```

- [ ] **Step 3: Integrate into Dashboard Settings page**

Read `apps/web-blog/src/pages/dashboard/SettingsPage.vue`. Add imports and components:

- Import `LayoutSettings` and `ComponentToggles`
- Add them to the template in a new "布局设置" section

Example addition to template (find existing settings sections and add after them):

```vue
<template>
  <div class="settings-page">
    <!-- existing settings... -->

    <n-card title="布局设置" class="settings-section">
      <LayoutSettings />
      <ComponentToggles />
    </n-card>

    <!-- existing settings... -->
  </div>
</template>

<script setup lang="ts">
// ... existing imports
import LayoutSettings from '@/components/settings/LayoutSettings.vue';
import ComponentToggles from '@/components/settings/ComponentToggles.vue';
</script>
```

- [ ] **Step 4: Run typecheck**

Run: `cd /Users/ben/projects/app && pnpm --filter @rx-ted/web-blog typecheck`
Expected: pass

- [ ] **Step 5: Commit**

```bash
git add apps/web-blog/src/components/settings/ apps/web-blog/src/pages/dashboard/SettingsPage.vue
git commit -m "feat(blog): add layout settings UI with layout picker and component toggles"
```

---

### Task 15: Write frontend store tests

**Files:**
- Create: `apps/web-blog/src/stores/layout.spec.ts`

- [ ] **Step 1: Write layout store test**

Create `apps/web-blog/src/stores/layout.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useLayoutStore } from './layout';
import { DEFAULT_LAYOUT_CONFIG } from '@/constants/layout';

vi.mock('@/http/client', () => ({
  http: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/composables/useStorage', () => ({
  useStorage: () => ({
    get: vi.fn(() => null),
    set: vi.fn(),
  }),
}));

describe('layout store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts with default layout config', () => {
    const store = useLayoutStore();
    expect(store.layoutId).toBe('layout-1');
    expect(store.components.topPinned).toBe(true);
    expect(store.components.footer).toBe(true);
  });

  it('loadLocalDefault restores defaults', () => {
    const store = useLayoutStore();
    store.layoutId = 'layout-2';
    store.components.topPinned = false;
    store.loadLocalDefault();
    expect(store.layoutId).toBe('layout-1');
    expect(store.components.topPinned).toBe(true);
  });

  it('computed isLayout1 and isLayout2 work', () => {
    const store = useLayoutStore();
    expect(store.isLayout1).toBe(true);
    expect(store.isLayout2).toBe(false);
    store.layoutId = 'layout-2';
    expect(store.isLayout1).toBe(false);
    expect(store.isLayout2).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd /Users/ben/projects/app && pnpm --filter @rx-ted/web-blog test`
Expected: pass

- [ ] **Step 3: Commit**

```bash
git add apps/web-blog/src/stores/layout.spec.ts
git commit -m "test(blog): add layout store unit tests"
```

---

### Task 16: Create database migration

**Files:**
- Create: `apps/platform-api/drizzle/migrations/0006_<name>.ts`

- [ ] **Step 1: Generate migration**

Run: `cd /Users/ben/projects/app/apps/platform-api && pnpm exec drizzle-kit generate`
Expected: generates new migration file for `user_layout_configs` table

- [ ] **Step 2: Commit**

```bash
git add apps/platform-api/drizzle/migrations/
git commit -m "feat(api): add user_layout_configs migration"
```
