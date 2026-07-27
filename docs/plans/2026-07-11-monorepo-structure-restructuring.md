# Monorepo Structure Restructuring Plan

> **Status: PARTIALLY IMPLEMENTED** — 死代码清理已部分完成，模块边界重构进行中。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `apps/web-blog`, `apps/platform-api`, and all consumed `packages/` to maintain clear logic boundaries, eliminate dead code, fix layer violations, and ensure each module has a single responsibility.

**Architecture:** Follow the monorepo principles in `.opencode/skill-refactoring-monorepo-structure/SKILL.md` — apps → packages dependency direction, clear module boundaries, no business logic in packages, no HTTP routes in packages. Use `git mv` for moves, incremental commits per semantic step.

**Tech Stack:** TypeScript 6.x, pnpm 11.5, Turborepo 2.9, Biome 2.4, Hono 4.12, Honest DI, Vue 3, Pinia 3, Drizzle ORM 0.45

---

## Phase 1: Dead Code & Cleanup (Foundation)

> Goal: Remove dead code, fix naming, delete unused files. Zero behavior change.

### Task 1.1: Remove dead code from apps/web-blog

**Files:**
- Delete: `apps/web-blog/src/config/posts.ts`
- Delete: `apps/web-blog/src/config/blogs.ts`
- Delete: `apps/web-blog/src/stores/ads.ts`
- Delete: `apps/web-blog/src/stores/calendar.ts`
- Delete: `apps/web-blog/src/http/jwt.ts`
- Delete: `apps/web-blog/src/http/interceptor.ts`
- Delete: `apps/web-blog/src/http/typed-client.ts`
- Delete: `apps/web-blog/src/http/layout.ts`
- Modify: `apps/web-blog/src/constants/errors.ts` (remove `ERRORS_EN`)
- Modify: `apps/web-blog/src/constants/nav.ts` (remove `menuOptions` Murakami data and unused `createNavOptions`)
- Verify: `grep -r "from.*config/posts\|from.*config/blogs\|from.*stores/ads\|from.*stores/calendar\|from.*http/jwt\|from.*http/interceptor\|from.*http/typed-client\|from.*http/layout\|ERRORS_EN\|menuOptions\|createNavOptions" apps/web-blog/src/`

- [ ] **Step 1: Verify imports are zero before deletion**

Run: `grep -r "config/posts\|config/blogs\|stores/ads\|stores/calendar\|http/jwt\|http/interceptor\|http/typed-client\|http/layout" apps/web-blog/src/ --include="*.ts" --include="*.vue" | grep -v ".spec.ts"`
Expected: No matches (confirming zero imports)

- [ ] **Step 2: Delete dead files**

```bash
rm apps/web-blog/src/config/posts.ts
rm apps/web-blog/src/config/blogs.ts
rm apps/web-blog/src/stores/ads.ts
rm apps/web-blog/src/stores/calendar.ts
rm apps/web-blog/src/http/jwt.ts
rm apps/web-blog/src/http/interceptor.ts
rm apps/web-blog/src/http/typed-client.ts
rm apps/web-blog/src/http/layout.ts
```

- [ ] **Step 3: Remove ERRORS_EN from errors.ts**

Remove the `ERRORS_EN` export from `apps/web-blog/src/constants/errors.ts`. Keep only `ERRORS` (Chinese). The i18n system (`i18n/messages.ts`) handles translations.

- [ ] **Step 4: Clean up nav.ts**

Remove `menuOptions` (the hardcoded Murakami novel references) and `createNavOptions` from `apps/web-blog/src/constants/nav.ts`. Keep only the `getNavOptions` function.

- [ ] **Step 5: Verify build**

