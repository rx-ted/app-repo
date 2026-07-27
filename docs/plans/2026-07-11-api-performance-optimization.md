# API Performance Optimization Plan

> **Status: PARTIALLY IMPLEMENTED** — 部分优化已实施，索引和缓存预热待验证。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3500ms+ API response times by adding missing indexes, optimizing ResponseWrapper middleware, implementing pagination, and adding cache warming.

**Architecture:** Add index creation to SystemInitService for mapping tables, optimize ResponseWrapper to skip clone/parse for already-wrapped responses, wire up existing pagination schema through tags controller/service/repository, and add cache warming on startup.

**Tech Stack:** Drizzle ORM, MySQL, Hono middleware, Honest DI framework, Zod schemas

---

## File Structure

| File | Responsibility |
|------|---------------|
| `apps/platform-api/src/modules/system/system-init.service.ts` | Add `ensureIndexes()` method with CREATE INDEX IF NOT EXISTS |
| `apps/platform-api/src/common/middleware/response-wrapper.middleware.ts` | Optimize to skip clone/parse for already-wrapped responses |
| `apps/platform-api/src/modules/tags/tags.controller.ts` | Accept query params for pagination |
| `apps/platform-api/src/modules/tags/tags.service.ts` | Pass pagination to repository |
| `apps/platform-api/src/modules/tags/repositories/tags.repository.ts` | Add LIMIT/OFFSET to query, add cache warming |
| `apps/platform-api/src/lib/plugins.ts` | Add cache warming after DB init |
| `apps/platform-api/src/modules/post/entities/post.entity.ts` | Remove TODO comments for indexes (now implemented) |
| `apps/platform-api/src/modules/category/repositories/category.repository.ts` | Verify category query also benefits from indexes |

---

### Task 1: Add Index Creation to SystemInitService

**Files:**
- Modify: `apps/platform-api/src/modules/system/system-init.service.ts:119-123`
- Modify: `apps/platform-api/src/modules/post/entities/post.entity.ts:120-122`

- [ ] **Step 1: Add ensureIndexes method to SystemInitService**

Add a new `ensureIndexes` method that creates indexes on mapping tables using raw SQL:

```typescript
private async ensureIndexes(): Promise<void> {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS ptm_tag_id_idx ON post_tag_mappings (tag_id)',
    'CREATE INDEX IF NOT EXISTS ptm_post_id_idx ON post_tag_mappings (post_id)',
    'CREATE INDEX IF NOT EXISTS pcm_category_id_idx ON post_category_mappings (category_id)',
    'CREATE INDEX IF NOT EXISTS pcm_post_id_idx ON post_category_mappings (post_id)',
    'CREATE UNIQUE INDEX IF NOT EXISTS ptm_composite_idx ON post_tag_mappings (post_id, tag_id)',
    'CREATE UNIQUE INDEX IF NOT EXISTS pcm_composite_idx ON post_category_mappings (post_id, category_id)',
  ];
  for (const sql of indexes) {
    await this.db.execute(sql);
  }
}
```

- [ ] **Step 2: Register ensureIndexes in modules**

Update the modules record to include the new method:

```typescript
private readonly modules: Record<string, () => Promise<void>> = {
  permissions: () => this.runPermissions(),
  roles: () => this.runRoles(),
  seed_content: () => this.runSeedContent(),
  indexes: () => this.ensureIndexes(),
};
```

- [ ] **Step 3: Run tests to verify no regressions**

Run: `pnpm --filter @rx-ted/platform-api test`
Expected: All 107 tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/platform-api/src/modules/system/system-init.service.ts
git commit -m "feat(platform-api): add index creation for mapping tables"
```

---

### Task 2: Optimize ResponseWrapper Middleware

**Files:**
- Modify: `apps/platform-api/src/common/middleware/response-wrapper.middleware.ts:19-35`

- [ ] **Step 1: Add fast-path check before clone**

Replace the current implementation with an optimized version that checks the response body string before cloning:

```typescript
import type { IMiddleware } from '@rx-ted/packages-honest';
import type { Context, Next } from 'hono';

export class ResponseWrapper implements IMiddleware {
  async use(c: Context, next: Next): Promise<void> {
    await next();

    const res = c.res;
    if (!res) return;

    if (!(res instanceof Response)) {
      c.res = c.json({ status: 200, code: 'OK', data: res }, 200);
      return;
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) return;

    // Fast path: check if already wrapped without cloning
    const text = await res.text();
    if (!text.startsWith('{')) return;

    try {
      const body = JSON.parse(text);
      if (!body || typeof body !== 'object') {
        c.res = new Response(text, res);
        return;
      }
      if (
        'status' in body &&
        'code' in body &&
        'data' in body
      ) {
        c.res = new Response(text, res);
        return;
      }
      c.res = c.json({ status: res.status, code: 'OK', data: body }, res.status as never);
    } catch {
      c.res = new Response(text, res);
    }
  }
}
```

- [ ] **Step 2: Run tests to verify no regressions**

Run: `pnpm --filter @rx-ted/platform-api test`
Expected: All 107 tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/platform-api/src/common/middleware/response-wrapper.middleware.ts
git commit -m "perf(platform-api): optimize ResponseWrapper to skip clone for wrapped responses"
```

