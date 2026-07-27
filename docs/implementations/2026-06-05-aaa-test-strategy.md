# AAA Test Strategy: packages 与 apps 测试整理规范

> **Status: IMPLEMENTED** — AAA 测试规范已在项目中采用。

## 目标

为 `packages/*` 与 `apps/*` 建立统一的测试写法和覆盖策略，默认使用 AAA 模式（Arrange / Act / Assert），并通过清晰的 `describe` 分组覆盖正常路径、最坏路径、理想路径、极限输入、边界条件、状态变化、隔离、交互、异步和错误处理。

本规范用于后续补齐和重构测试，不要求一次性重写所有测试。新增或修改模块时，应按本规范补充对应测试。

## 范围

纳入范围：

- `packages/*`
- `apps/platform-api`
- `apps/web-blog`
- `apps/web-blog` (Playwright E2E)

排除范围：

- `apps/web-admin`

## 核心原则

1. 每个测试用例必须能看出 AAA 结构。
2. 多用 `describe` 按能力、行为、状态、错误、异步和边界条件分组。
3. 测试名称描述行为结果，而不是实现细节。
4. 单元测试优先验证输入、输出、状态和依赖交互。
5. 集成测试验证模块协作和框架行为。
6. E2E 测试只覆盖关键用户路径和跨系统行为，不替代单元测试。
7. 每个测试必须隔离：不依赖执行顺序、不共享可变状态、不泄露 mock、timer、storage 或网络拦截。
8. 最坏、理想、最好三类路径都要覆盖，但成本按风险控制。

## AAA 写法

推荐显式用空行分隔三段；复杂用例可加短注释。

```ts
it('returns cached value when the key exists', async () => {
  // Arrange
  cache.get.mockResolvedValue({ id: 'post-1' });
  const service = createService();

  // Act
  const result = await service.findPost('post-1');

  // Assert
  expect(result).toEqual({ id: 'post-1' });
  expect(repository.findById).not.toHaveBeenCalled();
});
```

短测试可以不写注释，但仍保持顺序：

```ts
it('normalizes empty input to an empty list', () => {
  const input: unknown[] = [];

  const result = normalizeItems(input);

  expect(result).toEqual([]);
});
```

## describe 分组标准

推荐从外到内按以下顺序组织：

```ts
describe('ModuleOrFunction', () => {
  describe('happy path', () => {});
  describe('input validation', () => {});
  describe('boundary cases', () => {});
  describe('state changes', () => {});
  describe('dependency interactions', () => {});
  describe('error handling', () => {});
  describe('async behavior', () => {});
  describe('isolation', () => {});
});
```

实际文件不必机械包含所有分组。只保留当前模块有意义的分组。

服务类推荐按方法分组：

```ts
describe('AuthService', () => {
  describe('login', () => {
    describe('happy path', () => {});
    describe('invalid credentials', () => {});
    describe('session state', () => {});
  });

  describe('refresh', () => {
    describe('token rotation', () => {});
    describe('replay protection', () => {});
  });
});
```

## 场景覆盖矩阵

每个模块至少评估以下场景。高风险模块应尽量覆盖完整矩阵。

| 场景 | 要验证什么 | 示例 |
|------|------------|------|
| 理想情况 | 依赖稳定、输入标准、结果完整 | 登录成功、队列入队成功、缓存命中 |
| 最好情况 | 快路径、缓存、去重、短路 | HTTP cache 命中、不发网络请求 |
| 最坏情况 | 依赖失败、网络超时、DB/Redis/Mail 报错 | 入队失败后补偿状态 |
| 极限情况 | 最大长度、最大并发、大数据量、重复调用 | 1000 条结果分页、并发 refresh |
| 边界情况 | 空值、0、1、最大/最小、过期临界点 | TTL 到期前后、空数组 |
| 输入验证 | 非法类型、缺字段、脏数据 | 无 email、无 password、非法 enum |
| 输出契约 | DTO shape、字段命名、默认值 | `is_read`、`created_at` |
| 行为 | 是否调用正确依赖、是否短路 | cache hit 时不查 DB |
| 属性 | 不变量、幂等性、排序、唯一性 | token hash 长度、结果按时间倒序 |
| 状态 | DB/cache/store/storage 是否正确变化 | markRead 清 cache |
| 隔离 | mock/timer/storage 不泄露 | beforeEach 清理 Pinia/localStorage |
| 交互 | 模块间协作和调用顺序 | service 调 repository 再 cache |
| 报错处理 | 抛错类型、错误码、补偿动作 | HTTPException 401 |
| 异步 | promise、timer、retry、race、并发 | retry 3 次后失败 |

## 分层策略

### packages/*

`packages` 是共享基础设施，测试应偏单元和小集成，重点是 API 契约和跨运行时安全。

必须覆盖：

