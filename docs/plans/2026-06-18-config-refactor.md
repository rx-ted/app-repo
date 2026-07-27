# @rx-ted/packages-config 重构实现计划

> **Status: NOT IMPLEMENTED** — `@rx-ted/packages-config` 独立包从未被创建。配置功能已合并到 `packages/core` 中。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `packages/config` 从 adapter 类层次重构为平面模块组合，提供 Zod 驱动的 `createEnv` 和轻量 `env.get<T>()` 两套 API。

**Architecture:** 去掉 tsup 改用 tsc 编译。去掉 `dotenv` npm 包和 `@rx-ted/packages-logger` 依赖。运行时检测用 `std-env`。Zod schema 在 `createEnv()` 构造时校验。

**Tech Stack:** TypeScript 6, std-env 4, zod, vitest 4, tsc

---

## File Structure

```
packages/config/
├── src/
│   ├── index.ts           # 公开 API: createEnv, env, Runtime, detectRuntime
│   ├── create-env.ts      # createEnv({ schema, prefixes, runtimeEnv, skipValidation })
│   ├── env.ts             # Env class + env 单例 (轻量 API) + getEnvSource()
│   ├── detect-runtime.ts  # Runtime 类型 + detectRuntime()
│   ├── prefixes.ts        # resolveKey() 前缀解析
│   ├── dotenv.ts          # 轻量 dotenv 解析 (.env 文件加载)
│   └── shared.ts          # 类型断言、错误类
├── tests/
│   ├── prefixes.test.ts
│   ├── env.test.ts
│   └── create-env.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

### Task 1: 搭建基础结构和入口

**Files:**
- Create: `packages/config/src/detect-runtime.ts`
- Create: `packages/config/src/shared.ts`
- Create: `packages/config/src/index.ts`
- Modify: `packages/config/tsconfig.json`
- Create: `packages/config/vitest.config.ts`
- Delete: `packages/config/tsup.config.ts`

- [ ] **Step 1: 更新 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": false,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules", "**/*.test.ts", "**/*.spec.ts"]
}
```

- [ ] **Step 2: 删除 tsup.config.ts**

Run: `rm packages/config/tsup.config.ts`

- [ ] **Step 3: 创建 vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 4: 实现 detect-runtime.ts**

```ts
import { isNode, isBun, isDeno, isWorkerd } from 'std-env'

export type Runtime = 'node' | 'bun' | 'deno' | 'cloudflare' | 'vercel-edge'

let cached: Runtime | null = null

export function detectRuntime(): Runtime {
  if (cached) return cached
  if (isDeno) { cached = 'deno'; return cached }
  if (isBun) { cached = 'bun'; return cached }
  if (isWorkerd) { cached = 'cloudflare'; return cached }
  if (isNode) { cached = 'node'; return cached }
  if (typeof process !== 'undefined' && process.env) { cached = 'vercel-edge'; return cached }
  throw new Error('[packages-config] Unsupported runtime: no recognized environment detected')
}
```

- [ ] **Step 5: 实现 shared.ts（类型断言 + 错误）**

```ts
export class ConfigError extends Error {
  constructor(message: string) {
    super(`[packages-config] ${message}`)
    this.name = 'ConfigError'
  }
}

export class ConfigTypeError extends ConfigError {
  constructor(key: string, expected: string, value: string) {
    super(`Invalid type for "${key}": expected ${expected}, got "${value}"`)
    this.name = 'ConfigTypeError'
  }
}

export function assertString(key: string, value: string | undefined): string {
  if (value === undefined) throw new ConfigError(`Missing required config: ${key}`)
  return value
}

export function assertNumber(key: string, value: string | undefined): number {
  if (value === undefined) throw new ConfigError(`Missing required config: ${key}`)
  const n = Number(value)
  if (Number.isNaN(n)) throw new ConfigTypeError(key, 'number', value)
  return n
}

export function assertBoolean(key: string, value: string | undefined): boolean {
  if (value === undefined) throw new ConfigError(`Missing required config: ${key}`)
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false
  throw new ConfigTypeError(key, 'boolean', value)
}

export function assertUrl(key: string, value: string | undefined): URL {
  if (value === undefined) throw new ConfigError(`Missing required config: ${key}`)
  try {
    return new URL(value)
  } catch {
    throw new ConfigTypeError(key, 'URL', value)
  }
}
```

- [ ] **Step 6: 实现 index.ts（占位导出）**

