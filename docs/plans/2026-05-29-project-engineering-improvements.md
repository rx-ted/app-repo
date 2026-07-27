# Project Engineering Improvements — Feasibility Analysis

> **Status: PARTIALLY IMPLEMENTED** — Biome、Changesets、Lefthook 已实施。部分建议未实施。

> **Status:** Planning / Feasibility Assessment
> **Date:** 2026-05-29
> **Scope:** `apps/platform-api` + `apps/web-blog`

**Goal:** Assess feasibility, effort, risks, and approach for each improvement item in the code review.

---

## Phase 1: 把核心链路做稳 (Core Pathway Stabilization)

### 1.1 前端测试 warning：移除 store 内生命周期 API

**Feasibility:** ✅ Easy

**Problem:** `apps/web-blog/src/stores/session.ts:71-83` wraps `onMounted/onUnmounted` in try/catch — works but produces Vue warning in tests.

**Approach:**
- Move `tokenStorage.subscribe` to app bootstrap (`main.ts` or `App.vue` root component)
- Store exposes `startTokenSync()` / `stopTokenSync()` methods
- Main app calls `sessionStore.startTokenSync()` in `onMounted` and `sessionStore.stopTokenSync()` in `onUnmounted`

**Effort:** ~30min (edit 1 file + main.ts)
**Risk:** None — purely mechanical refactor
**Test impact:** Reduces test noise; no behavior change

---

### 1.2 OpenAPI 类型生成

**Feasibility:** ⚠️ Medium-Hard

**Current state:**
- API uses custom HonestJS framework with `ApiDocPlugin` that generates OpenAPI 3.1 spec from Zod schemas
- Spec available at `/api/v1/openapi.json`
- Frontend has hand-written types and `@rx-ted/packages-http-client`
- No OpenAPI client generation tooling exists

**Approach options:**

| Option | Tool | Pros | Cons |
|--------|------|------|------|
| A | `openapi-typescript` | Mature, widely used, generates TS types only | Only types — still need to write client calls |
| B | `openapi-typescript-codegen` | Generates full client + types | Less actively maintained |
| C | `kubb` | Generates full client, TanStack Query hooks | Newer, less proven |
| D | `orval` | Generates full client + React hooks | React-focused, not Vue |
| E | Manual typed client wrapper | Already partially done with http-client | Still manual, prone to drift |

**Recommendation:** Option A (`openapi-typescript`) — minimal risk, generates only types, can feed into existing `http-client` wrapper.

**Effort:** 2-3 days
1. Add `openapi-typescript` to web-blog (30min)
2. Set up codegen script in CI to fetch spec from running API or from file (1h)
3. Map generated types to existing API calls — priority: auth, posts, search, blog, user (1-2d)
4. Add CI check for OpenAPI diff (1d)

**Dependencies:** API spec must be complete (no `z.any()` for covered routes)
**Risk:** Medium — generated types may differ from hand-written ones; needs careful migration

---

### 1.3 缓存失效策略

**Feasibility:** ✅ Medium

**Current state:**
- Redis-backed via `CacheService` (ioredis client)
- Cache keys are centralized in `apps/platform-api/src/constants/cache-keys.ts`
- Invalidation is ad-hoc: `post.repository.ts:207-208` only deletes `post:list:1:10` and `blog:home`
- `CacheDriver` interface lacks pattern-based deletion

**Approach:**
1. Add `scanDel(pattern: string)` to `CacheDriver` using Redis `SCAN` + `DEL` (or add `CacheService.deleteByPattern()`)
2. Create `CacheInvalidationService` with domain-specific methods: `invalidatePostLists()`, `invalidatePost(slug)`, etc.
3. Replace all ad-hoc `this.cache.delete(...)` calls in post repository

**Effort:** 1-2 days
1. Add `deleteByPattern` to cache driver (2h)
2. Create `CacheInvalidationService` (2h)
3. Refactor post repository to use it (2h)
4. Add tests for invalidation (2h)

**Risk:** Low — Redis SCAN is non-blocking, safe for production
**Note:** The review mentions creating article also invalidates `search:*`, `blog:author:*`, `dashboard` — these may not be necessary since search is Orama (not cached via Redis?). Need to verify.

---

