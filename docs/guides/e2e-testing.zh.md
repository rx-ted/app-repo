---
title: E2E 测试流程规范
author: rx-ted
date: 2026-07-22
category: guide
tags:
  - testing
  - e2e
  - playwright
  - vitest
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: zh-CN
---

[English](./e2e-testing.md) | **中文**

# E2E 测试流程规范

**项目：TS + Playwright（前端）/ Vitest（后端）**

---

## 一、架构概览

本项目有两种 E2E 测试，统一放在 `e2e/` 目录下：

```
e2e/
  vitest.config.ts          # 后端 E2E（各后端模块通用）
  playwright.config.ts      # 前端 E2E（web-blog）
  tests/
    <module>/                # 按后端模块分目录，如 platform-api/
    web-blog/                # Playwright 前端测试
  mocks/
    data.ts                  # Playwright mock API 数据 + 路由定义
  fixtures/
    test.ts                  # Playwright 自定义 fixture
  reporters/
    failed-reporter.mjs      # 失败用例信息收集
  scripts/
    test-affected.mjs        # 增量测试
    test-failed.mjs          # 重跑失败用例
  auth.setup.ts              # Playwright auth 状态设置
  test-users.json            # 测试用户数据
```

| 类型 | 工具 | 测试对象 | 验证方式 | Mock 方式 |
|------|------|----------|----------|-----------|
| 前端 E2E | Playwright | web-blog 页面 | 浏览器操作 + DOM 断言 | `page.route()` 拦截 API |
| 后端 E2E | Vitest | 后端 controller / handler | 直接调用 handler + 返回断言 | `vi.mock()` 替换 service/repo |

---

## 二、快速开始

### 运行全部 E2E

```bash
pnpm test:e2e
```

通过 turbo 编排，同时运行前端和后端 E2E。

### 分开运行

```bash
# 前端 Playwright
pnpm --filter @rx-ted/web-blog exec npx playwright test --config=../../e2e/playwright.config.ts

# 前端 Playwright（带浏览器界面）
pnpm --filter @rx-ted/web-blog exec npx playwright test --config=../../e2e/playwright.config.ts --headed

# 前端 Playwright（UI 模式调试）
pnpm --filter @rx-ted/web-blog exec npx playwright test --config=../../e2e/playwright.config.ts --ui

# 后端 Vitest（以 platform-api 为例）
pnpm --filter @rx-ted/platform-api exec vitest run --config ../../e2e/vitest.config.ts

# 后端 Vitest（watch 模式）
pnpm --filter @rx-ted/platform-api exec vitest --config ../../e2e/vitest.config.ts
```

### Smoke 测试（只跑 @smoke 标记的用例）

```bash
pnpm test:e2e:smoke
```

---

## 三、前端 E2E（Playwright）

### 配置说明

`e2e/playwright.config.ts`:

- `testDir: './tests'` — 测试文件目录
- `testIgnore: ['**/platform-api/**']` — 排除后端 Vitest 测试
- `webServer` — 自动启动 web-blog 的 Vite dev server
- `CI` 环境变量控制是否进行 authenticated setup（存储 auth cookie）

### 测试环境

| 模式 | baseURL | API 来源 |
|------|---------|----------|
| CI | `http://localhost:5173` | `page.route()` 全部 Mock |
| 开发调试 | `http://localhost:5173` | 走真实 `localhost:3000` 或 Mock |

CI 中全部 mock API，不依赖后端服务。

### Mock API

在 `e2e/mocks/data.ts` 中集中定义所有 mock 数据和 API 路由拦截：

```ts
import { setupApiMocks } from '../../mocks/data';

test.beforeEach(async ({ page }) => {
  await setupApiMocks(page, false); // 未登录
});

test('访问首页', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=Tech Blog')).toBeVisible();
});
```

`setupApiMocks(page, authenticated)` 自动注册所有 API 路由的 mock 响应。

### 认证状态

Playwright 通过 `storageState` 机制模拟登录：

```ts
// 全局 auth-setup project（CI 模式下启用）
test.use({ storageState: '.auth/user.json' });
```

- CI：先运行 `auth.setup.ts` 登录并保存 cookie，后续用例复用
- 本地：默认不认证，按需手动调用 `setupApiMocks(page, true)` 或 `page.route()` 覆盖

### 目录规范

```
e2e/tests/web-blog/
  <page>/                     # 按页面/功能分目录
  <page>.spec.ts              # 或单文件
  home.spec.ts
  author.spec.ts
  static-pages.spec.ts
```

### 编写规范

```ts
import { test, expect } from '../../fixtures/test';  // 使用自定义 fixture
import { setupApiMocks } from '../../mocks/data';

test.describe('页面名 - 分类名', () => {
  test('测试描述 @smoke', async ({ page }) => {
    // 1. Arrange: setupApiMocks + mock 覆盖
    await setupApiMocks(page, true);

    // 2. Act: 页面操作
    await page.goto('/some-page');

    // 3. Assert: DOM 断言
    await expect(page.locator('...')).toBeVisible();
  });
});
```

