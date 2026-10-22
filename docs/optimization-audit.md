# app-repo 项目优化审计报告

- 仓库：<https://github.com/rx-ted/app-repo>
- 审计日期：2026-10-22
- 建议文件路径：docs/optimization-audit.md
- 范围：公开仓库 README、根目录与应用 package manifests、wrangler.jsonc、todo.md 等可读取文件。
- 重要说明：本文区分“已观察到的配置/文档事实”和“待源码验证的风险”。本轮没有运行项目测试、部署 Worker 或访问生产 D1/KV，不能把待验证项当作已确认 Bug。

## 1. 执行摘要

项目采用 pnpm + Turborepo 的 TypeScript monorepo，后端基于 Hono/自有 Honest DI 框架，前端使用 Vue 3，涉及 Cloudflare Workers、D1、KV 与 Durable Objects。仓库已有 Vitest、Playwright、OpenAPI 生成、类型检查和 Changesets 等工程基础。

建议优先级：

1. **P0：配置与 Secrets 管理**——检查公开 Wrangler 配置、生产密钥、日志脱敏和访问权限。
2. **P1：首屏性能与 SEO**——测量真实请求瀑布；评估公开页面预渲染/静态生成和缓存。
3. **P1：性能基线与可观测性**——拆分 DNS、TCP、TLS、TTFB、Worker 执行和下游 D1/KV 耗时。
4. **P1：D1/KV 缓存正确性**——验证缓存键、失效、击穿、并发回源和数据隔离。
5. **P1：统计写入可靠性**——验证计数幂等、缓冲 Flush 失败恢复和 Durable Object 热点。
6. **P2：安全、API 契约与测试**——将权限、速率限制、OpenAPI 一致性、迁移和 E2E 纳入 CI。
7. **P2：Monorepo 与文档治理**——整理检查脚本、任务缓存、TODO 和架构文档。

## 2. 具体发现与建议

### 2.1 P0 — 配置与 Secrets 管理

**已观察到：** wrangler.jsonc 的 vars 配置包含 SMTP 主机、端口、用户名、发件人地址和 GitHub OAuth Client ID 等字段。

**判断：** SMTP 主机、端口、发件人地址和 OAuth Client ID 通常是非秘密配置；SMTP 用户名虽然未必属于密码级秘密，但没有必要时也不宜暴露。仅凭该文件不能断定生产密码或 Token 已泄露。

**建议：**
- 真实的 SMTP 密码、OAuth Client Secret、签名密钥和 API Token 只通过 Cloudflare Secrets 或 CI Secret 注入。
- 将开发、预览、生产配置分离；确认 .env.example 只含占位符。
- 检查 Git 历史和 CI 日志是否曾包含真实凭据；若有，先轮换密钥，再处理历史。
- 验证管理接口的服务端权限和最小授权。

**验收标准：** 仓库、构建产物和日志中没有可用凭据；生产密钥由部署平台管理；轮换流程有记录。

### 2.2 P1 — 首屏性能与 SEO

**已观察到：** 前端采用 Vue 3；todo.md 记录站点信息通过 fetchSiteConfig() 请求 GET /api/v1/system/info，并由 SeoHead.vue 在 onMounted 时调用。Wrangler 配置启用了日志与 Trace 持久化，采样率为 1.0。

**风险/待验证：** 如果标题、描述、canonical、Open Graph 等元数据只能在客户端挂载后更新，原始 HTML 可能缺少最终 SEO 信息；如果首屏依赖多次串行 API 请求，也会产生请求瀑布。但现有资料不足以证明这就是生产慢的根因。

**建议：**
- 对首页、文章详情、归档、标签页分别测量 LCP、INP、CLS、JS 体积和 API waterfall。
- 构建时或 HTML 模板中注入可确定的站点名、描述、canonical 和 OG 信息，避免为了静态字段额外等待 API。
- 评估公开文章、归档、标签等页面使用 SSG/预渲染或 HTML 缓存；用户态、评论提交、点赞和管理功能继续走 API。
- 首屏仅请求必要字段；统计、在线状态、侧栏、评论等非关键内容延后加载。
- 静态资源使用内容哈希和长期缓存；HTML、公开 API、私有用户响应采用不同缓存策略，严禁共享缓存用户私有数据。
- 通过响应头和实际请求确认缓存是否命中，不要仅凭使用 Cloudflare 就认定边缘缓存已经生效。

**验收标准：** 保存优化前后指标；首屏关键路径没有不必要的串行请求；采用 SSG/SSR 时，最终 SEO 元数据可在原始 HTML 中查看。

### 2.3 P1 — DNS、TLS、TTFB 分开测量

此前一次 curl 结果约为：DNS 2.95s、TCP 建连累计时间 2.96s、TLS 完成累计时间 4.76s、TTFB 5.28s、总耗时 5.28s。差值显示主要时间花在 DNS 与 TLS/网络链路，TLS 完成后到首字节约 0.51s。单次测量不代表稳定基线，也不能证明 D1/KV 慢。