Run: `pnpm typecheck` in apps/web-blog
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A apps/web-blog/
git commit -m "chore(web-blog): remove dead code and unused exports"
```

---

### Task 1.2: Remove dead code from apps/platform-api

**Files:**
- Delete: `apps/platform-api/src/auth/entities/sessions.entity.ts` (unused DB schema — sessions are cache-only)
- Modify: `apps/platform-api/src/modules/search/search.service.ts` (remove empty `invalidateCache()` no-op method)
- Modify: `apps/platform-api/src/modules/comment/comment.service.ts` (remove commented-out `md5()` regex dead code)

- [ ] **Step 1: Verify sessions.entity.ts is unused**

Run: `grep -r "sessions.entity\|SessionsSchema" apps/platform-api/src/ --include="*.ts" | grep -v "sessions.entity.ts"`
Expected: No matches

- [ ] **Step 2: Delete sessions.entity.ts**

```bash
rm apps/platform-api/src/modules/auth/entities/sessions.entity.ts
```

- [ ] **Step 3: Remove invalidateCache no-op**

In `apps/platform-api/src/modules/search/search.service.ts`, remove the `invalidateCache()` method that does nothing.

- [ ] **Step 4: Remove dead md5 code**

In `apps/platform-api/src/modules/comment/comment.service.ts`, remove any commented-out regex-based `md5` implementation.

- [ ] **Step 5: Verify build**

Run: `pnpm typecheck` in apps/platform-api
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A apps/platform-api/
git commit -m "chore(platform-api): remove dead code and no-op methods"
```

---

### Task 1.3: Delete dead packages/mail

**Files:**
- Delete: `packages/mail/` entire directory
- Modify: `pnpm-workspace.yaml` (remove `packages/mail`)
- Verify: `grep -r "@rx-ted/packages-mail" apps/ packages/`

- [ ] **Step 1: Verify no consumers**

Run: `grep -r "@rx-ted/packages-mail" apps/ packages/ --include="*.ts" --include="*.json" --include="*.vue"`
Expected: No matches

- [ ] **Step 2: Delete the package**

```bash
rm -rf packages/mail/
```

- [ ] **Step 3: Remove from workspace**

Remove `- "packages/mail"` from `pnpm-workspace.yaml`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete dead packages/mail (5-line stub, no consumers)"
```

---

### Task 1.4: Fix naming inconsistencies in web-blog

**Files:**
- Rename: `apps/web-blog/src/stores/blog.ts` → rename the export `useBlog` to `useBlogStore` for consistency
- Rename: `apps/web-blog/src/components/editors/Components/` → `apps/web-blog/src/components/editors/components/` (lowercase)

- [ ] **Step 1: Rename useBlog → useBlogStore**

In `apps/web-blog/src/stores/blog.ts`, rename the exported `useBlog` function to `useBlogStore`. Update all import sites.

Run: `grep -r "useBlog[^S]" apps/web-blog/src/ --include="*.ts" --include="*.vue" | grep -v "blogStore\|blog.spec"`
Expected: list of files importing `useBlog` — update all to `useBlogStore`

- [ ] **Step 2: Fix editors/Components capitalization**

```bash
git mv apps/web-blog/src/components/editors/Components apps/web-blog/src/components/editors/components
```

Update the import in `apps/web-blog/src/components/editors/BlogEditor.vue` to use lowercase `./components/defToolbars`.

- [ ] **Step 3: Verify build**

Run: `pnpm typecheck` in apps/web-blog
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A apps/web-blog/
git commit -m "chore(web-blog): fix naming inconsistencies (useBlog→useBlogStore, capitalize)"
```

---

## Phase 2: Package Layer Cleanup

> Goal: Fix package exports, clean honest dependencies, resolve cross-package issues.

### Task 2.1: Extract S3 plugin from honest into its own package

**Files:**
- Create: `packages/honest-plugins/s3/` (new package)
- Move: `packages/honest/src/plugins/s3/*` → `packages/honest-plugins/s3/src/`
- Modify: `packages/honest/package.json` (remove @aws-sdk deps)
- Modify: `packages/honest/src/plugins/index.ts` (remove S3 export)
- Modify: `packages/honest/src/index.ts` (remove S3 re-exports if any)
- Modify: `pnpm-workspace.yaml` (add new package)

- [ ] **Step 1: Create package directory**

