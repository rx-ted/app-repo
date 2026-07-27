# Config getSchema + env Runtime Fields Implementation Plan

> **Status: IMPLEMENTED** — `getSchema` 和 `env` 字段已在 `packages/core` 中实现。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Add `getSchema(prefix, schema)` and `env.ENV / PLATFORM / DEBUG / IS_PROD / IS_DEV / IS_TEST / ENV_KEYS` to `@rx-ted/packages-config`, enhance dotenv auto-env loading, update README, create changeset.

**Architecture:** All changes in existing files only (`src/env.ts`, `src/dotenv.ts`, `src/index.ts`, `tests/env.test.ts`). No new source files. `getSchema` uses Zod `parse()` for validation/coercion/defaults and reads from runtime env via `getEnvSource()` (portable across Node/Bun/Deno/CF/Edge).

**Tech Stack:** TypeScript 6, Zod 4, vitest 4, std-env 4, changesets.

---

### Task 1: Add runtime fields to `Env` class

**Files:**
- Modify: `packages/config/src/env.ts`

- [ ] **Add fields to constructor and class**

```typescript
// After readonly #source: EnvSource;
readonly ENV: 'prod' | 'test' | 'dev';
readonly PLATFORM: string;
readonly DEBUG: boolean;
readonly IS_PROD: boolean;
readonly IS_DEV: boolean;
readonly IS_TEST: boolean;
readonly ENV_KEYS: string[];

// In constructor, after initializing runtime/#source:
const nodeEnv = this.#source.NODE_ENV ?? this.#source.APP_ENV ?? 'dev';
const envValue = nodeEnv === 'production' ? 'prod' : nodeEnv === 'test' || nodeEnv === 'testing' ? 'test' : 'dev';
this.ENV = envValue;
this.PLATFORM = this.runtime;
this.DEBUG = envValue !== 'prod';
this.IS_PROD = envValue === 'prod';
this.IS_DEV = envValue === 'dev';
this.IS_TEST = envValue === 'test';
this.ENV_KEYS = [];
```

- [ ] **Commit**

```bash
git add packages/config/src/env.ts
git commit -m "feat(config): add ENV/PLATFORM/DEBUG/IS_PROD/IS_DEV/IS_TEST/ENV_KEYS runtime fields"
```

---

### Task 2: Add `getSchema` function to `env.ts`

**Files:**
- Modify: `packages/config/src/env.ts`

- [ ] **Add import and function at bottom of file**

```typescript
// imports — add:
import type { z } from 'zod';

// existing code...

// Add at bottom:
function findCaseInsensitive(source: EnvSource, name: string): string | undefined {
  const candidates = [name, name.toLowerCase(), name.toUpperCase()];
  for (const c of candidates) {
    if (c in source) return source[c];
  }
  for (const [k, v] of Object.entries(source)) {
    if (k.toLowerCase() === name.toLowerCase()) return v;
  }
  return undefined;
}

export function getSchema<T extends Record<string, z.ZodTypeAny>>(
  prefix: string,
  schema: T,
  options?: { env?: Record<string, string | undefined> },
): { [K in keyof T]: z.output<T[K]> } {
  const source = options?.env ?? getEnvSource(detectRuntime());
  const result: Record<string, unknown> = {};
  for (const [key, zodType] of Object.entries(schema)) {
    const varName = `${prefix}_${key.toUpperCase()}`;
    const raw = findCaseInsensitive(source, varName);
    result[key] = zodType.parse(raw ?? undefined);
  }
  if (env.ENV_KEYS) {
    env.ENV_KEYS.push(...Object.keys(schema));
  }
  return result as { [K in keyof T]: z.output<T[K]> };
}
```

- [ ] **Commit**

```bash
git add packages/config/src/env.ts
git commit -m "feat(config): add getSchema(prefix, schema) for env var groups"
```

---

### Task 3: Update exports in `index.ts`

**Files:**
- Modify: `packages/config/src/index.ts`

- [ ] **Add `getSchema` to exports**

```typescript
export { Env, env, getEnvSource, getSchema } from './env';
```

- [ ] **Commit**

```bash
git add packages/config/src/index.ts
git commit -m "chore(config): export getSchema from index"
```

---

