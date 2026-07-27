# OpenAPI 前端契约自动化设计

> **Status: IMPLEMENTED** — OpenAPI 前端契约已通过 `openapi-typescript` + `openapi-fetch` 实现。

## 背景

目前 `apps/platform-api` 的路由通过 Zod schema 生成 OpenAPI 文档，并在开发环境提供：

- `/api/v1/openapi.json`
- `/api/v1/docs`（Scalar，亦可切换 Swagger）

但前端 `apps/web-blog` 并未直接消费这份规范。`scripts/generate-openapi-snapshot.spec.ts` 需要手动执行，才会把规范写入前端的 `specs/openapi.json`；前端请求仍普遍采用 `http.get<ApiResponse<T>>()` 的手写泛型。该泛型是断言，不会约束 URL、path/query 参数、请求体或真实响应结构。

为复用 Zod 类型而新增的 `packages/api-contracts` 使后端与前端共享了部分 schema，却把 API 修改分散到第三个包中维护。它没有成为完整 HTTP 契约的唯一来源，仍不能自动保证端点、参数与响应的一致性。

## 目标

- 将后端生成的 OpenAPI 规范作为前后端 HTTP 契约的唯一来源。
- 自动生成前端 TypeScript 声明，避免手写 API 请求/响应类型、路径及参数。
- 前端继续使用现有 `@rx-ted/packages-http-client` 的鉴权、刷新令牌、重试、缓存、去重和追踪能力。
- Scalar 与 Swagger 继续消费同一个运行时 OpenAPI 端点；不维护额外文档文件。
- 在 CI 中阻止"后端 API 已变化、前端生成类型未更新"的提交。
- 允许渐进迁移，不要求一次性替换所有前端调用。

## 非目标

- 不在第一阶段生成完整业务 SDK、Vue Query hooks、MSW mock 或 Zod 客户端校验。
- 不改变现有 API 的响应包装协议 `{ status, code, data }`。
- 不在第一阶段删除 `packages/api-contracts`，以免将迁移风险与 schema 移动耦合。
- 不把运行时数据校验误认为编译时类型生成；两者分别处理。

## 生成流水线

```text
Backend (Hono 路由 + Zod schema)
         │
         ▼
  exportOpenApiSpec()   ← import 路由，无需启动 HTTP 服务器
         │
         ▼
apps/platform-api/specs/openapi.json   ← 提交到 git
         │
         ▼
openapi-typescript   ← 零运行时成本，仅生成类型
         │
         ▼
apps/web-blog/src/api/__generated__/api.d.ts   ← 提交到 git
         │
         ▼
openapi-fetch + 现有 http-client 适配器 → 业务页面 / store
```

**关键设计决策：OpenAPI JSON 不通过 HTTP 端点获取。** 导出脚本直接 import Hono 路由定义，调用 `app.routes` 或 `swaggerJSON()` 序列化为 JSON，不需要启动 HTTP 服务器或依赖外部服务（D1、Redis 等）。这使生成流程在 CI 和本地开发中都是确定性的、无外部依赖的。

后端路由元数据与 Zod schema 是唯一可编辑的 HTTP 契约。OpenAPI JSON、`api.d.ts` 与文档 UI 都是可再生输出，不能人工编辑。

## 生成文件路径

| 文件 | 路径 | 提交到 git | 说明 |
| --- | --- | --- | --- |
| OpenAPI 规范 | `apps/platform-api/specs/openapi.json` | 是 | 后端路由的序列化产物 |
| 前端类型声明 | `apps/web-blog/src/api/__generated__/api.d.ts` | 是 | `openapi-typescript` 生成，供 IDE 和 CI 使用 |

`apps/web-blog/.gitignore` 已有 `src/http/__generated__/` 的排除模式，复用相同约定。

## Envelope 策略

后端统一返回 `{ status: 'success', code: 200, data: T }`。此结构必须写入 OpenAPI response schema，否则 `openapi-typescript` 生成的类型会直接是 `T`，与实际 HTTP 响应不匹配。