```bash
mkdir -p packages/honest-plugins/s3/src
```

- [ ] **Step 2: Move S3 files**

```bash
git mv packages/honest/src/plugins/s3/index.ts packages/honest-plugins/s3/src/index.ts
git mv packages/honest/src/plugins/s3/s3.plugin.ts packages/honest-plugins/s3/src/s3.plugin.ts
git mv packages/honest/src/plugins/s3/s3.driver.ts packages/honest-plugins/s3/src/s3.driver.ts
git mv packages/honest/src/plugins/s3/s3-service.ts packages/honest-plugins/s3/src/s3-service.ts
git mv packages/honest/src/plugins/s3/types.ts packages/honest-plugins/s3/src/types.ts
```

- [ ] **Step 3: Create package.json**

```json
{
  "name": "@rx-ted/packages-honest-plugins-s3",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    "types": "./dist/index.d.ts",
    "default": "./dist/index.js"
  },
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.1045.0",
    "@aws-sdk/s3-request-presigner": "^3.1045.0"
  },
  "peerDependencies": {
    "@rx-ted/packages-honest": "workspace:^"
  }
}
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "extends": "../../config/ts/tsconfig.node.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 5: Update imports in honest**

In `packages/honest/src/plugins/index.ts`, remove the S3 export. In `packages/honest/src/index.ts`, remove any S3 re-exports. Remove `@aws-sdk/*` from `packages/honest/package.json` dependencies.

- [ ] **Step 6: Update platform-api imports**

In `apps/platform-api/src/lib/plugins.ts`, if S3 is imported from honest, update to import from `@rx-ted/packages-honest-plugins-s3`.

- [ ] **Step 7: Add to pnpm-workspace.yaml**

Add `- "packages/honest-plugins/s3"` to the workspace packages list.

- [ ] **Step 8: Verify**

Run: `pnpm typecheck` across the monorepo
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(honest): extract S3 plugin to @rx-ted/packages-honest-plugins-s3"
```

---

### Task 2.2: Clean honest's dependency bloat

**Files:**
- Modify: `packages/honest/package.json`

- [ ] **Step 1: Review current deps**

Current non-peer deps in honest: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `drizzle-orm`, `mysql2`, `redis`, `nodemailer`, `resend`, `reflect-metadata`

After Task 2.1 removes @aws-sdk, remove these as well:
- `drizzle-orm` → used by honest-plugins/db, not by honest itself
- `mysql2` → used by honest-plugins/db
- `redis` → used by honest-plugins/cache
- `nodemailer` → used by honest-plugins/mail
- `resend` → used by honest-plugins/mail

Keep only: `reflect-metadata` (used by decorators)

- [ ] **Step 2: Update package.json**

Remove `drizzle-orm`, `mysql2`, `redis`, `nodemailer`, `resend` from `packages/honest/package.json` dependencies.

- [ ] **Step 3: Verify honest-plugins still work**

Run: `pnpm typecheck` for each honest-plugin
Expected: PASS (they already have these as their own dependencies)

- [ ] **Step 4: Commit**

```bash
git add packages/honest/package.json
git commit -m "refactor(honest): remove transitive dependencies (drizzle, mysql2, redis, mail)"
```

---

### Task 2.3: Standardize package exports

**Files:**
- Modify: `packages/core/package.json`
- Modify: `packages/honest-plugins/mail/package.json`
- Modify: `packages/honest-plugins/api-doc/package.json`

- [ ] **Step 1: Fix core exports**

In `packages/core/package.json`, change exports to use `dist/` consistently:
```json
"exports": {
  "types": "./dist/index.d.ts",
  "default": "./dist/index.js"
}
```

- [ ] **Step 2: Fix mail-plugin exports**

In `packages/honest-plugins/mail/package.json`, change exports from `src/` to `dist/`:
```json
"exports": {
  "types": "./dist/index.d.ts",
  "default": "./dist/index.js"
}
```

- [ ] **Step 3: Fix api-doc exports**

Same fix as mail-plugin for `packages/honest-plugins/api-doc/package.json`.

- [ ] **Step 4: Verify**

Run: `pnpm typecheck` across the monorepo
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/package.json packages/honest-plugins/mail/package.json packages/honest-plugins/api-doc/package.json
git commit -m "chore(packages): standardize exports to use dist/ for all packages"
```

---

### Task 2.4: Extract resolveBinding to core

**Files:**
- Modify: `packages/core/src/index.ts` (add shared resolveBinding)
- Modify: `packages/honest-plugins/cache/src/resolve.ts` (use core's version)
- Modify: `packages/honest-plugins/cache/src/cloudflare/plugin.ts` (use core's version)
- Modify: `packages/honest-plugins/db/src/d1/plugin.ts` (use core's version)

- [ ] **Step 1: Add resolveBinding to core**

Add a `resolveBinding(name: string)` utility to `packages/core/src/utils/shared.ts` that implements the `globalThis → env → Platform.env()` lookup pattern once.

- [ ] **Step 2: Update cache plugin**

In `packages/honest-plugins/cache/src/resolve.ts`, replace the local `resolveBinding` with an import from `@rx-ted/packages-core`.

- [ ] **Step 3: Update cache cloudflare plugin**

In `packages/honest-plugins/cache/src/cloudflare/plugin.ts`, replace the local binding resolution with the core utility.

- [ ] **Step 4: Update db d1 plugin**

In `packages/honest-plugins/db/src/d1/plugin.ts`, replace the local `findD1Binding` with the core utility.

- [ ] **Step 5: Verify**

Run: `pnpm test` for each affected package
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A packages/core/ packages/honest-plugins/
git commit -m "refactor(core): extract shared resolveBinding utility, deduplicate across plugins"
```

---

### Task 2.5: Fix mail plugin cache key mismatch

**Files:**
- Modify: `packages/honest-plugins/mail/src/plugin.ts`

- [ ] **Step 1: Fix the cache key**

In `packages/honest-plugins/mail/src/plugin.ts`, the `getCacheDriver()` method looks up `'cache'` but the cache plugin registers under `CACHE_GLOBAL_KEY = 'app:cache'`. Fix the lookup key.

- [ ] **Step 2: Test**

Run: `pnpm test` in packages/honest-plugins/mail
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/honest-plugins/mail/src/plugin.ts
git commit -m "fix(honest-plugins-mail): fix cache driver lookup key mismatch"
```

---

## Phase 3: Backend (platform-api) Module Restructuring

> Goal: Split god services, fix layer violations, standardize module structure.

### Task 3.1: Split auth.service.ts into focused services

**Files:**
- Create: `apps/platform-api/src/modules/auth/services/password-auth.service.ts`
- Create: `apps/platform-api/src/modules/auth/services/email-auth.service.ts`
- Create: `apps/platform-api/src/modules/auth/services/oauth.service.ts`
- Create: `apps/platform-api/src/modules/auth/services/session-manager.service.ts`
- Modify: `apps/platform-api/src/modules/auth/auth.service.ts` (becomes a facade or is deleted)
- Modify: `apps/platform-api/src/modules/auth/auth.module.ts` (register new services)

**Current state:** `auth.service.ts` is 646 lines handling: password login, password register, email code login, email code register, password reset, OAuth exchange (GitHub), session creation, refresh token rotation, logout, audit logging.

- [ ] **Step 1: Create PasswordAuthService**

Extract from `auth.service.ts`:
- `login(username, password)` → password-based login
- `register(username, password, ...)` → password-based registration
- Keep the same DI pattern with `@Service()` decorator

- [ ] **Step 2: Create EmailAuthService**

Extract from `auth.service.ts`:
- `sendEmailCode(email, type)` → send verification code
- `loginByEmail(email, code)` → email code login
- `registerByEmail(email, code, ...)` → email code registration
- `resetPassword(email, code, newPassword)` → password reset

- [ ] **Step 3: Create OAuthService**

Extract from `auth.service.ts` and `auth-oauth.controller.ts`:
- `exchangeGitHubCode(code)` → GitHub OAuth exchange
- `bindGitHub(userId, code)` → bind GitHub account
- Consolidate duplicate registration logic

- [ ] **Step 4: Create SessionManagerService**

Extract from `auth.service.ts`:
- `createSession(userId, ...)` → session creation with device tracking
- `rotateRefreshToken(sessionId)` → refresh token rotation
- `logout(sessionId)` → session destruction

- [ ] **Step 5: Update auth.module.ts**

Register the new services. Remove the old `AuthService` or make it a thin facade that delegates.

- [ ] **Step 6: Update controllers**

Update `auth.controller.ts`, `auth-email.controller.ts`, `auth-oauth.controller.ts` to inject the new specific services instead of the monolithic `AuthService`.

- [ ] **Step 7: Verify**

Run: `pnpm test` in apps/platform-api
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add -A apps/platform-api/src/modules/auth/
git commit -m "refactor(platform-api/auth): split AuthService into PasswordAuth, EmailAuth, OAuth, SessionManager"
```

---

### Task 3.2: Split blog.service.ts (God Service)

**Files:**
- Create: `apps/platform-api/src/modules/blog/services/dashboard.service.ts`
- Create: `apps/platform-api/src/modules/blog/services/author.service.ts`
- Modify: `apps/platform-api/src/modules/blog/blog.service.ts` (home summary + search only)
- Modify: `apps/platform-api/src/modules/blog/blog.module.ts`

**Current state:** `blog.service.ts` is 503 lines querying almost every table: home page summary, full-text search, dashboard aggregation (150+ lines), author page data.

- [ ] **Step 1: Create DashboardService**

Extract `getDashboard()` (lines 274-427) into a new `DashboardService` that:
- Queries user profile, roles, permissions
- Aggregates post stats, drafts, notifications
- Delegates to existing `PostRepository` for post queries

- [ ] **Step 2: Create AuthorService**

Extract `getAuthor()` and `getAuthors()` into a new `AuthorService` that:
- Queries user profiles
- Aggregates per-author post stats
- Delegates to existing repositories

- [ ] **Step 3: Slim down BlogService**

Keep only `getHomeSummary()` and `search()` in `BlogService`. Remove inline `mapPostRow()` and `enrichPostsWithTaxonomy()` — move to `blog.mapper.ts`.

- [ ] **Step 4: Update blog.module.ts**

Register `DashboardService` and `AuthorService`.

- [ ] **Step 5: Update blog.controller.ts**

Inject the new specific services.

- [ ] **Step 6: Verify**

Run: `pnpm test` in apps/platform-api
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add -A apps/platform-api/src/modules/blog/
git commit -m "refactor(platform-api/blog): extract DashboardService and AuthorService from BlogService"
```

---

### Task 3.3: Move CacheInvalidationService to post module

**Files:**
- Move: `apps/platform-api/src/common/services/cache-invalidation.service.ts` → `apps/platform-api/src/modules/post/services/cache-invalidation.service.ts`
- Modify: `apps/platform-api/src/modules/post/post.module.ts`
- Modify: `apps/platform-api/src/modules/post/repositories/post.repository.ts`
- Modify: `apps/platform-api/src/app.module.ts` (remove from common imports)

- [ ] **Step 1: Move the file**

```bash
mkdir -p apps/platform-api/src/modules/post/services/
git mv apps/platform-api/src/common/services/cache-invalidation.service.ts apps/platform-api/src/modules/post/services/cache-invalidation.service.ts
```

- [ ] **Step 2: Update imports**

Update `post.repository.ts` and `post.module.ts` to import from the new location.

- [ ] **Step 3: Remove from app.module.ts**

Remove `CacheInvalidationService` from `app.module.ts` imports if it was registered there.

- [ ] **Step 4: Verify**

Run: `pnpm typecheck` in apps/platform-api
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A apps/platform-api/
git commit -m "refactor(platform-api): move CacheInvalidationService from common/ to post module"
```

---

### Task 3.4: Fix auth.guard.ts dependency on auth module

**Files:**
- Modify: `apps/platform-api/src/common/guards/auth.guard.ts`
- Modify: `apps/platform-api/src/modules/auth/auth.module.ts`

**Problem:** `auth.guard.ts` in `common/` directly imports `AuthRepository` and `SessionRepository` from `modules/auth/`, creating a circular dependency direction (common → modules).

- [ ] **Step 1: Create an auth context token**

Create an interface in `common/` that abstracts what the guard needs:
```typescript
// common/guards/auth-context.interface.ts
export interface IAuthContextService {
  validateSession(token: string): Promise<{ userId: string; roles: string[]; permissions: string[] } | null>;
}
```

- [ ] **Step 2: Implement the interface in auth module**

Have the auth module provide a service that implements `IAuthContextService`, delegating to `AuthRepository` and `SessionRepository`.

- [ ] **Step 3: Update auth.guard.ts**

Replace direct imports of auth repositories with injection of `IAuthContextService` via `@Inject()`.

- [ ] **Step 4: Verify**

Run: `pnpm test` in apps/platform-api
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A apps/platform-api/src/common/ apps/platform-api/src/modules/auth/
git commit -m "refactor(platform-api): decouple auth.guard.ts from auth module via IAuthContextService"
```

---

### Task 3.5: Split user.controller.ts

**Files:**
- Create: `apps/platform-api/src/modules/user/admin-user.controller.ts`
- Modify: `apps/platform-api/src/modules/user/user.controller.ts` (keep only public/user endpoints)
- Modify: `apps/platform-api/src/modules/user/user.module.ts`

- [ ] **Step 1: Extract AdminUserController**

Move the admin-specific endpoints from `user.controller.ts` into a new `admin-user.controller.ts`. The current file exports both `UserController` and `AdminUserController` in one file.

- [ ] **Step 2: Update user.module.ts**

Register the new `AdminUserController` separately.

- [ ] **Step 3: Verify**

Run: `pnpm test` in apps/platform-api
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A apps/platform-api/src/modules/user/
git commit -m "refactor(platform-api/user): split UserController and AdminUserController into separate files"
```

---

### Task 3.6: Extract shared pagination utility

**Files:**
- Create: `apps/platform-api/src/common/utils/pagination.ts`
- Modify: Multiple module services to use the shared utility

**Problem:** Every module reimplements pagination (page/offset calculation, total counting).

- [ ] **Step 1: Create pagination utility**

```typescript
// common/utils/pagination.ts
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function computeOffset(params: PaginationParams): number {
  return (params.page - 1) * params.pageSize;
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  return {
    items,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  };
}
```

- [ ] **Step 2: Update modules**

Update at least the 5 largest modules (post, comment, blog, user, notification) to use the shared utility.

- [ ] **Step 3: Verify**

Run: `pnpm test` in apps/platform-api
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A apps/platform-api/src/
git commit -m "refactor(platform-api): extract shared pagination utility, deduplicate across modules"
```

---

## Phase 4: Frontend (web-blog) Restructuring

> Goal: Split god stores, organize i18n, extract shared composables, fix patterns.

### Task 4.1: Split session.ts store (God Store)

**Files:**
- Create: `apps/web-blog/src/stores/auth.ts` (login, register, email auth, refresh)
- Create: `apps/web-blog/src/stores/profile.ts` (fetch/save profile)
- Create: `apps/web-blog/src/stores/user-sessions.ts` (session management)
- Modify: `apps/web-blog/src/stores/session.ts` (becomes a thin facade or deleted)
- Modify: All files that import from session store

**Current state:** `session.ts` is 417 lines handling: auth bootstrap, login (password + email), register (password + email), password reset, profile fetch, sessions management (list/revoke), dashboard data sync, heartbeat lifecycle, token subscription.

- [ ] **Step 1: Create auth store**

Extract: `login()`, `register()`, `loginByEmail()`, `registerByEmail()`, `forgotPassword()`, `bootstrap()`, `logout()`, token refresh subscription.

- [ ] **Step 2: Create profile store**

Extract: `fetchProfile()`, `updateProfile()`, profile-related reactive state.

- [ ] **Step 3: Create user-sessions store**

Extract: `fetchSessions()`, `revokeSession()`, `revokeAllSessions()`.

- [ ] **Step 4: Update session.ts**

Either delete `session.ts` and update all imports, or make it a thin re-export facade for backward compatibility.

- [ ] **Step 5: Update all consumers**

Run: `grep -r "from.*stores/session" apps/web-blog/src/ --include="*.ts" --include="*.vue"` and update each import.

- [ ] **Step 6: Verify**

Run: `pnpm typecheck` in apps/web-blog
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add -A apps/web-blog/src/stores/
git commit -m "refactor(web-blog): split session store into auth, profile, and user-sessions stores"
```

---

### Task 4.2: Split i18n/messages.ts

**Files:**
- Create: `apps/web-blog/src/i18n/messages/auth.ts`
- Create: `apps/web-blog/src/i18n/messages/blog.ts`
- Create: `apps/web-blog/src/i18n/messages/common.ts`
- Create: `apps/web-blog/src/i18n/messages/dashboard.ts`
- Create: `apps/web-blog/src/i18n/messages/search.ts`
- Modify: `apps/web-blog/src/i18n/messages.ts` (merge all sub-modules)

**Current state:** `messages.ts` is 777 lines — a single monolithic translation dictionary.

- [ ] **Step 1: Create domain-specific message files**

Split translations by domain:
- `auth.ts` — login, register, password reset messages
- `blog.ts` — post, tag, category, archive messages
- `common.ts` — shared UI messages (loading, error, confirm, etc.)
- `dashboard.ts` — dashboard-specific messages
- `search.ts` — search-related messages

- [ ] **Step 2: Update messages.ts to import and merge**

```typescript
import auth from './messages/auth'
import blog from './messages/blog'
// ...
export default { ...common, ...auth, ...blog, ...dashboard, ...search }
```

- [ ] **Step 3: Verify**

Run: `pnpm test` in apps/web-blog (i18n tests)
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A apps/web-blog/src/i18n/
git commit -m "refactor(web-blog): split i18n/messages.ts into domain-specific modules"
```

---

### Task 4.3: Create useAsyncState composable

**Files:**
- Create: `apps/web-blog/src/composables/useAsyncState.ts`
- Modify: Multiple stores/composables to use it

**Problem:** Every store and composable independently defines `loading = ref(false)` and `error = ref<string | null>(null)` with identical try/catch/finally blocks.

- [ ] **Step 1: Create useAsyncState**

```typescript
// composables/useAsyncState.ts
import { ref } from 'vue'

export function useAsyncState<T, A extends unknown[]>(
  fn: (...args: A) => Promise<T>,
  defaultValue: T
) {
  const data = ref<T>(defaultValue) as Ref<T>
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function execute(...args: A): Promise<T | null> {
    loading.value = true
    error.value = null
    try {
      const result = await fn(...args)
      data.value = result
      return result
    } catch (e: any) {
      error.value = e.message || 'Unknown error'
      return null
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, execute }
}
```

- [ ] **Step 2: Refactor one store as proof-of-concept**

Refactor `stores/postDetail.ts` to use `useAsyncState`. Run tests.

- [ ] **Step 3: Verify**

Run: `pnpm test` in apps/web-blog
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A apps/web-blog/src/composables/useAsyncState.ts apps/web-blog/src/stores/postDetail.ts
git commit -m "feat(web-blog): add useAsyncState composable, refactor postDetail store"
```

---

### Task 4.4: Fix utils/taxonomy.ts and utils/search.ts layer violations

**Files:**
- Move: API call functions from `utils/taxonomy.ts` → `stores/blog.ts` or a new `api/` layer
- Move: `searchPosts()` from `utils/search.ts` → a search store or composable

**Problem:** `utils/taxonomy.ts` contains `fetchTags()` and `fetchCategories()` — these are API data access functions, not pure utilities. `utils/search.ts` contains `searchPosts()` API call.

- [ ] **Step 1: Create api layer**

Create `apps/web-blog/src/api/taxonomy.ts` with `fetchTags()` and `fetchCategories()`.
Create `apps/web-blog/src/api/search.ts` with `searchPosts()`.

- [ ] **Step 2: Update imports**

Move the API calls from utils to the new api layer. Keep pure utility functions (like `mapToSelectOptions`) in utils.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck` in apps/web-blog
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A apps/web-blog/src/
git commit -m "refactor(web-blog): extract API calls from utils to api/ layer"
```

---

### Task 4.5: Consolidate storage access

**Files:**
- Modify: `apps/web-blog/src/composables/useStorage.ts`
- Modify: `apps/web-blog/src/utils/storage.ts`

**Problem:** Three layers exist: `utils/storage.ts` (raw functions), `composables/useStorage.ts` (composable wrapper), and direct `getLocal`/`setLocal` imports. Files inconsistently use different layers.

- [ ] **Step 1: Audit usage**

Run: `grep -r "from.*utils/storage\|from.*composables/useStorage" apps/web-blog/src/ --include="*.ts" --include="*.vue"`

- [ ] **Step 2: Standardize on composable pattern**

Make `composables/useStorage.ts` the canonical API. Update direct `utils/storage` imports to use the composable where appropriate, or keep `utils/storage` as the low-level implementation and make `useStorage.ts` a thin wrapper.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck` in apps/web-blog
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A apps/web-blog/src/
git commit -m "refactor(web-blog): consolidate storage access patterns"
```

---

## Phase 5: Documentation & Verification

> Goal: Update all documentation to reflect the new structure, run full verification.

### Task 5.1: Update documentation

**Files:**
- Modify: `docs/guides/packages.md`
- Modify: `docs/guides/platform-api.md`
- Modify: `docs/guides/web-blog.md`
- Modify: `docs/guides/概览.md`

- [ ] **Step 1: Update packages.md**

Update the packages list to reflect:
- Removed `packages/mail`
- New `packages/honest-plugins/s3`
- Updated dependency graph

- [ ] **Step 2: Update platform-api.md**

Update module list to reflect:
- Split auth services
- Split blog services
- Moved CacheInvalidationService
- New pagination utility

- [ ] **Step 3: Update web-blog.md**

Update to reflect:
- Split session store → auth, profile, user-sessions
- New i18n structure
- New useAsyncState composable
- New api/ layer

- [ ] **Step 4: Update 概览.md**

Update the overall project structure and dependency graph.

- [ ] **Step 5: Commit**

```bash
git add docs/
git commit -m "docs: update guides to reflect monorepo restructuring"
```

---

### Task 5.2: Full verification

- [ ] **Step 1: Install dependencies**

```bash
pnpm install
```

- [ ] **Step 2: Run format + lint**

```bash
pnpm check
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

- [ ] **Step 5: Run build**

```bash
pnpm build
```

- [ ] **Step 6: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address typecheck/test issues from restructuring"
```

---

## Execution Summary

| Phase | Tasks | Est. Time | Risk |
|-------|-------|-----------|------|
| 1: Dead Code Cleanup | 4 tasks | 30 min | Low |
| 2: Package Layer | 5 tasks | 1.5 hr | Medium |
| 3: Backend Modules | 6 tasks | 3 hr | High |
| 4: Frontend Restructure | 5 tasks | 2.5 hr | High |
| 5: Docs & Verify | 2 tasks | 30 min | Low |
| **Total** | **22 tasks** | **~8 hr** | |

## Dependency Order

```
Phase 1 (all tasks parallelizable)
    ↓
Phase 2 (Task 2.1 → 2.2 → 2.3, 2.4 and 2.5 parallelizable)
    ↓
Phase 3 (Tasks 3.1-3.6 parallelizable)
    ↓
Phase 4 (Tasks 4.1-4.5 parallelizable)
    ↓
Phase 5 (sequential)
```