---

### Task 3: Implement Pagination for Tags

**Files:**
- Modify: `apps/platform-api/src/modules/tags/tags.controller.ts:50-51`
- Modify: `apps/platform-api/src/modules/tags/tags.service.ts:18-21`
- Modify: `apps/platform-api/src/modules/tags/repositories/tags.repository.ts:28-53`

- [ ] **Step 1: Update controller to accept query params**

Modify the `list` method to accept and pass pagination parameters:

```typescript
async list(@Var('query') query: { page?: number; pageSize?: number }) {
  const page = query?.page ?? 1;
  const pageSize = query?.pageSize ?? 10;
  return this.tagsService.findAll(page, pageSize);
}
```

- [ ] **Step 2: Update service to pass pagination**

Modify the `findAll` method signature and pass parameters to repository:

```typescript
async findAll(page: number = 1, pageSize: number = 10): Promise<{ data: TagResponseDto[]; total: number }> {
  const { tags, total } = await this.tagsRepo.list(page, pageSize);
  const data = tags.map(TagMapper.toResponse);
  return { data, total };
}
```

- [ ] **Step 3: Update repository to use LIMIT/OFFSET**

Modify the `list` method to accept pagination and add COUNT query:

```typescript
async list(page: number = 1, pageSize: number = 10): Promise<{ tags: TagEntity[]; total: number }> {
  const cacheKey = `tags:list:${page}:${pageSize}`;
  return cacheable(this.cache, cacheKey, CACHE.USER_SESSION_TTL, async () => {
    const offset = (page - 1) * pageSize;
    
    const [countResult] = await this.db
      .select({ count: count() })
      .from(postTags);
    
    const rows = await this.db
      .select({
        id: postTags.id,
        name: postTags.name,
        slug: postTags.slug,
        createdBy: postTags.createdBy,
        usageCount: count(postTagMappings.tagId),
        createdAt: postTags.createdAt,
        updatedAt: postTags.updatedAt,
      })
      .from(postTags)
      .leftJoin(postTagMappings, eq(postTags.id, postTagMappings.tagId))
      .groupBy(postTags.id)
      .orderBy(desc(postTags.updatedAt))
      .limit(pageSize)
      .offset(offset);
    
    return {
      tags: rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        createdBy: r.createdBy,
        usageCount: r.usageCount,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total: countResult?.count ?? 0,
    };
  });
}
```

- [ ] **Step 4: Update cache invalidation to clear all pages**

Update the cache deletion in create/update/delete methods to clear all page caches:

```typescript
private async clearAllPageCaches(): Promise<void> {
  // Clear first few pages (most commonly accessed)
  for (let page = 1; page <= 10; page++) {
    for (const pageSize of [10, 20, 50]) {
      await this.cache.delete(`tags:list:${page}:${pageSize}`);
    }
  }
}
```

- [ ] **Step 5: Run tests to verify no regressions**

Run: `pnpm --filter @rx-ted/platform-api test`
Expected: All 107 tests pass

- [ ] **Step 6: Commit**

```bash
git add apps/platform-api/src/modules/tags/tags.controller.ts apps/platform-api/src/modules/tags/tags.service.ts apps/platform-api/src/modules/tags/repositories/tags.repository.ts
git commit -m "feat(platform-api): implement pagination for tags endpoint"
```

---

### Task 4: Add Cache Warming on Startup

**Files:**
- Modify: `apps/platform-api/src/lib/plugins.ts:37-44`
- Modify: `apps/platform-api/src/modules/tags/repositories/tags.repository.ts:28-53`

- [ ] **Step 1: Add warmTagsCache function**

Create a new function in `lib/plugins.ts` to warm the tags cache:

```typescript
async function warmTagsCache(): Promise<void> {
  try {
    const { CacheService } = await import('@rx-ted/packages-honest-plugins-cache');
    const { TagsRepository } = await import('@/modules/tags/repositories/tags.repository');
    const { DbService } = await import('@rx-ted/packages-honest-plugins-db');
    const { ComponentManager } = await import('@rx-ted/packages-honest');
    
    const cache = ComponentManager.getPlugin<CacheService>('app:cache');
    const db = ComponentManager.getPlugin<DbService>('app:db');
    
    if (!cache || !db) return;
    
    const tagsRepo = new TagsRepository(db, cache);
    await tagsRepo.list(1, 10);
    console.log('[cache] Tags cache warmed');
  } catch (err) {
    console.warn('[cache] Failed to warm tags cache:', err);
  }
}
```