```ts
export type { Runtime } from './detect-runtime'
export { detectRuntime } from './detect-runtime'
export { ConfigError, ConfigTypeError } from './shared'
```

- [ ] **Step 7: 验证 tsc**

Run: `cd packages/config && npx tsc -p tsconfig.json --noEmit`

- [ ] **Step 8: Commit**

```bash
git add packages/config/src/detect-runtime.ts packages/config/src/shared.ts packages/config/src/index.ts packages/config/tsconfig.json packages/config/vitest.config.ts && git rm packages/config/tsup.config.ts && git commit -m "feat(config): add detect-runtime, shared utils, vitest config"
```

---

### Task 2: 前缀解析和 dotenv 加载

**Files:**
- Create: `packages/config/src/prefixes.ts`
- Create: `packages/config/src/dotenv.ts`
- Create: `packages/config/tests/prefixes.test.ts`

- [ ] **Step 1: 实现 prefixes.ts**

```ts
export function resolveKey(
  key: string,
  source: Record<string, string | undefined>,
  prefixes: string[] = [],
): string | undefined {
  if (key in source) return source[key]
  for (const prefix of prefixes) {
    const prefixed = `${prefix}${key}`
    if (prefixed in source) return source[prefixed]
  }
  return undefined
}

export function filterKeys(
  source: Record<string, string | undefined>,
  prefixes: string[],
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const key of Object.keys(source)) {
    for (const prefix of prefixes) {
      if (key.startsWith(prefix)) {
        result[key] = source[key] ?? ''
        break
      }
    }
  }
  return result
}
```

- [ ] **Step 2: 实现 dotenv.ts（轻量 .env 文件解析）**

```ts
import { readFileSync } from 'node:fs'
import { existsSync } from 'node:fs'

export interface DotenvOptions {
  path?: string
  encoding?: BufferEncoding
  override?: boolean
}

export function parseDotenv(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const eqIndex = trimmed.indexOf('=')
    const key = trimmed.slice(0, eqIndex).trim()
    let raw = trimmed.slice(eqIndex + 1).trim()
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      raw = raw.slice(1, -1)
    }
    if (key) result[key] = raw
  }
  return result
}

export function loadDotenvFile(options?: DotenvOptions): Record<string, string> {
  const path = options?.path ?? '.env'
  if (!existsSync(path)) return {}
  const content = readFileSync(path, options?.encoding ?? 'utf8')
  const parsed = parseDotenv(content)
  for (const [key, value] of Object.entries(parsed)) {
    if (options?.override || !(key in process.env)) {
      process.env[key] = value
    }
  }
  return parsed
}
```

- [ ] **Step 3: 编写前缀解析测试**

```ts
import { describe, expect, it } from 'vitest'
import { resolveKey, filterKeys } from '../src/prefixes'

describe('resolveKey', () => {
  const source = { DATABASE_URL: 'pg://local', APP_DATABASE_URL: 'pg://prod', DEBUG: 'true' }

  it('should return exact match', () => {
    expect(resolveKey('DATABASE_URL', source)).toBe('pg://local')
  })

  it('should fallback to prefix match', () => {
    expect(resolveKey('DATABASE_URL', source, ['APP_'])).toBe('pg://local')
  })

  it('should try prefixes in order', () => {
    const src = { STAGING_DB: 'staging' }
    expect(resolveKey('DB', src, ['APP_', 'STAGING_'])).toBe('staging')
  })

  it('should return undefined when not found', () => {
    expect(resolveKey('NONEXISTENT', source)).toBeUndefined()
    expect(resolveKey('NONEXISTENT', source, ['APP_'])).toBeUndefined()
  })
})

describe('filterKeys', () => {
  it('should return only keys matching any prefix', () => {
    const source = { APP_DB: 'db', APP_SECRET: 'secret', OTHER: 'x' }
    const result = filterKeys(source, ['APP_'])
    expect(result).toEqual({ APP_DB: 'db', APP_SECRET: 'secret' })
  })
})
```

- [ ] **Step 4: 运行测试**

Run: `cd packages/config && npx vitest run tests/prefixes.test.ts`

- [ ] **Step 5: 导出新模块**

编辑 `packages/config/src/index.ts`：

```ts
export type { Runtime } from './detect-runtime'
export { detectRuntime } from './detect-runtime'
export { ConfigError, ConfigTypeError } from './shared'
export { resolveKey, filterKeys } from './prefixes'
export { loadDotenvFile, parseDotenv } from './dotenv'
export type { DotenvOptions } from './dotenv'
```

