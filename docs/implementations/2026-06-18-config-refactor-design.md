# @rx-ted/packages-config 重构设计

> **Status: SUPERSEDED** — `@rx-ted/packages-config` 独立包从未被创建，配置功能已合并到 `packages/core`。

- **日期:** 2026-06-18
- **状态:** Approved
- **作者:** rx-ted

## 概述

基于 TypeScript + std-env + vitest + zod 重构 `packages/config`，去掉 tsup，使用 tsc 编译。提供 Zod schema 驱动的 `createEnv` 和轻量 `env.get<T>()` 两套 API，支持 Node/Bun/Deno/Cloudflare Workers/Vercel Edge 运行时。

## 包架构

```
packages/config/
├── src/
│   ├── index.ts              # 公开 API 导出
│   ├── create-env.ts         # createEnv — Zod schema 声明式创建
│   ├── env.ts                # 运行时环境源 (runtime adapter)
│   ├── prefixes.ts           # 前缀自动解析
│   ├── dotenv.ts             # .env 文件加载
│   ├── detect-runtime.ts     # 运行时检测 (std-env)
│   └── shared.ts             # 共享类型/工具
├── tests/
│   ├── create-env.test.ts
│   ├── env.test.ts
│   ├── prefixes.test.ts
│   └── detect-runtime.test.ts
├── package.json
├── tsconfig.json             # 构建配置 (include src, exclude tests)
├── vitest.config.ts
└── DESIGN.md

e2e/
└── tests/
    └── packages/
        └── config/
            ├── env-runtimes.test.ts  # 跨运行时 E2E 测试
            └── test-runtimes.sh      # 多运行时 E2E runner
```

### 移除

- `tsup` → 改用 `tsc` 编译
- `dotenv` npm 包 → 改用 `std-env` 内置能力
- `@rx-ted/packages-logger` → 不再强依赖 logger
- adapter/ 目录 + 4 个 adapter 类 → 平面模块组合

### 新增依赖

- `zod` — Schema 校验
- `std-env` — 已有依赖，运行时检测 + dotenv 加载

## API 设计

### A. `createEnv` — Zod schema 声明式 API（主入口）

```ts
import { createEnv } from '@rx-ted/packages-config'
import { z } from 'zod'

export const env = createEnv({
  schema: {
    DATABASE_URL: z.string().url(),
    DB_PORT: z.coerce.number().default(5432),
    REDIS_URL: z.string().url().optional(),
    API_URL: z.string().url(),
  },
  prefixes: ['APP_', 'VITE_'],
  runtimeEnv: process.env,
  skipValidation: !!process.env.CI,
})
```

**返回值行为：**
- `env.DATABASE_URL` → `string`（类型安全，IDE 自动完成）
- `env.API_URL` → 实际读取 `VITE_API_URL` 或 `APP_API_URL`（prefixes 自动回退）
- 构造时 Zod 校验每个 schema key，不通过立即抛错

### B. `env` — 轻量级 API

```ts
import { env } from '@rx-ted/packages-config'

env.get('DATABASE_URL')           // string | undefined
env.get<string>('DATABASE_URL')   // string, throws if missing
env.get<number>('DB_PORT')        // coerce to number, throws if NaN
env.get<boolean>('DEBUG')         // coerce to boolean ('true'/'false'/'1'/'0')
env.require('DATABASE_URL')       // string, throws if missing
env.has('DATABASE_URL')           // boolean
env.isDebug()                     // boolean
env.runtime                       // 'node' | 'bun' | 'deno' | 'cloudflare' | 'vercel-edge'
env.toObject()                    // Record<string, string>
```

**内置类型断言**（无需 Zod）：
| 泛型 | 行为 |
|------|------|
| `string` | 原值返回，undefined 抛错 |
| `number` | `Number()` 转换，NaN 抛错 |
| `boolean` | `'true'/'1'` → `true`, `'false'/'0'` → `false`，否则抛错 |
| `URL` | `new URL()` 构造，无效抛错 |

`env` 在内部也是 `createEnv` 的产物——不传 schema 时做宽松模式。

## 前缀解析

```
定义 key: DATABASE_URL
检测顺序:
  1. DATABASE_URL          → 精确匹配
  2. APP_DATABASE_URL      → prefixes[0]
  3. (更多 prefixes 依次)
  4. Zod default           → schema 默认值
  5. undefined
```

`prefixes` 作用于 schema 所有 keys。

## 运行时检测

| 运行时 | `std-env` API | 环境源 |
|--------|---------------|--------|
| Node.js | `isNode` | `process.env` |
| Bun | `isBun` | `Bun.env` |
| Deno | `isDeno` | `Deno.env.toObject()` |
| Cloudflare Workers | `isWorkerd` | `globalThis.env` |
| Vercel Edge | `isEdgeRuntime` | `process.env` |

无匹配运行时 → `throw new Error('Unsupported runtime')`

## 构建方案

去掉 `tsup.config.ts`，`tsconfig.json` 配置 tsc 编译：

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "strict": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules", "**/*.test.ts", "**/*.spec.ts"]
}
```

```bash
# build 脚本
tsc -p tsconfig.json
```

## 测试策略

| 层级 | 内容 | 工具 |
|------|------|------|
| Unit | `createEnv` schema 校验、前缀解析、类型断言 | vitest |
| Unit | 运行时检测（mock `std-env`） | vitest |
| Unit | dotenv 加载 | vitest |
| Unit | `env.get<T>()` 类型断言 | vitest |
| E2E | 跨运行时（node/bun/deno）环境变量读取 | `scripts/test-runtimes.sh` |

## 消费者迁移

### `apps/platform-api/src/lib/config.ts`

```ts
// Before
import { AppConfig } from '@rx-ted/packages-config'
export const appConfig = AppConfig.getInstance(undefined, logger)

// After
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
```

### `apps/platform-api/drizzle.config.ts`

```ts
// Before
import { createEnvAdapter } from '@rx-ted/packages-config'
const env = createEnvAdapter({ path: '~/config' })

// After
import { env } from '@rx-ted/packages-config'
env.loadDotenv('~/config')
```

### `packages/honest/src/plugins/api-doc/api-doc.plugin.ts`

```ts
// Before
const adapter = createEnvAdapter()
if (!adapter.isDebug()) { ... }

// After
import { env } from '@rx-ted/packages-config'
if (!env.isDebug()) { ... }
```

## E2E 测试方案

位置：`e2e/tests/packages/config/env-runtimes.test.ts`

```bash
e2e/tests/packages/config/test-runtimes.sh
├── node  e2e/tests/packages/config/env-runtimes.test.ts   # node --import tsx ...
├── bun   e2e/tests/packages/config/env-runtimes.test.ts   # bun ...
└── deno  e2e/tests/packages/config/env-runtimes.test.ts   # deno ...
```

每个运行时验证：
1. 环境变量读取
2. 前缀解析
3. 类型断言
4. dotenv 加载
5. 错误抛出行为

## 实施顺序

1. 创建新文件结构（src/*.ts）
2. 实现 `detect-runtime.ts` + `env.ts`
3. 实现 `prefixes.ts` + `dotenv.ts`
4. 实现 `create-env.ts`
5. 实现 `shared.ts` + `index.ts`
6. 编写 Unit tests
7. 编写 E2E tests
8. 更新 `package.json`（scripts, dependencies）
9. 更新 `tsconfig.json`（去掉 tsup，调整编译）
10. 迁移 3 个消费者
11. 验证 build + test 全部通过
