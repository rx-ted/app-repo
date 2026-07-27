# Playwright E2E 测试策略

> **Status: IMPLEMENTED** — E2E 测试策略已在项目中实施。

## 四种测试维度

测试分为两个正交维度，可组合使用：

| 维度 | 粒度 | 解决的问题 |
| --- | --- | --- |
| **按范围** | 文件级 | 跑哪些文件 |
| **按类型** | 用例级 | 跑用例中的哪些测试 |

---

### 按范围（文件级）

#### 全量测试 Full Test

```bash
pnpm test:e2e
```

场景：PR、Push Main、首次建立基线。

#### 增量测试 Incremental Test

仅执行当前代码改动影响的测试文件，通过命名约定自动推导映射关系，无需手动维护映射表。

```bash
pnpm test:e2e:incremental
```

**工作原理：**

基于 `git diff` 检测变更文件，按以下优先级推导受影响的测试：

1. **共享基础设施**（`http/`、`router/`、`layouts/`、`styles/`、`composables/` 等）→ 跑全部测试
2. **页面文件**（`pages/LoginPage.vue`）→ 按命名约定映射到对应测试文件
3. **组件目录**（`components/blog/`）→ 映射到使用该组件的页面测试
4. **Store 文件**（`stores/session.ts`）→ 映射到依赖该 Store 的页面测试
5. 未匹配到具体测试 → 跑全部测试（安全的保守策略）

**与 `test-map.yml` 方案的对比：**

| | test-map.yml | 约定推导 |
| --- | --- | --- |
| 维护方式 | 手动同步每条文件映射 | 自动化 + 按需补充映射 |
| 遗漏风险 | 映射过期导致漏测 | 未匹配时跑全部（保守安全） |
| 新增页面 | 需手动添加映射 | 按命名约定自动命中 |
| 重构 | 需同步更新映射表 | 通常自动适配 |

#### 错误重试测试 Retry Failed

仅重新执行上次失败的测试，由自定义 Reporter 自动记录失败用例。

```bash
pnpm test:e2e:failed
```

失败记录保存在 `.artifacts/failed-tests.json`，每次重新执行成功后自动清空。

### 按类型（用例级）

#### 冒烟测试 Smoke Test

只跑错误路径用例（不跑成功路径），用于快速验证修复或日常开发中的回归检查。

**实现方式：** 给错误路径的测试用例打 `@smoke` 标签。

```typescript
// 错误路径用例：打 @smoke 标签
test('密码错误时显示错误提示 @smoke', async ({ page }) => {
  // ...
});

test('API返回500错误时显示错误信息 @smoke', async ({ page }) => {
  // ...
});

test('未登录访问受保护路由跳转到登录页 @smoke', async ({ page }) => {
  // ...
});

// 成功路径用例：不打标签
test('密码登录流程 - 成功', async ({ page }) => {
  // ...
});
```

```bash
pnpm test:e2e:smoke
```

**当前标注情况：** 已对 11 个测试文件中的 **42 条**错误路径用例添加了 `@smoke` 标签：

| 文件 | 条数 | 覆盖场景 |
| --- | --- | --- |
| `login.spec.ts` | 6 | 密码错误、空字段、API500、网络中断、邮箱校验、未登录 |
| `posts.spec.ts` | 6 | API500、空列表、401、404、API错误、loading |
| `static-pages.spec.ts` | 4 | API错误、空版本、loading、404 |
| `search.spec.ts` | 4 | 无关键词、无结果、服务不可用、API500 |
| `author.spec.ts` | 4 | API错误、不存在、空文章、loading |
| `register.spec.ts` | 3 | 密码不匹配、服务端错误、邮箱无效 |
| `profile.spec.ts` | 3 | 未登录、加载失败、保存失败 |
| `home.spec.ts` | 3 | API错误、超时、空数据 |
| `forgot-password.spec.ts` | 3 | 密码不匹配、验证码失败、按钮禁用 |
| `editor.spec.ts` | 3 | 未登录x2、保存API错误 |
| `dashboard.spec.ts` | 3 | 未登录、API错误、空数据 |

**标记指南：** 以下类型的用例应打 `@smoke` 标签：

- 接口错误（4xx、5xx）
- 网络异常（超时、中断）
- 空数据/边界值
- 权限不足/未登录
- 表单校验失败
- 404 等资源不存在
- Loading 状态
- 其他异常流程

**与增量测试的组合：**