- [ ] **Step 2: Call warmTagsCache after plugins load**

Update `getPlugins` to warm cache after initialization:

```typescript
export async function getPlugins(): Promise<PluginEntry[]> {
  const plugins: PluginEntry[] = [];
  await maybeApiDoc(plugins);
  await loadDbPlugin(plugins);
  await loadCachePlugin(plugins);
  await maybeMail(plugins);
  
  // Warm cache after all plugins loaded
  setTimeout(() => warmTagsCache(), 1000);
  
  return plugins;
}
```

- [ ] **Step 3: Run tests to verify no regressions**

Run: `pnpm --filter @rx-ted/platform-api test`
Expected: All 107 tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/platform-api/src/lib/plugins.ts
git commit -m "feat(platform-api): add cache warming on startup"
```

---

### Task 5: Update Cache Constants

**Files:**
- Modify: `apps/platform-api/src/constants/cache.ts:2`

- [ ] **Step 1: Add TAGS_LIST_TTL constant**

Add a dedicated TTL for tags list to allow longer caching:

```typescript
export const CACHE = {
  USER_SESSION_TTL: 300,
  USER_PERMS_TTL: 300,
  SEARCH_TTL: 60,
  NOTIFICATION_LIST_TTL: 60,
  NOTIFICATION_SUMMARY_TTL: 60,
  ANNOUNCEMENT_ACTIVE_TTL: 60,
  TAGS_LIST_TTL: 600,
} as const;
```

- [ ] **Step 2: Update tags repository to use new constant**

Update the import and usage in tags.repository.ts:

```typescript
import { CACHE } from '@/constants';

// In list method:
return cacheable(this.cache, cacheKey, CACHE.TAGS_LIST_TTL, async () => {
```

- [ ] **Step 3: Run tests to verify no regressions**

Run: `pnpm --filter @rx-ted/platform-api test`
Expected: All 107 tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/platform-api/src/constants/cache.ts apps/platform-api/src/modules/tags/repositories/tags.repository.ts
git commit -m "chore(platform-api): add dedicated TTL for tags cache"
```

---

### Task 6: Clean Up TODO Comments

**Files:**
- Modify: `apps/platform-api/src/modules/post/entities/post.entity.ts:120-122`
- Modify: `apps/platform-api/src/modules/post/entities/post.entity.ts:138-140`

- [ ] **Step 1: Remove resolved TODO comments**

Delete the TODO comments since indexes are now created in SystemInitService:

```typescript
// Remove lines 120-122:
// TODO: composite primary key on (post_id, tag_id)
// TODO: index ptm_post_id_idx on (post_id)
// TODO: index ptm_tag_id_idx on (tag_id)

// Remove lines 138-140:
// TODO: composite primary key on (post_id, category_id)
// TODO: index pcm_post_id_idx on (post_id)
// TODO: index pcm_category_id_idx on (category_id)
```

- [ ] **Step 2: Run tests to verify no regressions**

Run: `pnpm --filter @rx-ted/platform-api test`
Expected: All 107 tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/platform-api/src/modules/post/entities/post.entity.ts
git commit -m "chore(platform-api): remove resolved TODO comments for indexes"
```

---

### Task 7: Verify End-to-End Performance

**Files:**
- None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass across all packages

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 3: Run lint**

Run: `pnpm check`
Expected: No lint errors

- [ ] **Step 4: Manual verification (optional)**

If possible, deploy to staging and verify:
1. Cold start: First request should be < 500ms
2. Warm cache: Subsequent requests should be < 100ms
3. Pagination: Response includes `total` field and correct number of items

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(platform-api): address any remaining issues from performance optimization"
```

---

## Summary

This plan addresses the 3500ms+ API response times through:

1. **Index Creation** (Task 1): Adds missing indexes on `post_tag_mappings` and `post_category_mappings` tables - the primary cause of slow queries
2. **ResponseWrapper Optimization** (Task 2): Eliminates unnecessary clone/parse operations for already-wrapped responses
3. **Pagination** (Task 3): Implements server-side pagination to limit result set size
4. **Cache Warming** (Task 4): Pre-populates cache on startup to avoid cold start penalty
5. **Cache TTL** (Task 5): Extends tags cache TTL from 300s to 600s
6. **Code Cleanup** (Task 6): Removes resolved TODO comments

Expected improvement: Cold start < 500ms, warm requests < 100ms.