### Task 4: Enhance dotenv with env-aware auto-loading

**Files:**
- Modify: `packages/config/src/dotenv.ts`

- [ ] **Modify `loadDotenvFile` to support env-aware cascading**

```typescript
export interface DotenvOptions {
  path?: string;
  encoding?: BufferEncoding;
  override?: boolean;
}

export function loadDotenvFile(options?: DotenvOptions): Record<string, string> {
  const basePath = options?.path ?? '.env';
  const merged: Record<string, string> = {};

  function loadOne(path: string) {
    if (!existsSync(path)) return;
    const content = readFileSync(path, options?.encoding ?? 'utf8');
    const parsed = parseDotenv(content);
    for (const [key, value] of Object.entries(parsed)) {
      if (options?.override || !(key in process.env)) {
        merged[key] = value;
      }
    }
  }

  loadOne(basePath);

  const nodeEnv = process.env.NODE_ENV ?? process.env.APP_ENV;
  let suffix = '';
  if (nodeEnv === 'production') suffix = '.prod';
  else if (nodeEnv === 'test' || nodeEnv === 'testing') suffix = '.test';
  else if (nodeEnv === 'development') suffix = '.dev';
  if (suffix) {
    loadOne(basePath + suffix);
  }

  for (const [key, value] of Object.entries(merged)) {
    process.env[key] = value;
  }
  return merged;
}
```

- [ ] **Commit**

```bash
git add packages/config/src/dotenv.ts
git commit -m "feat(config): auto-load .env.{prod|test|dev} based on NODE_ENV"
```

---

### Task 5: Add tests for runtime fields + getSchema + dotenv cascade

**Files:**
- Modify: `packages/config/tests/env.test.ts`
- Create: `packages/config/tests/dotenv.test.ts`

- [ ] **Add getSchema and runtime field tests to `env.test.ts`**

```typescript
// At end of file

describe('getSchema', () => {
  it('should return default values when env vars missing', () => {
    const result = getSchema('TEST', {
      host: z.string().default('localhost'),
      port: z.coerce.number().default(3306),
    }, { env: {} })
    expect(result).toEqual({ host: 'localhost', port: 3306 })
  })

  it('should read from provided env source', () => {
    const result = getSchema('DB', {
      host: z.string().default('localhost'),
      port: z.coerce.number().default(3306),
      user: z.string(),
    }, { env: { DB_HOST: '1.2.3.4', DB_PORT: '5432', DB_USER: 'admin' } })
    expect(result).toEqual({ host: '1.2.3.4', port: 5432, user: 'admin' })
  })

  it('should be case-insensitive for env var lookup', () => {
    const result = getSchema('DB', {
      host: z.string(),
    }, { env: { db_host: '10.0.0.1' } })
    expect(result.host).toBe('10.0.0.1')
  })

  it('should keep schema keys as output keys', () => {
    const result = getSchema('PG', {
      database: z.string().default('myapp'),
      ssl: z.coerce.boolean().default(false),
    }, { env: { PG_DATABASE: 'blog' } })
    expect(result.database).toBe('blog')
    expect(result.ssl).toBe(false)
  })

  it('should throw when required field is missing', () => {
    expect(() => getSchema('DB', {
      host: z.string(),
      password: z.string(),
    }, { env: { DB_HOST: 'localhost' } })).toThrow()
  })
})

describe('env runtime fields', () => {
  it('ENV should default to dev', () => {
    const e = new Env({})
    expect(e.ENV).toBe('dev')
  })

  it('ENV should read NODE_ENV', () => {
    const e = new Env({ NODE_ENV: 'production' })
    expect(e.ENV).toBe('prod')
  })

  it('ENV should fallback to APP_ENV', () => {
    const e = new Env({ APP_ENV: 'test' })
    expect(e.ENV).toBe('test')
  })

  it('PLATFORM should equal runtime', () => {
    expect(env.PLATFORM).toBe(env.runtime)
  })

  it('DEBUG should be true when not prod', () => {
    const e = new Env({})
    expect(e.DEBUG).toBe(true)
  })

  it('DEBUG should be false in prod', () => {
    const e = new Env({ NODE_ENV: 'production' })
    expect(e.DEBUG).toBe(false)
  })

  it('IS_PROD/IS_DEV/IS_TEST should be correct', () => {
    const prod = new Env({ NODE_ENV: 'production' })
    expect(prod.IS_PROD).toBe(true)
    expect(prod.IS_DEV).toBe(false)
    expect(prod.IS_TEST).toBe(false)

    const dev = new Env({ NODE_ENV: 'development' })
    expect(dev.IS_PROD).toBe(false)
    expect(dev.IS_DEV).toBe(true)

    const test = new Env({ APP_ENV: 'test' })
    expect(test.IS_TEST).toBe(true)
  })
})
```