- [ ] **Step 6: 验证 tsc**

Run: `cd packages/config && npx tsc -p tsconfig.json --noEmit`

- [ ] **Step 7: Commit**

```bash
git add packages/config/src/prefixes.ts packages/config/src/dotenv.ts packages/config/tests/prefixes.test.ts packages/config/src/index.ts && git commit -m "feat(config): add prefix resolution and dotenv loader"
```

---

### Task 3: 实现 Env 轻量 API

**Files:**
- Create: `packages/config/src/env.ts`
- Create: `packages/config/tests/env.test.ts`
- Modify: `packages/config/src/index.ts`

- [ ] **Step 1: 实现 env.ts**

```ts
import type { Runtime } from './detect-runtime'
import { detectRuntime } from './detect-runtime'
import type { DotenvOptions } from './dotenv'
import { loadDotenvFile } from './dotenv'
import { assertString, assertNumber, assertBoolean, assertUrl } from './shared'

type EnvSource = Record<string, string | undefined>

export function getEnvSource(runtime: Runtime): EnvSource {
  switch (runtime) {
    case 'node':
    case 'vercel-edge':
      return process.env
    case 'bun':
      return (globalThis as any).Bun?.env ?? {}
    case 'deno':
      try {
        return (globalThis as any).Deno?.env.toObject() ?? {}
      } catch {
        return {}
      }
    case 'cloudflare':
      return ((globalThis as any).env ?? {}) as EnvSource
  }
}

class Env {
  readonly runtime: Runtime
  readonly #source: EnvSource

  constructor(source?: EnvSource, runtime?: Runtime) {
    this.runtime = runtime ?? detectRuntime()
    this.#source = source ?? getEnvSource(this.runtime)
  }

  get(key: string): string | undefined
  get(key: string, type: 'string'): string
  get(key: string, type: 'number'): number
  get(key: string, type: 'boolean'): boolean
  get(key: string, type: 'url'): URL
  get(key: string, type?: string): unknown {
    const raw = this.#source[key]
    if (type === 'string') return assertString(key, raw)
    if (type === 'number') return assertNumber(key, raw)
    if (type === 'boolean') return assertBoolean(key, raw)
    if (type === 'url') return assertUrl(key, raw)
    return raw
  }

  require(key: string): string {
    return assertString(key, this.#source[key])
  }

  has(key: string): boolean {
    return key in this.#source
  }

  isDebug(): boolean {
    return this.#source['DEBUG'] === 'true' || this.#source['DEBUG'] === '1'
  }

  toObject(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [k, v] of Object.entries(this.#source)) {
      if (v !== undefined) result[k] = v
    }
    return result
  }

  loadDotenv(options?: DotenvOptions): this {
    const parsed = loadDotenvFile(options)
    Object.assign(this.#source, parsed)
    return this
  }
}

export { Env }

export const env = new Env()
```

- [ ] **Step 2: 导出新模块**

编辑 `packages/config/src/index.ts`，添加：

```ts
export { Env, env, getEnvSource } from './env'
```

- [ ] **Step 3: 编写 env 测试**

