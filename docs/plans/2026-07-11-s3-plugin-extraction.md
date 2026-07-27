# Extract S3 Plugin to Separate Package

> **Status: IMPLEMENTED** — S3 Plugin 已提取到 `packages/honest-plugins/s3`。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the S3 plugin from `packages/honest/src/plugins/s3/` to `packages/honest-plugins/s3/` as its own package, following the pattern of existing honest-plugins (cache, db, mail, api-doc).

**Architecture:** The S3 plugin has internal imports to honest (`Application`, `IPlugin`, `ComponentManager`, `maskSensitive`, `Service`). These relative imports (`../../`) must become package imports from `@rx-ted/packages-honest`. The `s3.driver.ts` file has no honest dependencies (only `@rx-ted/packages-core`), and `types.ts` has no external imports.

**Tech Stack:** TypeScript 6.x, pnpm workspaces, AWS SDK v3 (`^3.1056.0`)

**Key findings from exploration:**
- `packages/honest/src/plugins/index.ts` currently only exports `./s3` — removing it leaves the file empty
- `packages/honest/src/index.ts` has `export * from './plugins'` which must be removed
- `packages/honest/package.json` has `@aws-sdk/client-s3: ^3.1056.0` and `@aws-sdk/s3-request-presigner: ^3.1056.0`
- Platform-api (`apps/platform-api/src/lib/plugins.ts`) does NOT currently import S3, but the package should still be created and workspace-registered
- The cache plugin tsconfig is self-contained (does NOT extend `tsconfig.node.json` which has `noEmit: true`) — we follow the cache plugin pattern
- No test files exist for the S3 plugin

---

### Task 1: Create package directory and move files

**Files:**
- Create: `packages/honest-plugins/s3/src/` (directory)
- Move: 5 files from `packages/honest/src/plugins/s3/` → `packages/honest-plugins/s3/src/`

- [ ] **Step 1: Create directory**

```bash
mkdir -p packages/honest-plugins/s3/src
```

- [ ] **Step 2: Move S3 files with git mv**

```bash
git mv packages/honest/src/plugins/s3/index.ts packages/honest-plugins/s3/src/index.ts
git mv packages/honest/src/plugins/s3/s3.plugin.ts packages/honest-plugins/s3/src/s3.plugin.ts
git mv packages/honest/src/plugins/s3/s3.driver.ts packages/honest-plugins/s3/src/s3.driver.ts
git mv packages/honest/src/plugins/s3/s3-service.ts packages/honest-plugins/s3/src/s3-service.ts
git mv packages/honest/src/plugins/s3/types.ts packages/honest-plugins/s3/src/types.ts
```

If any `git mv` fails due to case-insensitive filesystem, use a temp name: `git mv Foo foo.tmp && git mv foo.tmp foo`

- [ ] **Step 3: Verify files moved**

```bash
ls packages/honest-plugins/s3/src/
```

Expected: `index.ts  s3.driver.ts  s3.plugin.ts  s3-service.ts  types.ts`

---

### Task 2: Fix imports in moved S3 files

**Files:**
- Modify: `packages/honest-plugins/s3/src/s3.plugin.ts`
- Modify: `packages/honest-plugins/s3/src/s3-service.ts`

The moved files have relative imports to honest internals using `../../` paths. These must become package imports.

- [ ] **Step 1: Fix s3.plugin.ts imports**

Replace the relative honest imports with package imports. The file currently has:

```typescript
import type { Application } from '../../application';
import type { IPlugin } from '../../interfaces';
import { ComponentManager } from '../../managers';
import { maskSensitive } from '../../utils';
```

Change to:

```typescript
import type { Application, IPlugin } from '@rx-ted/packages-honest';
import { ComponentManager } from '@rx-ted/packages-honest';
import { maskSensitive } from '@rx-ted/packages-honest';
```

Or more cleanly as a single import block:

```typescript
import type { Application, IPlugin } from '@rx-ted/packages-honest';
import { ComponentManager, maskSensitive } from '@rx-ted/packages-honest';
```

Keep the `import type { Hono } from 'hono'` and `import type { ILogger } from '@rx-ted/packages-core'` unchanged. Keep the local imports (`./s3.driver`, `./types`) unchanged.

- [ ] **Step 2: Fix s3-service.ts imports**

Replace:

```typescript
import { Service } from '../../decorators';
import { ComponentManager } from '../../managers';
```

With:

```typescript
import { Service } from '@rx-ted/packages-honest';
import { ComponentManager } from '@rx-ted/packages-honest';
```

Keep the local imports (`./types`, `./s3.plugin`) unchanged.

- [ ] **Step 3: Verify no remaining `../../` imports**

```bash
grep -r '../../' packages/honest-plugins/s3/src/
```

Expected: No matches

---

### Task 3: Create package.json

