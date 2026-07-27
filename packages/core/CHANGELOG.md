# @rx-ted/packages-core

## 1.0.1

### Patch Changes

- 11bbae7: Remove defunct packages (web-admin, auth, http-client, search) and introduce barrel packages for consolidated exports. Migrate all internal imports from scoped plugin names (`@rx-ted/packages-honest-plugins-db`) to path-based barrel imports (`@rx-ted/packages-honest-plugins/db`). Reset all package versions to 1.0.0 with consolidated changelogs. Clean up obsolete documentation across the monorepo.

## 1.0.0

Initial consolidated release.

### Features

- Unified runtime context, environment config, and logging for multi-platform TypeScript (Node.js, Bun, Deno, Cloudflare Workers)
- `Env` class with `loadEnv()` for chained `.env` loading with DEBUG-based override
- `Env.setLogger(ILogger)` — injectable logger instance
- `Env.var(key, default)` — lazy env var with debug-logged fallback
- `Env.set(key, value)` — write to pre-boot env source
- `Env.mode` getter — checks `DEBUG` env var first (`true` → dev, `false` → prod)
- `Logger` with `destination` option for file output via `pino/file` transport
- Async `loadEnv` — searches `.env` up to 3 parent directories from CWD
- Guarded `node:fs` imports behind dynamic `import()` for Cloudflare Workers safety
- Shared `resolveBinding` utility for cache and db plugins
