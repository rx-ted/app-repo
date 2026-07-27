# Extract DB Plugin to `@rx-ted/packages-honest-plugin-db`

> **Status: IMPLEMENTED** — DB Plugin 已提取到独立包。

## Goal

Extract the built-in db plugin from `packages/honest/src/plugins/db/` into a
separate package `@rx-ted/packages-honest-plugin-db`. The extraction is
backward-compatible: `@rx-ted/packages-honest` re-exports everything from the
new package so consumers continue importing from `@rx-ted/packages-honest` with
zero changes.

## Motivation

The db plugin is the first of several plugins (redis, mail, s3, api-doc) to be
extracted into their own packages under the `@rx-ted/packages-honest-plugin-*`
namespace. Decoupling plugins from the core framework enables:

- Independent versioning and release cycles
- Reduced core package size for consumers that don't use certain plugins
- Clearer dependency boundaries

## Package Anatomy

| Property | Value |
|---|---|
| Directory | `packages/honest-plugin-db/` |
| Package name | `@rx-ted/packages-honest-plugin-db` |
| TypeScript root | `packages/honest-plugin-db/src/` |
| Build output | `packages/honest-plugin-db/dist/` |

## Files to Migrate

All 14 files from `packages/honest/src/plugins/db/` are moved verbatim (with
import path adjustments) to `packages/honest-plugin-db/src/`:

```
packages/honest-plugin-db/src/
  constants.ts
  types.ts
  db-service.ts
  repository.ts
  index.ts
  mysql/
    client.ts
    driver.ts
    index.ts
    plugin.ts
    types.ts
  postgres/index.ts
  sqlite/index.ts
  d1/index.ts
```

## Import Path Adjustments

Files that currently reference `@rx-ted/packages-honest` internals via relative
paths need to be updated to import from `@rx-ted/packages-honest`:

| File | Old relative import | New package import |
|---|---|---|
| `db-service.ts` | `../../decorators` | `@rx-ted/packages-honest` |
| `db-service.ts` | `../../managers` | `@rx-ted/packages-honest` |
| `mysql/plugin.ts` | `../../../application` | `@rx-ted/packages-honest` |
| `mysql/plugin.ts` | `../../../interfaces` | `@rx-ted/packages-honest` |
| `mysql/plugin.ts` | `../../../managers` | `@rx-ted/packages-honest` |

Files that only reference sibling files within the plugin (`../types`,
`./client`, etc.), external packages (`drizzle-orm`, `mysql2`), or
workspace packages (`@rx-ted/packages-logger`) need no adjustment.

## Package Dependencies

### `@rx-ted/packages-honest-plugin-db/package.json`

```json
{
  "name": "@rx-ted/packages-honest-plugin-db",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json"
  },
  "dependencies": {
    "drizzle-orm": "^0.45.2",
    "mysql2": "^3.22.4",
    "@rx-ted/packages-logger": "workspace:^"
  },
  "peerDependencies": {
    "@rx-ted/packages-honest": "workspace:^",
    "hono": "^4.12.18"
  }
}
```

### `@rx-ted/packages-honest` additions

```json
{
  "dependencies": {
    "@rx-ted/packages-honest-plugin-db": "workspace:^"
  }
}
```

## TypeScript Configuration

`packages/honest-plugin-db/tsconfig.json` mirrors the honest core:

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
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src"],
  "exclude": ["**/*.test.ts"]
}
```

## Changes to Honest Core

### `packages/honest/src/plugins/index.ts`

Before:
```ts
export * from './db';
```

After:
```ts
export * from '@rx-ted/packages-honest-plugin-db';
```

### `packages/honest/src/plugins/db/` — DELETE

After the re-export is in place, the entire `db/` directory and its contents are
removed from the honest package.

## Workspace Registration

Add `"packages/honest-plugin-db"` to `pnpm-workspace.yaml`.

## Consumer Impact

**Zero.** All 38+ files in `apps/platform-api` that import from
`@rx-ted/packages-honest` continue to work identically. The `DbService`,
`BaseRepository`, `mysqlTable`, etc. are all re-exported through the same
barrel path.

## Verification

After extraction:

1. `pnpm install` — workspace linking succeeds
2. `cd packages/honest-plugin-db && npx tsc --noEmit` — typecheck passes
3. `cd packages/honest && npx tsc --noEmit` — typecheck passes (no more `./db` files)
4. `cd apps/platform-api && npx tsc --noEmit` — typecheck passes (zero errors)
5. `pnpm --filter @rx-ted/packages-honest test` — all 193 tests pass
6. `pnpm --filter @rx-ted/packages-honest-plugin-db test` — no tests for now (db plugin has no tests)
7. `pnpm --filter @rx-ted/platform-api test` — all 106 tests pass