- 公开 API 的输入输出。
- 默认配置与自定义配置。
- 错误输入和依赖不可用。
- 状态隔离：实例之间、测试之间不能互相污染。
- 异步行为：retry、dedupe、cache、queue、logger flush。
- 类型边界：泛型约束、可选参数、默认值。

建议分组：

```ts
describe('QueueManager', () => {
  describe('initialization', () => {});
  describe('queue definition', () => {});
  describe('job publishing', () => {});
  describe('worker registration', () => {});
  describe('failure events', () => {});
  describe('shutdown', () => {});
});
```

### apps/platform-api

`platform-api` 测试重点是服务行为、仓储交互、HTTP/controller 契约和插件生命周期。

必须覆盖：

- Service 正常路径、失败路径、边界输入。
- Repository 调用参数和错误传播。
- Cache 更新、删除、命中、未命中。
- Controller 状态码、响应 DTO、鉴权失败。
- 插件初始化顺序、DI 注入、关闭逻辑。
- 队列、邮件、通知这类异步流程的最终状态。

高风险场景：

- DB 成功但 Redis/Mail 失败时的补偿。
- 重复请求、并发请求、过期 token、重复 refresh。
- `HTTPException` 的 status 和 message。
- cache stale、cache miss、cache delete 失败。

### apps/web-blog

`web-blog` 测试重点是 composables、stores、HTTP 客户端、i18n 和纯 UI 状态逻辑。

必须覆盖：

- Store 初始状态、状态迁移、重置。
- Composable 的输入、输出、生命周期清理。
- HTTP interceptor 的 token 注入、401 refresh、失败回退。
- i18n message 完整性和 fallback。
- localStorage/sessionStorage 隔离。
- 浏览器 API mock：resize、scroll、IntersectionObserver、matchMedia。

推荐分组：

```ts
describe('useSearch', () => {
  describe('initial state', () => {});
  describe('query updates', () => {});
  describe('loading state', () => {});
  describe('empty result', () => {});
  describe('request failure', () => {});
  describe('cleanup', () => {});
});
```

### apps/web-blog (Playwright E2E)

E2E 只测关键路径和真实交互，避免覆盖所有边界。边界细节放到单元或集成测试。

必须覆盖：

- 首页可用。
- 登录、登出、受保护路由跳转。
- 搜索关键路径。
- 文章列表和详情关键路径。
- 关键错误状态：未登录、接口失败、空数据。

E2E 每个测试应明确用户行为：

