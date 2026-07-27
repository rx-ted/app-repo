# DB Plugin Extraction Implementation Plan

> **Status: IMPLEMENTED** — DB Plugin 已提取到 `packages/honest-plugins/db`。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract `packages/honest/src/plugins/db/` into standalone `@rx-ted/packages-honest-plugin-db` package with backward-compatible re-exports.

**Architecture:** The new package at `packages/honest-plugin-db/` contains all 14 files moved from the honest core, with relative imports of core primitives (`Service`, `ComponentManager`, `Application`, `IPlugin`) replaced by imports from `@rx-ted/packages-honest`. The honest core adds a dependency on the new package and re-exports everything via `export * from '@rx-ted/packages-honest-plugin-db'`. Consumer apps see zero changes.

**Tech Stack:** TypeScript 6.0, pnpm workspace, Drizzle ORM 0.45, mysql2

**Reference source:** All files under `packages/honest/src/plugins/db/` — copy content verbatim except where import paths need rewriting (see Task 2).

---

### Task 1: Create new package scaffold

**Files:**
- Create: `packages/honest-plugin-db/package.json`
- Create: `packages/honest-plugin-db/tsconfig.json`

- [ ] **Step 1: Create directory**

```bash
mkdir -p packages/honest-plugin-db/src/mysql
mkdir -p packages/honest-plugin-db/src/postgres
mkdir -p packages/honest-plugin-db/src/sqlite
mkdir -p packages/honest-plugin-db/src/d1
```

- [ ] **Step 2: Create `packages/honest-plugin-db/package.json`**

```json
{
  "name": "@rx-ted/packages-honest-plugin-db",
  "version": "0.0.1",
  "description": "Database plugin for @rx-ted/packages-honest",
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

- [ ] **Step 3: Create `packages/honest-plugin-db/tsconfig.json`**

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

---

### Task 2: Migrate all 14 source files, rewriting imports

**Files:** Create each file from the source at `packages/honest/src/plugins/db/`. Only `db-service.ts` and `mysql/plugin.ts` need import rewrites — all other files are copied verbatim.

**Import rewrites:**

| File | Old relative import | New import |
|---|---|---|
| `src/db-service.ts` | `../../decorators` | `@rx-ted/packages-honest` |
| `src/db-service.ts` | `../../managers` | `@rx-ted/packages-honest` |
| `src/mysql/plugin.ts` | `../../../application` | `@rx-ted/packages-honest` |
| `src/mysql/plugin.ts` | `../../../interfaces` | `@rx-ted/packages-honest` |
| `src/mysql/plugin.ts` | `../../../managers` | `@rx-ted/packages-honest` |

- [ ] **Step 1: Create `src/constants.ts`** — copy verbatim from `packages/honest/src/plugins/db/constants.ts`

```bash
cp packages/honest/src/plugins/db/constants.ts packages/honest-plugin-db/src/constants.ts
```

- [ ] **Step 2: Create `src/types.ts`** — copy verbatim from `packages/honest/src/plugins/db/types.ts`

```bash
cp packages/honest/src/plugins/db/types.ts packages/honest-plugin-db/src/types.ts
```

- [ ] **Step 3: Create `src/db-service.ts`** — copy from source, then rewrite imports

```bash
cp packages/honest/src/plugins/db/db-service.ts packages/honest-plugin-db/src/db-service.ts
```

Then edit the copied file: change `../../decorators` and `../../managers` to `@rx-ted/packages-honest`.

Result:
```ts
import { Service, ComponentManager } from '@rx-ted/packages-honest';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { DB_GLOBAL_KEY } from './constants';

@Service()
class DbService {
  constructor() {
    return ComponentManager.getPlugin(DB_GLOBAL_KEY);
  }
}

interface DbService extends MySql2Database {}