**在 `ApiDocPlugin` 中集中封装 envelope：** 所有 2xx response 的 schema 统一包裹为：

```ts
z.object({
  status: z.literal('success'),
  code: z.literal(200),
  data: ResponseSchema,
})
```

前端 typed API 层拿到的是 `{ status, code, data }` 结构，由适配器或 client 统一解包为 `data` DTO。业务代码不再接触 envelope。

## 后端规范要求

每个公开路由必须在路由装饰器的 `apiDoc` 中声明：

- `summary` 与 `tags`；
- 所有 path 参数的 `request.params`；
- 所有 query 参数的 `request.query`；
- 有 JSON body 的 `request.body`；
- 至少一个成功响应的 `responses[2xx]` 和 Zod schema（不含 envelope，由 `ApiDocPlugin` 包裹）；
- 预期且业务可处理的错误响应。

现有 `ApiDocPlugin` 的 Zod → OpenAPI 转换能力需要作为迁移前置检查项。生成器不完整时应先修正插件，并以快照测试覆盖 enum、optional/default、array、嵌套 object、path/query 参数和错误响应。

## 前端调用设计

在 `apps/web-blog/src/api/client.ts` 新增唯一的 typed API 入口：

```ts
import createClient from 'openapi-fetch';
import type { paths } from './__generated__/api';

export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  fetch: platformApiFetch,
});
```

`platformApiFetch` 是 `packages/http-client` 的适配器。它接收标准 `Request`/`RequestInit`，将请求委托给现有 client，并返回标准 `Response`。适配器必须保留：

- 认证 header 与刷新令牌；
- 请求超时、重试、去重、追踪 header；
- 统一的网络错误语义；
- 现有缓存策略（在调用层通过专用 helper 或 adapter 配置传递）。

业务代码使用规范中的 OpenAPI 路径，而不是自行拼接 URL：

```ts
const { data, error } = await api.GET('/posts/{slug}', {
  params: { path: { slug } },
});
```

`data` 是成功响应，`error` 是 OpenAPI 声明的非 2xx 响应。前端在 typed API 层集中解开 envelope，向页面提供 `data` DTO；不允许页面再写 `ApiResponse<T>` 或手写响应类型断言。

对于上传、下载、SSE 等非 JSON 接口，保留现有 `http-client` 调用，直到 OpenAPI 为其补足正确的 `content` 定义；这些例外必须列入迁移清单。

## 生成与 CI

新增以下确定性流程：

1. 导出脚本 import Hono 路由，调用 `exportOpenApiSpec()` 写入 `apps/platform-api/specs/openapi.json`。
2. `openapi-typescript` 读取该 JSON，输出 `apps/web-blog/src/api/__generated__/api.d.ts`。
3. 对输出执行格式检查与 `web-blog` typecheck。

脚本划分：

| 脚本 | 位置 | 作用 |
| --- | --- | --- |
| `platform-api:openapi:export` | `apps/platform-api/package.json` | import 路由 → 写入 `specs/openapi.json` |
| `web-blog:api:generate` | `apps/web-blog/package.json` | 读取 `specs/openapi.json` → 生成 `__generated__/api.d.ts` |
| `web-blog:api:check` | `apps/web-blog/package.json` | 生成后执行 `git diff --exit-code`，CI 门禁 |
| 根目录 `generate:api` | 根 `package.json` | 串联执行 `export` → `generate` |

生成文件应提交到版本库。这使前端编辑器、PR diff 和下游构建不依赖本地正在运行的 API；CI 则负责保证文件没有过期。

## `packages/api-contracts` 定位调整

`api-contracts` 不再是"前端共享类型包"，而是**"后端 Zod schema 的聚合导出"**，仅供 `ApiDocPlugin` 消费来生成 OpenAPI。前端不再直接从 `api-contracts` 导入类型。

- Phase 1：停止向 `api-contracts` 添加新 schema；现有 schema 保持不动。
- Phase 2：前端迁移过程中，逐步删除对 `api-contracts` 的直接导入。
- Phase 3：前端迁移完成后，评估 `api-contracts` 中是否有需要跨项目发布的 schema；无则删除整个包。