建议连续测量 10 次并记录：
- time_namelookup、time_connect、time_appconnect、time_starttransfer、time_total、HTTP 状态码。
- 正常网络、关闭 curl 代理变量后的网络，以及其他网络/地区的对照结果。注意 Clash TUN 模式可能不受 curl --noproxy '*' 影响。
- Worker 路由总耗时和下游调用耗时；不要记录 Token、Cookie、完整邮件地址或评论正文。

示例：

```bash
URL='https://你的域名/'
for i in {1..10}; do
  curl -sS -o /dev/null \
    -w 'DNS=%{time_namelookup}s TCP=%{time_connect}s TLS=%{time_appconnect}s TTFB=%{time_starttransfer}s Total=%{time_total}s HTTP=%{http_code}\n' \
    "$URL"
done
```

这些 curl 时间是累计值，可近似用 TCP-DNS、TLS-TCP、TTFB-TLS 观察各阶段增量；它不能单独拆出纯 Worker 执行时间。

### 2.4 P1 — D1/KV 缓存键、失效和查询

**已观察到：** 项目使用 D1、KV 与 Durable Objects；todo.md 记录文章日历缓存及写入后的失效逻辑。

**待验证风险：**
- 缓存 key 是否覆盖分页、排序、分类、标签、语言和发布状态等所有查询条件。
- 发布、撤回、编辑、删除及标签/分类变化后，详情、列表、归档、日历缓存是否全部失效。
- 是否存在缓存击穿、并发回源、旧值覆盖新值或跨用户数据泄漏。
- D1 是否只读取必要字段、分页是否稳定、过滤和排序字段是否有索引、是否存在 N+1 查询。

**建议：**
- 先按端点统计 D1 查询次数/耗时、KV hit/miss 和总延迟，再决定是否增加缓存。
- 对公开文章元数据、标签、分类和归档采用可控 TTL 与明确的失效策略；文章正文可考虑以 slug + 内容版本为缓存键。
- 将缓存 key 生成和失效入口集中管理，并为编辑/发布/删除建立测试矩阵。
- 区分匿名公开读取与私有用户读取；检查所有共享缓存的缓存控制头。
- 对热点 key 评估请求合并与回源并发限制，并通过测试验证 KV 的一致性边界。

**验收标准：** 缓存命中率、数据库读次数和 p95 延迟有前后对比；内容更新在约定时间内可见；不存在跨用户缓存泄漏。

### 2.5 P1 — 文章统计与缓冲写入可靠性

**已观察到：** 项目配置了 COUNTER_DO Durable Object；todo.md 提到 StatsBufferService 和统计缓冲/批量写入设计。

**待验证风险：** 并发、重复请求、Flush 失败、实例重启和失效顺序可能造成计数丢失或重复。现有资料不能证明这些问题已经发生。

**建议：**
- 明确浏览、点赞和评论计数的语义：浏览是否去重、点赞是否幂等、评论计数是否以数据库记录为准。
- 为可重试事件设计幂等键或事件 ID，避免重试重复计数。
- 明确 Flush 失败后的重试、持久化兜底、告警和重建机制；确认内存缓冲可能丢失的窗口。
- 明确计数更新与文章缓存失效的顺序，防止旧缓存覆盖新统计。
- 对热门文章和突发流量压测 Durable Object 热点，并提供计数与数据库基准值的周期性校验脚本。

**验收标准：** 并发和失败注入测试中，计数误差符合明确阈值；重复事件不会重复计数；Flush 失败可观测且可恢复。

### 2.6 P1 — 日志、Trace 成本与隐私

**已观察到：** Wrangler 配置启用了日志和 Trace 持久化，采样率为 1.0。

建议：
- 按流量和排障需要制定生产采样率；错误和慢请求可提高采样，普通成功请求可以降低。
- 对 IP、UA、Cookie、Authorization、邮箱、评论正文、OAuth 回调参数等敏感字段默认脱敏。
- 业务审计事件与 Trace 分离；明确日志保留期限、访问权限和成本告警。
- 用压测验证日志/Trace 是否造成不必要的成本或噪声。

**验收标准：** 有采样、脱敏、保留期限和访问权限规范；常规日志不含凭据和不必要的个人数据。

### 2.7 P2 — API 合约与日期时间语义

**已观察到：** 项目包含 OpenAPI 生成和 check:api 相关流程；todo.md 记录过用户字段命名和登录响应等 API 变化。

建议：
- 将 OpenAPI 导出、前端 API 类型生成和差异检查纳入 CI。
- 对认证、文章、评论、权限、分页和错误响应建立契约测试。
- API 变更采用兼容迁移：先新增/弃用，再更新客户端，最后删除旧字段或端点。
- 时间戳使用明确的 ISO 8601 语义（建议 UTC 存储和传输），展示层再本地化；不要依赖 Worker 或数据库默认时区。
- 统一错误格式、分页格式、字段命名和输入校验规则。

**验收标准：** API schema 与生成类型不一致时 CI 失败；关键端点有契约测试和可追溯的变更记录。

### 2.8 P2 — 安全检查清单

以下是待验证的控制项，不代表已确认存在漏洞：