```ts
import { describe, expect, it } from 'vitest'
import { Env, env } from '../src/env'

describe('Env', () => {
  it('should detect Node.js runtime', () => {
    expect(env.runtime).toBe('node')
  })

  it('should read process.env', () => {
    process.env.TEST_ENV_VAR = 'hello'
    expect(env.get('TEST_ENV_VAR')).toBe('hello')
    delete process.env.TEST_ENV_VAR
  })

  it('should return undefined for missing keys', () => {
    expect(env.get('NONEXISTENT_VAR_XYZ')).toBeUndefined()
  })

  it('require should throw for missing keys', () => {
    expect(() => env.require('NONEXISTENT_VAR_XYZ')).toThrow()
  })

  it('has should check key existence', () => {
    process.env.TEST_HAS = '1'
    expect(env.has('TEST_HAS')).toBe(true)
    expect(env.has('NONEXISTENT_VAR_XYZ')).toBe(false)
    delete process.env.TEST_HAS
  })

  it('isDebug should check DEBUG env', () => {
    process.env.DEBUG = 'true'
    expect(env.isDebug()).toBe(true)
    delete process.env.DEBUG
    expect(env.isDebug()).toBe(false)
  })

  it('get with type string should throw on missing', () => {
    expect(() => env.get('NONEXISTENT', 'string')).toThrow()
  })

  it('get with type number should coerce', () => {
    process.env.TEST_PORT = '5432'
    expect(env.get('TEST_PORT', 'number')).toBe(5432)
    delete process.env.TEST_PORT
  })

  it('get with type number should throw on NaN', () => {
    process.env.TEST_PORT = 'notanumber'
    expect(() => env.get('TEST_PORT', 'number')).toThrow()
    delete process.env.TEST_PORT
  })

  it('get with type boolean should coerce', () => {
    process.env.TEST_FLAG = 'true'
    expect(env.get('TEST_FLAG', 'boolean')).toBe(true)
    process.env.TEST_FLAG = 'false'
    expect(env.get('TEST_FLAG', 'boolean')).toBe(false)
    delete process.env.TEST_FLAG
  })

  it('get with type url should parse', () => {
    process.env.TEST_URL = 'https://example.com'
    const url = env.get('TEST_URL', 'url')
    expect(url).toBeInstanceOf(URL)
    expect(url.href).toBe('https://example.com/')
    delete process.env.TEST_URL
  })

  it('get with type url should throw on invalid', () => {
    process.env.TEST_URL = 'not-a-url'
    expect(() => env.get('TEST_URL', 'url')).toThrow()
    delete process.env.TEST_URL
  })

  it('toObject returns all env vars', () => {
    process.env.TEST_OBJ = 'val'
    const obj = env.toObject()
    expect(obj.TEST_OBJ).toBe('val')
    delete process.env.TEST_OBJ
  })
})

describe('Env with custom source', () => {
  it('should use provided source', () => {
    const e = new Env({ CUSTOM_KEY: 'custom_value' })
    expect(e.get('CUSTOM_KEY')).toBe('custom_value')
  })

  it('require should work with custom source', () => {
    const e = new Env({ KEY: 'val' })
    expect(e.require('KEY')).toBe('val')
    expect(() => e.require('MISSING')).toThrow()
  })
})
```

- [ ] **Step 4: 运行测试**

Run: `cd packages/config && npx vitest run tests/env.test.ts`

- [ ] **Step 5: 验证 tsc**

Run: `cd packages/config && npx tsc -p tsconfig.json --noEmit`

- [ ] **Step 6: Commit**

```bash
git add packages/config/src/env.ts packages/config/tests/env.test.ts packages/config/src/index.ts && git commit -m "feat(config): add Env lightweight API with type assertions"
```

---

### Task 4: 实现 createEnv Zod 声明式 API

**Files:**
- Create: `packages/config/src/create-env.ts`
- Create: `packages/config/tests/create-env.test.ts`
- Modify: `packages/config/src/index.ts`

- [ ] **Step 1: 实现 create-env.ts**