## 迁移阶段

### 第一阶段：建立可信生成链路

- 添加 `openapi-typescript` 与 `openapi-fetch`。
- 实现 `exportOpenApiSpec()` 脚本（import 路由，序列化 JSON）。
- 导出 OpenAPI、生成并提交 `api.d.ts`。
- 补齐或修复生成中暴露出的 OpenAPI schema 缺口。
- 建立 `platformApiFetch` 适配器及一组契约单元测试。
- 用 blog、post、auth 各迁移一个代表性端点验证成功、业务失败和认证失败路径。

完成标准：每次生成可重复；改变一个 controller 的 request/response schema 后，`api.d.ts` 会产生对应 diff，且前端类型检查能发现不兼容调用。

### 第二阶段：渐进替换前端调用

- 新增或改动接口一律使用 typed API client。
- 按模块迁移现有约 49 处 `http.get/post/put/...<ApiResponse<T>>` 调用。
- 删除已无引用的本地 DTO、路径常量和 `ApiResponse<T>` 泛型。
- 对异常响应显式处理 `error`，不将其当作成功 `data`。

完成标准：绝大多数 JSON API 调用不再携带手写请求/响应泛型；路径和参数来自 OpenAPI `paths` 类型。

### 第三阶段：收敛共享契约包

在第二阶段稳定后，评估每个 `packages/api-contracts` schema：

- 仅被同仓库前后端共享、且已由 OpenAPI 完整表达的 schema：移除，schema 回归后端模块；
- 需要跨项目发布或供非 HTTP 场景运行时验证的 schema：保留为独立领域包，并避免将其当作 HTTP 契约源。

删除 `api-contracts` 前必须先证明前端不再从中导入类型，且所有对应 API 都能从 OpenAPI 生成类型。

## 正确性与测试

编译期正确性：

- `api.d.ts` 由后端实际注册路由生成；
- 前端 typecheck 验证 URL、method、参数、body 和响应使用方式；
- CI 通过生成后无 diff 防止遗漏更新。

运行时正确性：

- 后端保留请求 Zod 验证；
- 为关键 response 在 controller/service 边界增加 Zod parse 或 safeParse，以发现服务实现与 schema 漂移；
- 添加集成测试：关键端点实际响应可通过其声明的 response schema；
- adapter 测试覆盖 envelope 解包、401 刷新、网络失败和非 JSON 响应。

OpenAPI 类型不能验证生产服务返回的字节内容；运行时 schema 测试是该缺口的补充。

## 风险与控制

| 风险 | 影响 | 控制措施 |
| --- | --- | --- |
| Zod 转 OpenAPI 转换不完整 | 生成类型错误 | 先补齐插件测试，再让生成物成为 CI 门禁 |
| 响应 envelope 与 schema 不一致 | 前端推导错误 | 在 ApiDocPlugin 集中封装 envelope，并做真实端点集成测试 |
| 替换 HTTP client 丢失认证/重试/缓存 | 行为回归 | 只写 fetch 适配层；先以代表性端点验证所有横切能力 |
| 大规模前端改动难以审查 | 迁移风险高 | 按领域模块拆分 PR；新旧调用并存，逐步删除 |
| 生成文件手改 | 下次生成丢失修改 | 文件头注明 Generated；CI 覆盖并检查 diff |

## 验收标准

- `pnpm` 单命令可从后端路由生成前端 `api.d.ts`，无需启动 HTTP 服务器或人工复制 JSON。
- Scalar、Swagger 和前端类型使用同一个 OpenAPI 输出。
- 修改后端请求/响应 schema 后，生成 diff 能准确反映契约变化。
- 前端调用错误路径、漏填必填参数或传入错误 body 时，TypeScript 编译失败。
- 前端仍保留已有鉴权、刷新令牌、缓存、重试、追踪与统一错误行为。
- `packages/api-contracts` 的删除只在前端迁移完成后进行，且不会引入第二份 HTTP schema。