- [ ] CORS 仅允许必要的前端域名；凭据请求不搭配宽松通配源。
- [ ] 登录、注册、邮件、评论、点赞、搜索和管理 API 有适当的速率限制。
- [ ] Cookie 的 HttpOnly、Secure、SameSite 属性与认证方案匹配。
- [ ] 每个写入和管理 API 都在服务端检查授权，而非只依赖前端隐藏按钮。
- [ ] Markdown/HTML 渲染有 XSS 防护，链接和图片遵循明确的安全策略。
- [ ] OAuth state、回调域名和重定向 URL 有校验；日志不记录授权码或 Token。
- [ ] 上传接口限制文件大小、MIME、扩展名和数量；对象存储读写权限分离。
- [ ] 依赖漏洞扫描、自动更新 PR 和锁文件变更检查已纳入维护流程。

### 2.9 P2 — 测试与 CI 门禁

**已观察到：** 仓库已有 Vitest、Playwright、E2E、OpenAPI 生成和类型检查相关脚本。

建议 CI 明确覆盖：
- lint、typecheck、unit tests、构建和 OpenAPI 生成一致性。
- E2E：匿名阅读、登录/登出、权限拒绝、文章创建/编辑/删除、评论提交、缓存失效和速率限制。
- D1 迁移从空库初始化、从旧版本升级，以及恢复演练。
- D1/KV/DO 集成测试，避免只有 mock 测试通过而生产绑定行为不同。
- 生成文件差异检查，避免开发者本地生成但忘记提交。

### 2.10 P2 — Monorepo 构建与依赖维护

**已观察到：** 根项目使用 pnpm 11、Node >=24.14.1 和 Turborepo；package.json 的 check 命令会执行 biome check . --fix。

建议：
- 统一本地与 CI 的 Node/pnpm 版本。
- 将只读检查和自动修复分开：CI 使用不修改工作区的检查命令，开发者需要时再显式运行 --fix。
- 检查 Turbo pipeline 的 inputs、outputs 和任务依赖，避免漏构建或错误命中缓存。
- 为共享 packages 明确 exports、类型入口、运行时兼容范围，并测试实际支持的 Worker/Node 等环境。
- 定期检查重复依赖版本、过期包和不必要的浏览器端依赖。
- 确认清理脚本的影响范围，不把可能删除忽略文件的命令作为不透明的常规前置步骤。

### 2.11 P2 — TODO 和设计文档治理

**已观察到：** todo.md 混合 Pending、已实现功能核对、API 变更记录和设计历史，部分内容来自较早的代码核对。

建议：
- 将路线图、架构决策、运维手册分开维护；todo.md 保留待办索引。
- 每个任务补充优先级、验收标准、关联 Issue/PR 和最后验证日期。
- 将已完成的设计决策迁移到架构文档，清理过时路径、已删除 API 和重复设计方案。
- 对 API 变更用 Changesets 或版本化迁移说明记录。

## 3. 建议实施顺序

| 阶段 | 工作 | 目标 |
|---|---|---|
| 1 | Secrets 审查、日志脱敏、采样策略 | 降低泄露风险与观测成本 |
| 2 | 建立性能基线，测首页/文章页请求瀑布与 API span | 找到首屏慢的真实瓶颈 |
| 3 | 优化静态 meta、首屏请求、公开页面缓存/预渲染 | 改善首屏、SEO 和公开页面 TTFB |
| 4 | 审查 D1 查询、索引、缓存 key/失效与统计 Flush | 降低读延迟并提高数据一致性 |
| 5 | 安全检查、API 契约、迁移测试和关键 E2E | 降低回归和部署风险 |
| 6 | 整理 TODO、依赖、构建任务与文档 | 降低长期维护成本 |

## 4. 建议补充的可观测字段

只记录不含敏感数据的结构化字段：
- route、method、status、duration_ms
- cache_status（hit/miss/bypass）
- db_query_count、db_duration_ms
- kv_operation_count、kv_duration_ms
- trace_id，以及平台确实提供时的 region

不要将 Cookie、Authorization、完整请求体、评论正文或邮件地址写入常规日志。

## 5. 审计边界

本报告基于公开仓库中可读取的文档和配置文件整理。没有完整审查每个源码文件，没有运行 pnpm install/build/test，没有部署 Worker，也没有读取生产 D1/KV 数据。因此，缓存正确性、统计可靠性和安全清单中的部分项目是**待验证风险**，不是已确认 Bug。建议先取得可重复的性能和正确性基线，再按优先级实施，不建议在证据不足时大规模重写架构。

## 6. 参考文件

- [README.md](https://github.com/rx-ted/app-repo/blob/main/README.md)
- [package.json](https://github.com/rx-ted/app-repo/blob/main/package.json)
- [apps/platform-api/package.json](https://github.com/rx-ted/app-repo/blob/main/apps/platform-api/package.json)
- [apps/web-blog/package.json](https://github.com/rx-ted/app-repo/blob/main/apps/web-blog/package.json)
- [wrangler.jsonc](https://github.com/rx-ted/app-repo/blob/main/wrangler.jsonc)
- [todo.md](https://github.com/rx-ted/app-repo/blob/main/todo.md)
