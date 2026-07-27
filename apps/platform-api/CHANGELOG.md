# @rx-ted/platform-api

## 1.0.2

### Patch Changes

- 6f2fb99: Rename friend-link module to discover with category/status support, add post category/tag mapping, rewrite about page with i18n
- 6f2fb99: Add docs import/seed pipeline, stats buffer with time-based flush, and upload module
- 6f2fb99: Fix vitest config with cloudflare:workers mock and workspace vitest condition for counter subpath, auto-format and openapi snapshot update
- Updated dependencies [6f2fb99]
  - @rx-ted/packages-honest-plugins@1.0.2

## 1.0.2

### Patch Changes

- 36a2a22: Defensive alarm API in CounterDO — added getAlarmTime/setAlarmTime with fallback chain for missing methods; fixed import-docs prefix from `/post` to `/posts`
- 0394ba2: Add missing `readingTime` column to PostCoreSchema, add `ensureSchema()` migration for D1 ALTER TABLE, improve seed error logging with env.DEBUG control for detail level
- 7896f95: Replace scattered `throw new Error` with typed `ApiError` across comment, comment-report, and upload services; add `toApiError()` and `internal()` helpers; controller auth checks now use `forbidden()`

## 1.0.1

### Patch Changes

- 11bbae7: Remove defunct packages (web-admin, auth, http-client, search) and introduce barrel packages for consolidated exports. Migrate all internal imports from scoped plugin names (`@rx-ted/packages-honest-plugins-db`) to path-based barrel imports (`@rx-ted/packages-honest-plugins/db`). Reset all package versions to 1.0.0 with consolidated changelogs. Clean up obsolete documentation across the monorepo.
- Updated dependencies [11bbae7]
  - @rx-ted/packages-honest-plugins@1.0.1
  - @rx-ted/packages-core@1.0.1
  - @rx-ted/packages-honest@1.0.1

## 1.0.0

### Major Changes

- Hono-based API server — REST endpoints for users, posts, comments, categories, tags, friend-links, albums, versions
- Plugin system (honest) — DI container with @Injectable() + @Inject() decorators for cross-platform (CF Workers + Bun + Node)
- Plugin engine — bootstrap/destroy lifecycle, env-var-driven plugin config (DB/CACHE/MAILS)
- Database plugins — D1 (Cloudflare), SQLite (better-sqlite3), MySQL (drizzle-orm)
- Cache plugins — D1 KV, local in-memory Map with TTL, Redis
- Mail plugin — Resend/SMTP/Brevo with health checks via ctx.waitUntil
- API documentation — OpenAPI spec generation (honest-plugins-api-doc)
- Auth — password hashing (Web Crypto PBKDF2), JWT tokens, Redis sessions, registration with user_profiles
- CORS middleware — cross-origin requests from frontend domains
- Zod-centric entity schema — D1-compatible, compileSchema for schema generation
- CI/CD — deploy workflow with OpenAPI export, version changelog detection, cloudflare-worker deployment

### Patch Changes

- Cross-runtime crypto — replaced node:crypto with Web Crypto + @noble/hashes for CF Workers compatibility
- SQLite local dev — DB_PATH env var, better-sqlite3 WAL mode, D1 JSON column fixes
- Dev server — Vite dev server, graceful shutdown (SIGTERM/SIGINT)
- HTTP client — axios interceptors (token injection, error normalization, retry)
- Mail health checks — runHealthChecks via ctx.waitUntil in CF runtime
- E2E test mocks — honest decorator mocks (UseMiddleware, Ip, UA), tags DELETE with user context
- DB scripts — simplified adapters, fix DEBUG=false not reaching drizzle-kit