```ts
test.describe('Login', () => {
  test('redirects to dashboard after password login', async ({ page }) => {
    await page.goto('/login');

    await page.locator('.n-tabs-tab[data-name="password"]').click();
    await page.locator('input[placeholder="Enter your username"]').fill('alice');
    await page.locator('input[placeholder="Enter your password"]').fill('password123');
    await page.locator('button:has-text("Login")').click();

    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

## Mock 与隔离规则

每个测试文件必须有明确的隔离策略。

推荐：

```ts
beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
});
```

使用 fake timers 时必须恢复：

```ts
describe('retry delay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
```

规则：

- 不在多个测试之间共享同一个可变对象，除非每次重新初始化。
- `vi.mock()` 的 hoisted mock 必须在 `beforeEach` 清理调用历史。
- 测试不能依赖系统时间，使用固定时间或 fake timers。
- 测试不能依赖真实网络，除 E2E 外应 mock fetch/client。
- 测试不能依赖真实 Redis/MySQL/Mail，除非文件名或分组明确是 integration。

## 异步测试规则

异步测试必须断言最终状态，而不是只等待 promise resolved。

```ts
it('marks mail as failed when enqueue fails', async () => {
  db.insert.mockResolvedValue([{ insertId: 1 }]);
  queue.add.mockRejectedValue(new Error('redis down'));
  const service = createService();

  await expect(service.send({ to: 'a@test.dev', subject: 'Hi' })).rejects.toThrow('redis down');

  expect(db.update).toHaveBeenCalledWith(mailLogs);
  expect(updateSet).toEqual(expect.objectContaining({
    status: 'failed',
    errorMessage: expect.stringContaining('Enqueue failed'),
  }));
});
```

并发场景要验证去重、顺序或互斥：

```ts
it('dedupes concurrent refresh requests', async () => {
  const provider = vi.fn().mockResolvedValue('token-2');
  const queue = new RefreshQueue();

  const [a, b, c] = await Promise.all([
    queue.refresh(provider),
    queue.refresh(provider),
    queue.refresh(provider),
  ]);

  expect([a, b, c]).toEqual(['token-2', 'token-2', 'token-2']);
  expect(provider).toHaveBeenCalledTimes(1);
});
```

## 错误处理测试规则

错误测试不能只写 `toThrow()`，还要验证副作用。

应覆盖：

- 抛出的错误类型。
- status code 或错误码。
- 依赖是否停止后续调用。
- 失败后状态是否补偿。
- 日志或告警是否触发。
- 异步失败是否被 await。

```ts
it('does not create a session when password is invalid', async () => {
  authRepo.getSessionUserByUsername.mockResolvedValue(userWithPasswordHash);
  const service = createService();

  await expect(service.login('alice', 'wrong')).rejects.toThrow(HTTPException);

  expect(sessionRepo.create).not.toHaveBeenCalled();
  expect(sessionRepo.setRefreshTokenHash).not.toHaveBeenCalled();
});
```

## 属性与不变量

有些测试应验证“不管输入如何都必须成立”的属性。

示例：

- hash 输出始终是固定格式。
- pagination `pageSize` 不超过最大值。
- sorted result 保持稳定排序。
- cache key 不包含 undefined。
- generated IDs 不为空且不重复。
- queue failed event 最终失败只触发一次告警。

```ts
it('always returns salt:hash format', () => {
  const result = hashPassword('password');
  const [salt, hash] = result.split(':');

  expect(salt).toHaveLength(32);
  expect(hash).toMatch(/^[a-f0-9]+$/);
});
```

## 输入输出测试

输入测试关注“不接受什么”和“如何默认化”。

输出测试关注 public contract，不关注内部结构。

```ts
describe('input validation', () => {
  it('rejects missing email', async () => {});
  it('rejects invalid enum value', async () => {});
  it('defaults optional text to empty string', async () => {});
});

describe('output contract', () => {
  it('returns snake_case response fields expected by clients', async () => {});
  it('does not expose internal password hash', async () => {});
});
```

## 状态测试

状态测试要同时验证“变了什么”和“没变什么”。

示例：

- `markRead()` 设置 `isRead` 并清理 notification cache。
- `logout()` 删除 session，但不删除其他用户 session。
- `saveLayout()` 写缓存并 enqueue sync job。
- `MailConsumer` 成功后把 `queued` 改为 `sent`。
- `MailConsumer` 最终失败后把 `queued` 改为 `failed`。

## 交互测试

交互测试用于服务、仓储、插件、队列和 HTTP client。

应验证：

- 调用顺序是否重要。
- 参数是否完整。
- 快路径是否跳过昂贵依赖。
- 失败时是否停止后续调用。
- 多依赖是否保持一致状态。

```ts
it('reads from cache before repository', async () => {
  cache.get.mockResolvedValue(cachedPost);
  const service = createService();

  const result = await service.findPost('post-1');

  expect(result).toEqual(cachedPost);
  expect(repository.findById).not.toHaveBeenCalled();
});
```

## 极限与边界清单

新增测试时优先从以下清单挑选适用项：

- 空字符串、空数组、空对象。
- `null`、`undefined`、缺失字段。
- 0、1、最大值、负数、浮点数。
- 很长字符串、特殊字符、中文、emoji、HTML、SQL-like 字符串。
- 重复 ID、重复请求、重复事件。
- 过期前一毫秒、过期后一毫秒。
- 并发 2 个请求、并发 N 个请求。
- 依赖第一次失败后成功。
- 依赖一直失败。
- 请求取消、组件卸载、订阅取消。
- cache hit、cache miss、cache stale。
- DB 成功 Redis 失败、Redis 成功 DB 失败。
- 网络超时、HTTP 401、HTTP 500、无响应体、非法 JSON。

## 文件命名与放置

默认使用与源码同目录：

- `foo.ts` → `foo.test.ts` 或 `foo.spec.ts`
- Vue composable/store → `*.spec.ts`
- E2E → `apps/web-blog/e2e/tests/*.spec.ts`

已有文件风格不强制改名。新增文件优先遵循所在目录现有风格。

## Review Checklist

提交测试时按以下清单检查：

- 是否使用 AAA 结构。
- 是否有清晰 `describe` 分组。
- 是否覆盖 happy path。
- 是否覆盖最坏或失败路径。
- 是否覆盖至少一个边界或极限输入。
- 是否验证输出契约。
- 是否验证关键状态变化。
- 是否验证依赖交互。
- 是否清理 mock、timer、storage。
- 异步测试是否 await 完整。
- 错误测试是否验证副作用。
- 测试名称是否能说明业务行为。

## 执行建议

优先顺序：

1. 先补 `packages/event-bus`、`packages/http-client`、`packages/honest` 这类基础设施测试。
2. 再补 `apps/platform-api` 的认证、邮件、通知、队列、搜索、文章服务测试。
3. 再补 `apps/web-blog` 的 store、composable、HTTP interceptor 测试。
4. 最后用 `apps/web-blog` (Playwright E2E) 和 `apps/platform-api` (Vitest E2E) 补关键用户路径，不扩大到所有边界。

建议命令：

```bash
pnpm --dir packages/event-bus test
pnpm --dir packages/http-client test
pnpm --dir packages/honest test
pnpm --dir apps/platform-api test
pnpm --dir apps/web-blog test
```

如果某个测试必须依赖外部服务，应放入单独 integration 分组，并在测试名或文件名中明确标注。