### 1.4 生产环境错误信息脱敏

**Feasibility:** ✅ Easy

**Current state:** `api-error.filter.ts` already returns safe structured JSON — no stack traces leak to client. But the review flags `exception.message` in unhandled errors.

**Verification:** The filter already returns `{ status, code, message, data, requestId, timestamp }` for unhandled errors with `code: 'INTERNAL_SERVER_ERROR'`. The `message` comes from the exception, which could leak internals.

**Approach:**
- In production (`NODE_ENV === 'production'`), replace `exception.message` with `'Internal server error'` for non-ApiError exceptions
- Log the real error with full details server-side (already done for 5xx)

**Effort:** ~30min
**Risk:** None

---

### 1.5 删除临时文件 + .gitignore

**Feasibility:** ✅ Trivial

**Action:** Remove `.!87243!background.png` and `.!87269!wechat.jpg` from `apps/web-blog/src/assets/`

**Effort:** 5min
**Risk:** None

---

## Phase 2: 提升工程质量 (Engineering Quality)

### 2.1 Playwright E2E

**Feasibility:** ✅ Medium

**Approach:**
1. Add Playwright to repo root
2. Set up test app — need a way to start API + web-blog simultaneously (docker-compose or turbo)
3. Write E2E for: login, search, article detail, write article, dashboard

**Effort:** 3-5 days for initial setup + 5 scenarios
**Dependencies:** Needs local dev environment setup (DB, Redis, etc.)
**Risk:** Medium — flaky tests if not properly isolated; may need test fixtures/seeds

---

### 2.2 契约测试 (Contract Tests)

**Feasibility:** ⚠️ Hard

**Problem:** Without OpenAPI client generation in place (1.2), contract tests are hard to maintain. The spec itself has `z.any()` holes.

**Recommendation:** Defer until after 1.2 (OpenAPI type generation). Once types are generated, contract tests become `import { type } from './generated'` rather than manual type checking.

**Approach:**
- Use `@openapi-contrib/openapi-validation` or Pact (likely overkill)
- Simpler: generate TS types, then type-check API responses against them with zod at runtime

**Effort:** 2-3 days (after 1.2)
**Dependency:** Phase 1.2

---

### 2.3 后端核心 service 集成测试

**Feasibility:** ✅ Medium

**Current state:** Unit tests exist (80 tests), but no integration tests with real DB/Redis.

**Approach:**
1. Add `testcontainers` or use in-memory SQLite + `ioredis-mock`
2. Write integration tests for post CRUD, auth flow, search
3. Add test database config (separate from dev/prod)

**Effort:** 3-5 days
**Risk:** Medium — testcontainers need Docker; in-memory alternatives may differ from production

---

### 2.4 Coverage 阈值

**Feasibility:** ✅ Easy

**Approach:** Add to vitest config:
```ts
test: {
  coverage: {
    thresholds: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
  },
},
```

**Effort:** 30min
**Risk:** Low — may break CI if current coverage is below threshold. Need to measure first.

---

### 2.5 `z.any()` 替换为真实 DTO

**Feasibility:** ⚠️ Hard (scope)

**Current state:** Multiple controllers use `z.any()` in `apiDoc` response schemas (blog, announcement, notification, version, user).

**Approach:**
- Priority order: auth → posts → search → blog dashboard → author → user profile → rest
- Each schema needs a Zod DTO defined and tested

**Effort:** 3-5 days total (many controllers)
**Risk:** Low per-schema, but total scope is large

---

## Phase 3: 大厂级能力 (Enterprise Capabilities)

### 3.1 可观测性 (Observability)

**Feasibility:** ⚠️ Hard

**Components needed:**
- Request ID already exists (in filter response)
- Structured logging exists but `MailService` still uses `console.error`
- Metrics: QPS, error rate, latency, cache hit rate
- Tracing: HTTP request → DB → Redis → external services
- Alerting

**Approach:** Use OpenTelemetry SDK for Hono. Export to Jaeger or similar.

**Effort:** 1-2 weeks
**Risk:** Medium — adds infra dependencies; requires operation knowledge

---

### 3.2 安全运营 (Security)

**Feasibility:** ⚠️ Hard