- [ ] **Create dotenv test file**

```typescript
// packages/config/tests/dotenv.test.ts
import { describe, expect, it, beforeEach } from 'vitest';
import { parseDotenv } from '../src/dotenv';

describe('parseDotenv', () => {
  it('should parse key=value', () => {
    const result = parseDotenv('DB_HOST=127.0.0.1\nDB_PORT=3306');
    expect(result).toEqual({ DB_HOST: '127.0.0.1', DB_PORT: '3306' });
  });

  it('should ignore comments and empty lines', () => {
    const result = parseDotenv('# comment\n\nKEY=val');
    expect(result).toEqual({ KEY: 'val' });
  });

  it('should strip quotes', () => {
    const result = parseDotenv('KEY="quoted"\nKEY2=\'single\'');
    expect(result).toEqual({ KEY: 'quoted', KEY2: 'single' });
  });
});
```

- [ ] **Run tests to verify**

Run: `pnpm test`
Expected: 31+17=48 tests pass (total may vary by a few depending on exact count)

- [ ] **Commit**

```bash
git add packages/config/tests/env.test.ts packages/config/tests/dotenv.test.ts
git commit -m "test(config): add getSchema and env runtime fields tests"
```

---

### Task 6: Update README

**Files:**
- Modify: `packages/config/README.md`

- [ ] **Add sections for `getSchema` and env runtime fields**

Add after the `env` singleton section:

```markdown
### getSchema(prefix, schema)

Parse a group of prefixed env vars into a typed object using a Zod schema.

```typescript
import { getSchema } from '@rx-ted/packages-config'
import { z } from 'zod'

const db = getSchema('DB', {
  host: z.string().default('127.0.0.1'),
  port: z.coerce.number().default(3306),
  user: z.string(),
  password: z.string(),
  database: z.string(),
})
// Reads DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE from env
// Case-insensitive lookup — DB_HOST, db_host, Db_Host all work

// Spread into connection:
new MysqlPlugin({ connection: { ...db }, schema, logger: true })
```

### Runtime Fields

The `env` singleton exposes runtime metadata:

| Field | Type | Example |
|-------|------|---------|
| `env.ENV` | `'prod' \| 'test' \| 'dev'` | `'dev'` |
| `env.PLATFORM` | `string` | `'node'` |
| `env.DEBUG` | `boolean` | `true` (when not prod) |
| `env.IS_PROD` | `boolean` | `false` |
| `env.IS_DEV` | `boolean` | `true` |
| `env.IS_TEST` | `boolean` | `false` |
| `env.ENV_KEYS` | `string[]` | Keys registered via `getSchema` |

`ENV` reads from `NODE_ENV` (with fallback `APP_ENV`), normalizing `production→prod`, `test/testing→test`, `development→dev`.
```

Also update the dotenv section to mention env-aware cascade.

- [ ] **Commit**

```bash
git add packages/config/README.md
git commit -m "docs(config): update README with getSchema and runtime fields"
```

---

### Task 7: Create changeset and tidy up

**Files:**
- Create: `.changeset/<random>/<summary>.md`

- [ ] **Create changeset**

Run: `pnpm changeset` (or manually create changeset file for `@rx-ted/packages-config` with patch bump)

Content:
```
---
'@rx-ted/packages-config': minor
---

feat: add getSchema(prefix, schema) for env var groups
feat: add ENV/PLATFORM/DEBUG/IS_PROD/IS_DEV/IS_TEST/ENV_KEYS runtime fields
feat: auto-load .env.{prod|test|dev} based on NODE_ENV
```

- [ ] **Commit**

```bash
git add .changeset/
git commit -m "chore: add changeset for config package additions"
```