命名规则：
- 文件名：`<page>.spec.ts`（全量）、`<page>.smoke.spec.ts`（仅 smoke）
- `describe`：`页面名 - 分类名`（如 `Home Page - 核心业务流程`）
- `it`：`中文描述测试场景 @tag`
- tag：`@smoke` 标记关键链路（P0），CI 中可用 `--grep @smoke` 过滤

---

## 四、后端 E2E（Vitest）

### 配置说明

`e2e/vitest.config.ts`:

- `root: __dirname` — 以 e2e/ 为根目录
- `include: ['tests/<module>/**/*.spec.ts']` — 各后端模块在自己的子目录下
- `setupFiles: ['tests/<module>/setup.ts']` — 每个模块可独立配置全局 mock
- `resolve.alias` — 为每个后端模块配置 alias，如 `@platform-api` → `apps/platform-api/src`

### 新增后端模块

1. 在 `e2e/tests/` 下创建 `<new-module>/` 目录
2. 在 `e2e/vitest.config.ts` 的 `include` 和 `resolve.alias` 中添加新模块
3. 在 `<new-module>/setup.ts` 中 mock 全局框架依赖
4. 编写测试文件 `.e2e.spec.ts`

### 测试方式

后端 E2E 直接调用 controller handler，不启动 HTTP 服务器：

```ts
import { AuthController } from 'your-module/auth/auth.controller';

const controller = new AuthController(mockService);
const result = await controller.login(body, mockCtx);
expect(result.accessToken).toBeDefined();
```

### Mock 方式

通过 `vi.mock()` 在 `setup.ts` 中全局 mock 外部依赖：

| 层次 | Mock 方式 |
|------|-----------|
| 框架/ORM 依赖（DI、decorators、drizzle 等） | `setup.ts` 全局 mock |
| 模块内部依赖（config、lib） | `setup.ts` 或测试文件内 `vi.mock()` |
| service / repository | 测试文件内 `vi.mock()` + 构造 mock 实例传入 controller |
| `hono/cookie` 等外部库 | 测试文件内 `vi.mock()`，或 mock context 的 `header` 方法 |

```ts
// 测试文件
import { vi } from 'vitest';
vi.mock('your-module/auth/auth.service', () => ({
  default: vi.fn(),
}));

import { AuthController } from 'your-module/auth/auth.controller';

function mockCtx() {
  return { req: { header: vi.fn() }, header: vi.fn(), json: vi.fn(), get: vi.fn() };
}
```

**注意**：`vi.mock()` 在 vitest 中会被提升（hoist）到文件顶部，比 import 先执行。如果 mock 没有生效，检查模块路径是否匹配 vitest 的解析结果。

### 目录规范

```
e2e/tests/<module>/
  <module>.e2e.spec.ts        # 按模块分文件
  setup.ts                    # 全局 mock 和 helper
```

---

## 五、三层环境策略

| 环境 | 用途 | 前端（Playwright） | 后端（Vitest） | 数据 |
|------|------|-------------------|----------------|------|
| test | CI + 本地开发 | mock API（`page.route()`） | mock service/repo（`vi.mock()`） | 无关 |
| staging | 上线前验证 | 真实 API 服务器，只跑 `@smoke` | 暂不运行 | 独立测试库 |
| prod | 零风险上线 | 仅 test + staging 均通过才发布 | — | 真实用户数据 |

CI 流程：

```yaml
# 当前实现（.github/workflows/ci.yml）
jobs:
  versify:
    - lint & format check
    - typecheck
    - unit test (pnpm test)
    - build

  e2e:
    - pnpm test:e2e  # 全部 mock，不依赖任何外部服务
```

---

## 六、turbo.json 配置

```json
{
  "test:e2e": {
    "dependsOn": [],
    "outputs": ["test-results/**"],
    "inputs": ["e2e/**", "apps/web-blog/src/**"]
  }
}
```

- 各后端模块的 `test:e2e` script 通过 `--config ../../e2e/vitest.config.ts` 指向共享配置
- `web-blog` 的 `test:e2e` script 通过 `--config=../../e2e/playwright.config.ts` 指向共享配置
- 所有 E2E 任务互不依赖，可并行运行

---

## 七、注意事项

| 事项 | 说明 |
|------|------|
| 两种 E2E 互不干扰 | Playwright 通过 `testIgnore` 排除 `<module>/` 目录 |
| 每个用例独立 | 不依赖上一个用例的数据或状态 |
| Playwright mock 集中管理 | 新增 API 路由时在 `mocks/data.ts` 添加，避免散落在各测试文件 |
| Vitest mock 就近声明 | service/repo mock 在各测试文件中声明，`setup.ts` 只 mock 全局框架依赖 |
| 别名解析 | 每个后端模块需在 `vitest.config.ts` 的 `resolve.alias` 中配置别名 |
| Playwright web server | 测试前自动启动 Vite，测试结束后自动关闭 |
| 增量测试 | 通过 `e2e/scripts/test-affected.mjs` 只跑受影响的测试文件 |
| 失败重跑 | CI 中 Playwright 自动重试 2 次，Vitest 不重试（默认） |