```ts
import type { z } from 'zod'
import type { Runtime } from './detect-runtime'
import { detectRuntime } from './detect-runtime'
import { getEnvSource } from './env'
import { resolveKey } from './prefixes'
import { ConfigError } from './shared'

type EnvSource = Record<string, string | undefined>

type ZodSchemaMap = Record<string, z.ZodTypeAny>

type InferEnv<T extends ZodSchemaMap> = {
  [K in keyof T]: z.infer<T[K]>
} & {
  toJSON(): Record<string, unknown>
}

export interface CreateEnvOptions<T extends ZodSchemaMap> {
  schema: T
  prefixes?: string[]
  runtimeEnv?: EnvSource
  runtime?: Runtime
  skipValidation?: boolean
}

export function createEnv<T extends ZodSchemaMap>(
  options: CreateEnvOptions<T>,
): InferEnv<T> {
  const { schema, prefixes = [] } = options
  const source: EnvSource = options.runtimeEnv ?? getEnvSource(
    options.runtime ?? detectRuntime(),
  )
  const validated: Record<string, unknown> = {}

  for (const key of Object.keys(schema)) {
    const raw = resolveKey(key, source, prefixes)
    const zodSchema = schema[key]
    const result = zodSchema.safeParse(raw)

    if (result.success) {
      validated[key] = result.data
    } else if (raw === undefined) {
      // Check if a default is available via parse(undefined)
      const defResult = zodSchema.safeParse(undefined)
      if (defResult.success) {
        validated[key] = defResult.data
      } else if (!options.skipValidation) {
        throw new ConfigError(
          `Validation failed for "${key}": ${result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
        )
      }
    } else if (!options.skipValidation) {
      throw new ConfigError(
        `Validation failed for "${key}": ${result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      )
    }
  }

  return new Proxy(validated as InferEnv<T>, {
    get(target, prop: string | symbol) {
      if (prop === 'toJSON') return () => ({ ...target })
      if (typeof prop === 'string' && prop in target) return target[prop]
      return undefined
    },
    ownKeys(target) {
      return Reflect.ownKeys(target)
    },
    getOwnPropertyDescriptor(target, prop) {
      return Reflect.getOwnPropertyDescriptor(target, prop)
    },
  })
}
```

- [ ] **Step 2: 编写 createEnv 测试**

```ts
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createEnv } from '../src/create-env'

describe('createEnv', () => {
  it('should validate and return env vars', () => {
    const env = createEnv({
      schema: { DB_URL: z.string() },
      runtimeEnv: { DB_URL: 'pg://localhost:5432/db' },
    })
    expect(env.DB_URL).toBe('pg://localhost:5432/db')
  })

  it('should throw on validation failure', () => {
    expect(() => createEnv({
      schema: { DB_URL: z.string().url() },
      runtimeEnv: { DB_URL: 'not-a-url' },
    })).toThrow()
  })

  it('should support default values', () => {
    const env = createEnv({
      schema: { PORT: z.coerce.number().default(3000) },
      runtimeEnv: {},
    })
    expect(env.PORT).toBe(3000)
  })

  it('should resolve prefixes', () => {
    const env = createEnv({
      schema: { DATABASE_URL: z.string() },
      prefixes: ['APP_'],
      runtimeEnv: { APP_DATABASE_URL: 'pg://prod' },
    })
    expect(env.DATABASE_URL).toBe('pg://prod')
  })

  it('should prefer exact match over prefix', () => {
    const env = createEnv({
      schema: { DATABASE_URL: z.string() },
      prefixes: ['APP_'],
      runtimeEnv: { DATABASE_URL: 'pg://local', APP_DATABASE_URL: 'pg://prod' },
    })
    expect(env.DATABASE_URL).toBe('pg://local')
  })

  it('toJSON returns all values', () => {
    const env = createEnv({
      schema: { KEY: z.string().default('val') },
      runtimeEnv: {},
    })
    expect(env.toJSON()).toEqual({ KEY: 'val' })
  })

  it('should not throw when skipValidation is true', () => {
    const env = createEnv({
      schema: { MUST_EXIST: z.string() },
      runtimeEnv: {},
      skipValidation: true,
    })
    expect(env.MUST_EXIST).toBeUndefined()
  })

  it('optional var without default returns undefined', () => {
    const env = createEnv({
      schema: { OPTIONAL_KEY: z.string().optional() },
      runtimeEnv: {},
    })
    expect(env.OPTIONAL_KEY).toBeUndefined()
  })

  it('should work with z.coerce.number', () => {
    const env = createEnv({
      schema: { PORT: z.coerce.number() },
      runtimeEnv: { PORT: '8080' },
    })
    expect(env.PORT).toBe(8080)
  })

  it('should work with z.boolean', () => {
    const env = createEnv({
      schema: { DEBUG: z.coerce.boolean() },
      runtimeEnv: { DEBUG: 'true' },
    })
    expect(env.DEBUG).toBe(true)
  })

  it('should handle multiple keys', () => {
    const env = createEnv({
      schema: {
        HOST: z.string().default('localhost'),
        PORT: z.coerce.number().default(3000),
        MODE: z.enum(['dev', 'prod']).default('dev'),
      },
      runtimeEnv: { MODE: 'prod' },
    })
    expect(env.HOST).toBe('localhost')
    expect(env.PORT).toBe(3000)
    expect(env.MODE).toBe('prod')
  })
})
```

- [ ] **Step 3: 运行测试**

Run: `cd packages/config && npx vitest run tests/create-env.test.ts`

- [ ] **Step 4: 导出 createEnv**

编辑 `packages/config/src/index.ts`，添加：

```ts
export { createEnv } from './create-env'
export type { CreateEnvOptions } from './create-env'
```

- [ ] **Step 5: 验证 tsc**

Run: `cd packages/config && npx tsc -p tsconfig.json --noEmit`

- [ ] **Step 6: Commit**

```bash
git add packages/config/src/create-env.ts packages/config/tests/create-env.test.ts packages/config/src/index.ts && git commit -m "feat(config): add createEnv Zod schema API"
```

---

### Task 5: 更新 package.json（去掉 tsup, dotenv, logger；添加 zod）

**Files:**
- Modify: `packages/config/package.json`

- [ ] **Step 1: 更新 package.json**

```json
{
  "name": "@rx-ted/packages-config",
  "version": "1.0.0",
  "type": "module",
  "description": "Universal environment configuration adapter for multiple JavaScript runtimes.",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "author": "rx-ted",
  "license": "MIT",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -p tsconfig.json --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "prepublishOnly": "pnpm build"
  },
  "files": ["dist"],
  "keywords": [
    "environment",
    "bun",
    "node",
    "deno",
    "cloudflare",
    "vercel-edge",
    "typescript",
    "zod"
  ],
  "publishConfig": {
    "access": "public"
  },
  "devDependencies": {
    "@types/node": "^25.9.1",
    "typescript": "^6.0.3",
    "vitest": "^4.1.7",
    "zod": "^4.0.0"
  },
  "dependencies": {
    "std-env": "^4.1.0"
  },
  "peerDependencies": {
    "zod": "^3.0.0 || ^4.0.0"
  }
}
```

Note: zod is a peer dependency (not bundled) since consumers already use it. std-env remains a direct dependency.

- [ ] **Step 2: 安装依赖**

Run: `cd packages/config && pnpm install`

- [ ] **Step 3: 运行全部测试确认**

Run: `cd packages/config && pnpm test`
Expected: All tests pass

- [ ] **Step 4: 运行 typecheck**

Run: `cd packages/config && pnpm typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add packages/config/package.json pnpm-lock.yaml && git commit -m "chore(config): update deps, remove tsup/dotenv/logger, add zod"
```

---

### Task 6: 清理旧文件

**Files:**
- Delete: `packages/config/src/adapters/` (entire directory)
- Delete: `packages/config/src/app-config.ts`
- Delete: `packages/config/README.md` (will be updated)

- [ ] **Step 1: 删除旧的 adapter 目录和 app-config.ts**

Run:
```bash
rm -rf packages/config/src/adapters
rm packages/config/src/app-config.ts
```

- [ ] **Step 2: 验证 tsc**

Run: `cd packages/config && npx tsc -p tsconfig.json --noEmit`

- [ ] **Step 3: 运行测试（确认旧测试已不存在）**

Run: `cd packages/config && pnpm test`

- [ ] **Step 4: Commit**

```bash
git add -A packages/config/src && git commit -m "refactor(config): remove legacy adapter classes and AppConfig"
```

---

### Task 7: 更新 README

**Files:**
- Modify: `packages/config/README.md`

- [ ] **Step 1: 重写 README.md**

````md
# @rx-ted/packages-config

Universal environment configuration for Node.js, Bun, Deno, Cloudflare Workers, and Vercel Edge.

## Features

- **Multi-runtime** — Auto-detects Node, Bun, Deno, Cloudflare Workers, Vercel Edge
- **Schema validation** — Zod-powered validation in `createEnv()`
- **Type safety** — Fully inferred TypeScript types
- **Prefix resolution** — Auto-fallback for prefixed env vars (`APP_`, `VITE_`, etc.)
- **Lightweight API** — Simple `env.get()` with optional type coercion
- **Zero-config** — Works out of the box with `process.env` / `Bun.env` / `Deno.env`

## Installation

```bash
pnpm add @rx-ted/packages-config zod
```

## Usage

### Zod schema API (recommended)

```ts
import { createEnv } from '@rx-ted/packages-config'
import { z } from 'zod'

const env = createEnv({
  schema: {
    DATABASE_URL: z.string().url(),
    DB_PORT: z.coerce.number().default(5432),
    REDIS_URL: z.string().url().optional(),
  },
  prefixes: ['APP_'],
})

// Type-safe:
env.DATABASE_URL // string
env.DB_PORT      // number (defaults to 5432)
env.REDIS_URL    // string | undefined
```

### Lightweight API

```ts
import { env } from '@rx-ted/packages-config'

env.get('DATABASE_URL')              // string | undefined
env.get('DATABASE_URL', 'string')    // string, throws if missing
env.get('DB_PORT', 'number')         // number, coerces, throws if NaN
env.get('DEBUG', 'boolean')          // boolean, coerces
env.get('API_URL', 'url')            // URL, throws if invalid

env.require('DATABASE_URL')          // string, throws if missing
env.has('DATABASE_URL')              // boolean
env.isDebug()                        // boolean
env.runtime                          // 'node' | 'bun' | 'deno' | 'cloudflare' | 'vercel-edge'
env.toObject()                       // Record<string, string>
env.loadDotenv({ path: '/path/to/.env' })
```

### Custom env source

```ts
const env = createEnv({
  schema: { API_KEY: z.string() },
  runtimeEnv: { API_KEY: 'sk-123' },
})
```

### Skip validation (CI environments)

```ts
const env = createEnv({
  schema: { DATABASE_URL: z.string().url() },
  skipValidation: !!process.env.CI,
})
```

## Prefix resolution

When a key is not found directly, the system tries each prefix in order:

```
Key defined:     DATABASE_URL
Lookup order:
  1. DATABASE_URL         (exact match)
  2. APP_DATABASE_URL     (prefixes[0])
  3. (next prefix...)
  4. Zod default          (if defined)
  5. undefined
```

## Supported runtimes

| Runtime | Detection | Env source |
|---------|-----------|------------|
| Node.js | `isNode` | `process.env` |
| Bun | `isBun` | `Bun.env` |
| Deno | `isDeno` | `Deno.env.toObject()` |
| Cloudflare Workers | `isWorkerd` | `globalThis.env` |
| Vercel Edge | Heuristic | `process.env` |

## License

MIT
````

- [ ] **Step 2: Commit**

```bash
git add packages/config/README.md && git commit -m "docs(config): update README with new API docs"
```

---

### Task 8: 迁移消费者 1 — apps/platform-api/src/lib/config.ts

**Files:**
- Modify: `apps/platform-api/src/lib/config.ts`

- [ ] **Step 1: 重写 config.ts**

```ts
import { createEnv } from '@rx-ted/packages-config'
import { z } from 'zod'

export const env = createEnv({
  schema: {
    DB_HOST: z.string(),
    DB_PORT: z.coerce.number(),
    DB_USER: z.string(),
    DB_PASSWORD: z.string(),
    DB_DATABASE: z.string(),
  },
  prefixes: ['APP_'],
})

export { env as appConfig }

export function getConfigValue<T = string>(key: string, defaultValue?: T): T | undefined {
  const value = env[key as keyof typeof env]
  return (value !== undefined ? value : defaultValue) as T | undefined
}

export function requireConfig<T = string>(key: string): T {
  const value = env[key as keyof typeof env]
  if (value === undefined) throw new Error(`Missing required config: ${key}`)
  return value as T
}

export function hasConfig(key: string): boolean {
  return key in env
}
```

- [ ] **Step 2: 检查其他导入此模块的地方是否受影响**

Run: `cd apps/platform-api && grep -r "from.*lib/config" src/ --include="*.ts"`

搜索 `from './lib/config'` 或 `from '../lib/config'`，检查 `appConfig`、`getConfigValue`、`requireConfig` 等调用是否需要调整。

- [ ] **Step 3: 运行 platform-api 测试**

Run: `cd apps/platform-api && pnpm test`
Expected: All tests pass (or update failing tests)

- [ ] **Step 4: Commit**

```bash
git add apps/platform-api/src/lib/config.ts && git commit -m "refactor(platform-api): migrate to new createEnv API"
```

---

### Task 9: 迁移消费者 2 — apps/platform-api/drizzle.config.ts

**Files:**
- Modify: `apps/platform-api/drizzle.config.ts`

- [ ] **Step 1: 更新 drizzle.config.ts**

```ts
import type { Config } from 'drizzle-kit'
import { env } from '@rx-ted/packages-config'

env.loadDotenv({ path: '~/config' })

export default {
  dialect: 'mysql',
  schema: './src/schema/index.ts',
  out: './drizzle/migrations',
  dbCredentials: {
    host: env.require('DB_HOST'),
    port: env.get('DB_PORT', 'number'),
    user: env.require('DB_USER'),
    password: env.require('DB_PASSWORD'),
    database: env.require('DB_DATABASE'),
  },
  casing: 'snake_case',
  verbose: true,
  strict: true,
} satisfies Config
```

- [ ] **Step 2: Commit**

```bash
git add apps/platform-api/drizzle.config.ts && git commit -m "refactor(platform-api): migrate drizzle.config to new env API"
```

---

### Task 10: 迁移消费者 3 — packages/honest/src/plugins/api-doc/api-doc.plugin.ts

**Files:**
- Modify: `packages/honest/src/plugins/api-doc/api-doc.plugin.ts`

- [ ] **Step 1: 更新 api-doc.plugin.ts 的 import 和 isDebug 调用**

将：

```ts
import { createEnvAdapter } from '@rx-ted/packages-config'
// ...
const adapter = createEnvAdapter()
if (!adapter.isDebug()) { ... }
```

改为：

```ts
import { env } from '@rx-ted/packages-config'
// ...
if (!env.isDebug()) { ... }
```

- [ ] **Step 2: 运行 honest 测试**

Run: `cd packages/honest && pnpm test`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add packages/honest/src/plugins/api-doc/api-doc.plugin.ts && git commit -m "refactor(honest): migrate to new env API"
```

---

### Task 11: 更新 Deno import map

**Files:**
- Modify: `apps/platform-api/deno.json`

- [ ] **Step 1: 检查 deno.json 的 import 映射**

查看 `apps/platform-api/deno.json`，确认 `@rx-ted/packages-config` 的映射是否需要调整。如果它指向 `../../packages/config/src/index.ts`，则确认新 index.ts 导出兼容。

- [ ] **Step 2: Commit 如有变动**

---

### Task 12: 端到端测试

- [ ] **Step 1: 创建 E2E 测试目录和测试文件**

```bash
mkdir -p e2e/tests/packages/config
```

```ts
// e2e/tests/packages/config/env-runtimes.test.ts
import { describe, expect, it } from 'vitest'
import { env, createEnv } from '@rx-ted/packages-config'
import { z } from 'zod'

describe('e2e: config package in Node.js', () => {
  it('should detect node runtime', () => {
    expect(env.runtime).toBe('node')
  })

  it('should read env vars', () => {
    process.env.E2E_TEST_KEY = 'e2e_value'
    expect(env.get('E2E_TEST_KEY')).toBe('e2e_value')
    delete process.env.E2E_TEST_KEY
  })

  it('createEnv should validate with prefixes', () => {
    const cfg = createEnv({
      schema: { DB_URL: z.string() },
      prefixes: ['APP_'],
      runtimeEnv: { APP_DB_URL: 'pg://e2e' },
    })
    expect(cfg.DB_URL).toBe('pg://e2e')
  })

  it('createEnv should coerce numbers', () => {
    const cfg = createEnv({
      schema: { PORT: z.coerce.number().default(3000) },
      runtimeEnv: {},
    })
    expect(cfg.PORT).toBe(3000)
  })

  it('should handle type assertions', () => {
    process.env.E2E_PORT = '9000'
    expect(env.get('E2E_PORT', 'number')).toBe(9000)
    delete process.env.E2E_PORT
  })

  it('toObject should return all values', () => {
    process.env.E2E_OBJ = 'test'
    const obj = env.toObject()
    expect(obj.E2E_OBJ).toBe('test')
    delete process.env.E2E_OBJ
  })
})
```

- [ ] **Step 2: 创建 test-runtimes.sh**

```bash
#!/usr/bin/env bash

# e2e/tests/packages/config/test-runtimes.sh
# Run config E2E tests across different runtimes

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEST_FILE="$SCRIPT_DIR/env-runtimes.test.ts"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PKG_DIR="$ROOT_DIR/packages/config"

echo "=== Running config E2E tests in Node.js ==="
cd "$PKG_DIR" && npx vitest run "$TEST_FILE" --config="$PKG_DIR/vitest.config.ts"

if command -v bun &> /dev/null; then
  echo "=== Running config E2E tests in Bun ==="
  cd "$PKG_DIR" && bunx vitest run "$TEST_FILE" --config="$PKG_DIR/vitest.config.ts"
fi

if command -v deno &> /dev/null; then
  echo "=== Running config E2E tests in Deno ==="
  cd "$PKG_DIR" && deno run -A "$TEST_FILE"
fi

echo "=== All E2E tests passed ==="
```

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/packages/config/ && git commit -m "test(config): add E2E tests and cross-runtime runner"
```

---

### Task 13: 全局验证

- [ ] **Step 1: 运行 turbo check + test + typecheck**

Run: `cd /Users/ben/projects/app && pnpm verify`

- [ ] **Step 2: 修复任何问题**

- [ ] **Step 3: Final commit (if needed)**