export { DbService };
```

- [ ] **Step 4: Create `src/repository.ts`** — copy verbatim from `packages/honest/src/plugins/db/repository.ts`

```bash
cp packages/honest/src/plugins/db/repository.ts packages/honest-plugin-db/src/repository.ts
```

- [ ] **Step 5: Create `src/index.ts`** — copy verbatim from `packages/honest/src/plugins/db/index.ts`

```bash
cp packages/honest/src/plugins/db/index.ts packages/honest-plugin-db/src/index.ts
```

- [ ] **Step 6: Create `src/mysql/client.ts`** — copy verbatim from `packages/honest/src/plugins/db/mysql/client.ts`

```bash
cp packages/honest/src/plugins/db/mysql/client.ts packages/honest-plugin-db/src/mysql/client.ts
```

- [ ] **Step 7: Create `src/mysql/driver.ts`** — copy verbatim from `packages/honest/src/plugins/db/mysql/driver.ts`

```bash
cp packages/honest/src/plugins/db/mysql/driver.ts packages/honest-plugin-db/src/mysql/driver.ts
```

- [ ] **Step 8: Create `src/mysql/plugin.ts`** — copy from source, then rewrite imports

```bash
cp packages/honest/src/plugins/db/mysql/plugin.ts packages/honest-plugin-db/src/mysql/plugin.ts
```

Edit the copied file's import block. Change lines 5-6 and 10:

```ts
import type { Hono } from 'hono';
import type mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import type { ILogger } from '@rx-ted/packages-logger';
import { ComponentManager } from '@rx-ted/packages-honest';
import type { Application, IPlugin } from '@rx-ted/packages-honest';
import { createMysqlPool } from './client';
import { createMysqlDriver } from './driver';
import type { DatabaseDriver } from '../types';
import { DB_GLOBAL_KEY } from '../constants';
```

The rest of the file (lines 13-121) is copied verbatim unchanged.

- [ ] **Step 9: Create `src/mysql/types.ts`** — copy verbatim from `packages/honest/src/plugins/db/mysql/types.ts`

```bash
cp packages/honest/src/plugins/db/mysql/types.ts packages/honest-plugin-db/src/mysql/types.ts
```

- [ ] **Step 10: Create `src/mysql/index.ts`** — copy verbatim from `packages/honest/src/plugins/db/mysql/index.ts`

```bash
cp packages/honest/src/plugins/db/mysql/index.ts packages/honest-plugin-db/src/mysql/index.ts
```

- [ ] **Step 11: Create `src/postgres/index.ts`** — copy verbatim from `packages/honest/src/plugins/db/postgres/index.ts`

```bash
cp packages/honest/src/plugins/db/postgres/index.ts packages/honest-plugin-db/src/postgres/index.ts
```

- [ ] **Step 12: Create `src/sqlite/index.ts`** — copy verbatim from `packages/honest/src/plugins/db/sqlite/index.ts`

```bash
cp packages/honest/src/plugins/db/sqlite/index.ts packages/honest-plugin-db/src/sqlite/index.ts
```

- [ ] **Step 13: Create `src/d1/index.ts`** — copy verbatim from `packages/honest/src/plugins/db/d1/index.ts`

```bash
cp packages/honest/src/plugins/db/d1/index.ts packages/honest-plugin-db/src/d1/index.ts
```

- [ ] **Step 14: Verify all files exist**

```bash
find packages/honest-plugin-db/src -type f | sort
```
Expected:
```
packages/honest-plugin-db/src/constants.ts
packages/honest-plugin-db/src/d1/index.ts
packages/honest-plugin-db/src/db-service.ts
packages/honest-plugin-db/src/index.ts
packages/honest-plugin-db/src/mysql/client.ts
packages/honest-plugin-db/src/mysql/driver.ts
packages/honest-plugin-db/src/mysql/index.ts
packages/honest-plugin-db/src/mysql/plugin.ts
packages/honest-plugin-db/src/mysql/types.ts
packages/honest-plugin-db/src/postgres/index.ts
packages/honest-plugin-db/src/repository.ts
packages/honest-plugin-db/src/sqlite/index.ts
packages/honest-plugin-db/src/types.ts
```

---

### Task 3: Register workspace package and install

- [ ] **Step 1: Add to `pnpm-workspace.yaml`**

Edit `pnpm-workspace.yaml` and add `"packages/honest-plugin-db"` to the packages list:

```yaml
packages:
  - "apps/platform-api"
  - "apps/web-admin"
  - "apps/web-blog"
  - "packages/auth"
  - "packages/config"
  - "packages/http-client"
  - "packages/logger"
  - "packages/mail"
  - "packages/search"
  - "packages/honest"
  - "packages/honest-plugin-db"    # ← ADD THIS
  - "packages/event-bus"
```

- [ ] **Step 2: Install to link workspace packages**

```bash
pnpm install
```

Expected: pnpm creates the symlink for `@rx-ted/packages-honest-plugin-db` in the workspace.

---

### Task 4: Update honest core to re-export from new package

- [ ] **Step 1: Add dependency in `packages/honest/package.json`**

Add to `dependencies`:
```json
"@rx-ted/packages-honest-plugin-db": "workspace:^"
```

- [ ] **Step 2: Update `packages/honest/src/plugins/index.ts`**

Change:
```ts
export * from './db';
```
To:
```ts
export * from '@rx-ted/packages-honest-plugin-db';
```

- [ ] **Step 3: Remove old db plugin directory**

```bash
rm -rf packages/honest/src/plugins/db
```

- [ ] **Step 4: Clean honest dist to force rebuild**

```bash
rm -rf packages/honest/dist
```

---

### Task 5: Build new package and typecheck everything

- [ ] **Step 1: Build the new plugin package**

```bash
cd packages/honest-plugin-db && pnpm run build
```
Expected: `tsc` compiles with zero errors, outputs to `dist/`.

- [ ] **Step 2: Build the honest core**

```bash
cd packages/honest && pnpm run build
```
Expected: `tsc` compiles with zero errors. The re-export via `export * from '@rx-ted/packages-honest-plugin-db'` resolves correctly.

- [ ] **Step 3: Typecheck platform-api**

```bash
cd apps/platform-api && npx tsc --noEmit
```
Expected: Zero errors. All 38+ files importing `DbService` from `@rx-ted/packages-honest` resolve through the re-export chain.

- [ ] **Step 4: Run all tests**

```bash
cd packages/honest && pnpm test
```
Expected: 22 files, 193 tests passed.

```bash
cd apps/platform-api && pnpm test
```
Expected: 14 files, 106 tests passed.

---

### Task 6: Commit

- [ ] **Step 1: Stage all files**

```bash
git add packages/honest-plugin-db/ pnpm-workspace.yaml packages/honest/
git add -A  # to catch any deletions
```

- [ ] **Step 2: Commit**

```bash
git commit -m "refactor(db): extract db plugin to @rx-ted/packages-honest-plugin-db"
```