```bash
# 只跑变更文件中涉及的错误路径（最快反馈）
pnpm test:e2e:incremental --grep @smoke

# 重试上次失败中的错误路径
pnpm test:e2e:failed --grep @smoke
```

> **platform-api 同样支持：** `pnpm --filter @rx-ted/platform-api test:e2e:smoke`，对 Vitest e2e 用例加 `@smoke` 后缀即可生效。

## 测试流程

### 日常开发

```text
修改代码
  ↓
增量测试（或直接定点跑单个文件）
  ↓
pnpm test:e2e:incremental
```

改 shared 层时增量测试会自动跑全部，改页面时只跑对应文件。

### 修复验证

```text
发现失败
  ↓
修复代码
  ↓
pnpm test:e2e:failed          # 只跑上次失败的
pnpm test:e2e:smoke            # 或只跑错误路径冒烟
```

### Pull Request

```text
创建 PR
  ↓
GitHub Actions
  ↓
全量 E2E 测试
  ↓
通过后合并
```

### Push Main

```text
Push Main
  ↓
GitHub Actions
  ↓
全量 E2E 测试
  ↓
生成报告
```

---

## 基础设施

### 动态端口

测试时 Vite dev server 自动使用空闲端口，避免与本地正在运行的 dev server 冲突。

实现方式：`e2e/scripts/detect-port.mjs` 寻找空闲端口，以 `PLAYWRIGHT_PORT` 环境变量传递给 Vite 和 Playwright 的 `baseURL`。

```bash
pnpm test:e2e
# 自动分配空闲端口，无需关心端口占用
```

如需指定端口：

```bash
PLAYWRIGHT_PORT=3456 pnpm test:e2e
```

### 动态 Token / 鉴权

测试用户定义在 `e2e/test-users.json`，运行 `test:e2e` 时 `auth.setup.ts` 自动用测试用户凭据登录，获取 token 并保存到 `.auth/user.json`（Playwright storageState）。

后续测试通过 Playwright 项目依赖自动使用该 token：

- `auth-setup` 项目：运行 `auth.setup.ts`，用测试用户登录，保存 storageState
- `chromium` 项目：依赖 `auth-setup`，自动使用 `.auth/user.json` 中的已登录状态

**注意事项：**

- 需要 `platform-api` 在 `localhost:3000` 运行（Vite proxy 目标），因为登录请求是真实的
- 测试用户及其凭据需要预先在数据库中准备
- 其他 API 调用仍使用 mock（`e2e/mocks/data.ts`），保持快速和确定性

```bash
# 启动前后端后跑 e2e
pnpm --filter @rx-ted/platform-api dev &
pnpm test:e2e
```

## 目录结构

```text
apps/web-blog/
├── e2e/
│   ├── auth.setup.ts              # 登录鉴权 setup（获取 token）
│   ├── test-users.json            # 测试用户凭据
│   ├── tests/                     # 测试用例
│   │   ├── login.spec.ts
│   │   ├── posts.spec.ts
│   │   └── ...
│   ├── fixtures/
│   │   └── test.ts                # 自定义 fixtures（含 API mock）
│   ├── mocks/
│   │   └── data.ts                # API mock 数据
│   ├── scripts/
│   │   ├── detect-port.mjs        # 动态端口分配
│   │   ├── test-affected.mjs      # 增量测试脚本
│   │   └── test-failed.mjs        # 失败重试脚本
│   ├── reporters/
│   │   └── failed-reporter.mjs    # 自动记录失败用例
│   └── playwright.config.ts
│
├── .auth/
│   └── user.json                  # 登录态（自动生成，已 gitignore）
│
├── .artifacts/
│   └── failed-tests.json          # 失败用例记录（自动生成）
│
└── package.json
```

## CI 配置

```yaml
name: E2E Test

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install

      - name: Start API & Migrate
        run: |
          pnpm --filter @rx-ted/platform-api db:push
          pnpm --filter @rx-ted/platform-api dev &
          npx wait-on http://localhost:3000/health

      - name: Seed Test User
        run: pnpm --filter @rx-ted/platform-api seed:e2e

      - name: Run Full E2E Test
        run: pnpm run test:e2e

      - name: Upload Playwright Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 总结

| 命令 | 粒度 | 场景 |
| --- | --- | --- |
| `test:e2e` | 全量 | CI、PR、发布前 |
| `test:e2e:incremental` | 按文件 | 日常开发 |
| `test:e2e:smoke` | 错误路径 | 快速回归验证 |
| `test:e2e:failed` | 失败重试 | 修复后验证 |