**Items:**
- Production-enforced rate limiting (trivial fix: flip default)
- Email + IP + device fingerprint rate limiting (moderate)
- Security audit logging (moderate)
- Login anomaly detection (hard — requires ML or rules engine)

**Immediate quick win:** Change `RATE_LIMIT_ENABLED` default to `'true'` and add `NODE_ENV` check to allow disable in dev.

**Effort:** 1-3 days for quick wins; 1-2 weeks for full security suite

---

### 3.3 发布体系 (Release System)

**Feasibility:** ⚠️ Hard

**Items:**
- Multi-environment (dev/staging/prod)
- Database migration + rollback
- Feature flags
- Canary releases
- Runbook

**Current state:** Changesets + CI exist but only for package publishing. No deployment pipeline.

**Effort:** 1-3 weeks (infra-heavy)
**Risk:** High — requires DevOps capacity

---

### 3.4 性能体系 (Performance)

**Feasibility:** ✅ Medium

**Items:**
- Web Vitals measurement
- Bundle analysis (use `vite-bundle-visualizer`)
- Image optimization (use `sharp` or `<picture>` with `avif`)
- Resource budgets in CI

**Quick wins:**
- Add `vite-bundle-visualizer` to web-blog
- Set up Lighthouse CI
- Add lazy loading for images

**Effort:** 2-3 days for initial setup

---

### 3.5 后台治理 (Backend Governance)

**Feasibility:** ⚠️ Hard

**Items:**
- Admin UI for announcements, audits, permissions
- Version management UI
- Metrics dashboard

**Effort:** 1-2 weeks per feature
**Risk:** Medium — UI development for admin panel

---

## Recommended Implementation Order

```
Week 1-2 (Phase 1):
  ┌────────────────────────────────────────────┐
  │ 1.5 Delete temp files + .gitignore  (5min) │ ← Quick win
  │ 1.4 Error sanitization             (30min) │ ← Quick win
  │ 1.1 Store lifecycle fix            (30min) │ ← Quick win
  │ 3.2 Rate limit default flip        (15min) │ ← Quick win
  ├────────────────────────────────────────────┤
  │ 1.3 Cache invalidation             (1-2d)  │ ← Medium
  │ 1.2 OpenAPI type generation        (2-3d)  │ ← Enables 2.2
  └────────────────────────────────────────────┘

Week 3-4 (Phase 2):
  ┌────────────────────────────────────────────┐
  │ 2.5 Replace z.any() with DTOs      (3-5d)  │ ← Depends on 1.2
  │ 2.4 Coverage thresholds            (30min) │
  │ 2.3 Integration tests              (3-5d)  │
  │ 2.1 Playwright E2E                 (3-5d)  │
  └────────────────────────────────────────────┘

Week 5+ (Phase 3):
  ┌────────────────────────────────────────────┐
  │ 3.4 Performance system             (2-3d)  │
  │ 3.1 Observability                  (1-2w)  │
  │ 3.2 Security (full)               (1-2w)  │
  │ 3.3 Release system                (1-3w)  │
  │ 3.5 Backend governance            (1-2w)  │
  └────────────────────────────────────────────┘
```

## Summary

| Category | Count | Quick Wins (< 1h) | Medium (1-5d) | Hard (1-3w) |
|----------|-------|-------------------|---------------|-------------|
| Phase 1 | 5 | 3 | 2 | 0 |
| Phase 2 | 5 | 1 | 3 | 1 |
| Phase 3 | 5 | 0 | 1 | 4 |
| **Total** | **15** | **4** | **6** | **5** |

## Key Dependencies

- **OpenAPI type generation (1.2)** blocks contract tests (2.2) and DTO cleanup (2.5)
- **Cache invalidation (1.3)** needs `deleteByPattern` on the cache driver
- **E2E (2.1)** needs a reproducible local environment

## Risks

1. **Custom framework risk:** HonestJS is not NestJS — cannot use NestJS ecosystem tools (guards, interceptors, Swagger module). Any OpenAPI tooling must work with plain Hono/Zod.
2. **OpenAPI client generation:** Since spec wraps responses in `{ status, code, data }` envelope, generated types will need unwrapping logic.
3. **Redis pattern deletion:** `SCAN` is O(N) over keyspace; test for performance at scale.