**Files:**
- Create: `packages/honest-plugins/s3/package.json`

Follow the cache plugin pattern (`packages/honest-plugins/cache/package.json`) for structure. Use actual AWS SDK versions from `packages/honest/package.json` (`^3.1056.0`).

- [ ] **Step 1: Write package.json**

```json
{
  "name": "@rx-ted/packages-honest-plugins-s3",
  "version": "1.0.0",
  "description": "S3 plugin for @rx-ted/packages-honest",
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
  "sideEffects": [
    "./dist/index.js"
  ],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/rx-ted/honest.git"
  },
  "author": "rx-ted",
  "license": "MIT",
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.1056.0",
    "@aws-sdk/s3-request-presigner": "^3.1056.0"
  },
  "peerDependencies": {
    "@rx-ted/packages-honest": "workspace:^",
    "hono": "^4.12.18"
  },
  "devDependencies": {
    "@types/node": "^25.9.1"
  }
}
```

Note: `hono` is a peerDependency because `s3.plugin.ts` imports `type { Hono } from 'hono'`.

---

### Task 4: Create tsconfig.json

**Files:**
- Create: `packages/honest-plugins/s3/tsconfig.json`

Follow the cache plugin pattern (self-contained, no extends — the shared `tsconfig.node.json` has `noEmit: true` which prevents building).

- [ ] **Step 1: Write tsconfig.json**

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
    "types": ["node"],
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

### Task 5: Update honest package — remove S3 exports and dependencies

**Files:**
- Modify: `packages/honest/src/plugins/index.ts` (remove S3 export)
- Modify: `packages/honest/src/index.ts` (remove `export * from './plugins'`)
- Modify: `packages/honest/package.json` (remove @aws-sdk dependencies)

- [ ] **Step 1: Remove S3 export from plugins/index.ts**

The file currently contains only:
```typescript
export * from './s3';
```

Replace with an empty file or delete it. Since `packages/honest/src/index.ts` references `./plugins`, we need to either keep an empty `plugins/index.ts` or remove the reference from `src/index.ts`. The cleanest approach: remove the reference from `src/index.ts` and delete `plugins/index.ts`.

- [ ] **Step 2: Remove `export * from './plugins'` from src/index.ts**

In `packages/honest/src/index.ts`, remove line 18:
```typescript
export * from './plugins';
```

- [ ] **Step 3: Delete the empty plugins directory**

After git mv moved all S3 files, the `packages/honest/src/plugins/s3/` directory should be empty. Remove the leftover `plugins/index.ts`:

```bash
rm packages/honest/src/plugins/index.ts
rm -rf packages/honest/src/plugins/s3/
rmdir packages/honest/src/plugins/ 2>/dev/null || true
```

- [ ] **Step 4: Remove @aws-sdk from honest package.json**

In `packages/honest/package.json`, remove these two lines from `dependencies`:

```json
"@aws-sdk/client-s3": "^3.1056.0",
"@aws-sdk/s3-request-presigner": "^3.1056.0",
```

---

### Task 6: Update pnpm-workspace.yaml

**Files:**
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: Add S3 plugin to workspace packages**

Add `- "packages/honest-plugins/s3"` to the packages list. Insert it after the other honest-plugins entries (after line 13, the `api-doc` entry):

```yaml
  - "packages/honest-plugins/api-doc"
  - "packages/honest-plugins/s3"
```

---

### Task 7: Run pnpm install and verify typecheck

**Files:** None (verification only)

- [ ] **Step 1: Install dependencies**

```bash
pnpm install
```

Expected: Lock file updates, new package linked to workspace.

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS. If there are type errors, fix them before proceeding.

- [ ] **Step 3: Check for any remaining S3 imports from honest**

```bash
grep -r "from.*packages-honest.*s3\|from.*honest/src/plugins/s3" apps/ packages/ --include="*.ts"
```

Expected: No matches (no one was importing S3 from honest directly in apps)

---

### Task 8: Commit

- [ ] **Step 1: Stage and commit**

```bash
git add -A
git commit -m "refactor(honest): extract S3 plugin to @rx-ted/packages-honest-plugins-s3"
```

---

## Verification Checklist

After all steps, confirm:
- [ ] `packages/honest-plugins/s3/src/` contains all 5 source files
- [ ] All relative `../../` imports in S3 files are replaced with `@rx-ted/packages-honest`
- [ ] `packages/honest/src/plugins/` directory is deleted
- [ ] `packages/honest/src/index.ts` no longer exports from `./plugins`
- [ ] `packages/honest/package.json` no longer has `@aws-sdk/*` dependencies
- [ ] `pnpm-workspace.yaml` includes `packages/honest-plugins/s3`
- [ ] `pnpm typecheck` passes
- [ ] Git commit message follows convention: `refactor(honest): extract S3 plugin to @rx-ted/packages-honest-plugins-s3`
