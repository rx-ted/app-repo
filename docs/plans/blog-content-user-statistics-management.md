# 博客文章、用户与统计管理方案

> 状态：方案设计（待实施）
>
> 目标：在现有 Cloudflare Workers + D1/KV + GitHub Actions 架构中，实现 Markdown 文章管理、用户认证、文章统计与 Gitalk 评论代理。

## 1. 设计目标与原则

- GitHub 是文章 Markdown 源文件的持久化存储与版本历史来源。
- Cloudflare Workers 提供前后端分离的 API；浏览器不得持有 GitHub App 私钥、安装 Token 或其他服务端凭据。
- D1 保存关系型、需要一致性约束的数据；KV 保存适合缓存、短期凭据和近实时计数的键值数据。
- 浏览器 localStorage 只保存当前设备的草稿和非敏感偏好，不作为已发布文章、用户账户或权威统计数据的唯一来源。
- 文章发布、构建、部署、索引更新应有明确状态、失败反馈、幂等机制和审计记录。
- 最小化第一期范围，避免过早实现不必要的个人资料字段和复杂统计。

## 2. 总体架构

1. 前端：公开博客、管理后台、Markdown 编辑器、用户中心。
2. Cloudflare Worker：认证、权限检查、文章 CRUD、GitHub API 调用、统计 API、Gitalk 凭据代理。
3. GitHub 内容分支：存放已提交的文章 Markdown 源文件。
4. GitHub Actions：监听内容分支的文章路径变更，校验文章，构建和部署，并更新文章索引。
5. Cloudflare D1：用户、身份绑定、文章索引、标签分类、幂等事件、需要事务保证的数据。
6. Cloudflare KV：缓存、短期 GitHub App installation token、可接受短暂延迟的计数缓存或计数分片。
7. Gitalk：使用固定 slug 绑定 GitHub Issue 评论，评论数据由 GitHub 管理。

建议流程：

```text
Browser
  ├── public pages / admin UI
  └── HTTPS API
         └── Cloudflare Worker
              ├── D1: users, identities, post index, idempotency
              ├── KV: cache, short-lived credentials, counters (if needed)
              └── GitHub API: read/write Markdown on content branch

GitHub content branch (posts/**)
  └── GitHub Actions
       ├── validate changed Markdown and metadata
       ├── build static site / content index
       ├── deploy to Cloudflare
       └── update index or report failure

Gitalk UI ── Worker proxy ── GitHub API / GitHub Issues
```

## 3. 文章存储与发布

### 3.1 分支和目录

使用独立的内容分支，例如 `docs`，文章统一放在该分支的 `posts/` 目录：

```text
docs branch
└── posts/
    ├── hello-world.md
    ├── cloudflare-workers.md
    └── embedded/
        └── ch32-debugging.md
```

约定：
- 文章文件名采用稳定 slug，例如 `cloudflare-workers.md`。
- slug 一经发布默认不可变，避免文章 URL、Gitalk 评论和统计主键发生漂移。
- slug 不允许路径穿越、空字符串或未经规范化的路径。
- 封面图片优先使用现有图片资源托管方案（例如 R2 或已有静态资源目录），Markdown 中只存储 URL/资源标识；避免将大型二进制图片 Base64 塞进 Markdown。
- 草稿不提交到公开内容分支。第一期可保存在 localStorage；若需要跨设备草稿，应另行增加服务端草稿存储。

注意：分支名是 `docs`，不等于仓库中的 `docs/` 目录。GitHub Actions 工作流文件仍应存在于默认分支的 `.github/workflows/` 中，并监听内容分支的 push 事件。

### 3.2 Front Matter 规范

示例：

```yaml
---
title: "Cloudflare Workers 入门"
slug: "cloudflare-workers"
summary: "介绍 Worker 的基本架构与部署流程。"
tags:
  - Cloudflare
  - Workers
categories:
  - Engineering
cover: "https://example.com/images/cloudflare-workers.webp"
authorId: "user_01..."
status: "published"
publishedAt: "2026-10-28T10:00:00Z"
updatedAt: "2026-10-28T10:00:00Z"
---
```

要求：
- `title` 必填；`slug` 必须唯一；`status` 仅允许约定值，如 `draft`、`published`、`archived`。
- `tags`、`categories` 使用规范化字符串或稳定 ID，并限制数量和长度。
- `summary`、封面 URL、日期均需校验。
- 前端提交的 `authorId` 不能被信任为权限依据；服务端从已认证身份确定作者。
- 只把 `status: published` 且通过校验的文章输出到公开站点。
- 若内容分支只保存已发布文章，`draft` 应仅作为管理后台草稿状态或未来服务端草稿的状态，不要让草稿被静态构建公开。

### 3.3 CRUD 与发布流程

- Create：校验身份和权限、slug、Front Matter 与正文，调用 GitHub Contents API 创建文件。
- Read：公开页面读取构建后的内容或安全缓存；管理后台可读取内容分支源文件。
- Update：先获取当前文件的 blob SHA，再更新文件；使用 SHA 防止覆盖并发修改。
- Delete：需要二次确认；删除前检查当前 SHA，并生成审计事件。建议提供归档/软删除选项，避免误删。
- Publish：校验文章，写入内容分支；以 GitHub commit 成功为提交成功，再等待 Actions 构建与部署完成。
- Unpublish：移除公开发布状态或将文件移出发布范围，触发重建。明确是否保留源文件。
- 发布按钮应展示状态：保存中、已提交、构建中、已部署、失败。GitHub commit 成功不代表网站已部署成功。

### 3.4 GitHub Actions 触发和构建

- 默认分支的工作流监听 `docs` 分支的 `posts/**` 路径变更。
- 对比 push 的 before/after commit，检查新增、修改、删除和重命名的文件；不要只比较某个文件的内容 hash。
- 对文章变更做 Front Matter 校验、slug 唯一性检查、链接和资源检查（可分阶段启用）。
- 只有发布文章进入公开构建。
- 对连续提交启用并发控制或合并构建，避免并行部署相互覆盖。
- 部署失败必须保留 Actions 日志并提供可查询状态；不要把“触发构建”当成“构建成功”。
- Actions 使用最小权限的 GitHub Token；若需要跨分支访问，显式 checkout 指定内容分支。
- GitHub push 事件不会因为“hash 不匹配”自动触发；实际触发依据是提交事件和路径过滤。hash 用于识别变更、去重或校验。

## 4. 前端文章管理

### 4.1 编辑器

支持：
- 标题、正文、标签、分类、封面、摘要。
- Markdown 编辑与预览；保存前校验 Front Matter。
- 自动保存本地草稿、恢复上次编辑内容。
- 发布前预览、发布确认、部署状态提示。
- 编辑冲突检测：读取文件 SHA，更新时提交旧 SHA；冲突后提示用户重新加载或比较差异，不静默覆盖。

### 4.2 草稿箱

第一期使用 localStorage：
- 保存草稿列表、正文、元信息、更新时间、草稿 ID。
- 草稿按用户 ID 或本地 profile 分区，避免同一浏览器多用户串稿。
- 设置版本号、数据迁移和容量限制；定期清理已发布且确认无需保留的临时草稿。
- 不存储访问令牌、密码、GitHub App 凭据或其他敏感数据。
- localStorage 不能跨设备同步，清理浏览器数据也可能丢失；需要可靠备份时增加服务端草稿 API。

### 4.3 文章列表和详情

- 已发布文章列表支持分页、标题搜索、标签/分类筛选、时间排序。
- 管理列表显示发布状态、更新时间、作者、部署状态。
- 公开详情显示标题、正文、作者、发布时间、标签、分类、封面和摘要。
- 浏览量、点赞量、收藏量、评论量由统计 API 返回，不能把前端本地计数当作权威值。
- 统计数据与 Markdown 内容解耦，避免每次浏览量变化都触发 GitHub commit 和静态网站构建。

## 5. 用户管理与认证

### 5.1 第一阶段功能

- 邮箱注册和验证。
- 登录：邮箱/用户名以及受支持的 SSO/OAuth 登录。
- 退出登录。
- 修改密码、修改昵称、修改个人简介。
- 绑定/解绑 GitHub、Google 等第三方身份。
- 个人资料字段：稳定用户 ID、昵称、简介、创建时间、更新时间。
- 其他字段（头像、手机号、职业、教育、兴趣、荣誉等）暂不纳入第一期。

### 5.2 身份模型

不要将用户名、邮箱或 OAuth provider 的用户名作为主键。建议：
- `users`: 内部不可变 `id`、昵称、简介、状态、时间戳。
- `user_identities`: `user_id`、`provider`、`provider_subject`、邮箱验证状态、绑定时间。
- 对 `(provider, provider_subject)` 建唯一约束。
- 邮箱规范化并建立合适的唯一约束；未验证邮箱不应直接用于账号恢复或高权限操作。
- 第三方身份绑定必须先验证当前账户，再完成新身份的 OAuth 验证；禁止仅凭相同邮箱自动合并账号。

### 5.3 Token 与会话安全

- “Token 默认延长 7 天”建议定义为可配置的会话策略，而不是无限期刷新 access token。
- 使用短期 access token 和可撤销、轮换的 refresh token 或安全的服务端会话。
- 若采用 Cookie 会话，优先使用 `HttpOnly`、`Secure`、合适的 `SameSite` 设置，并防范 CSRF。
- refresh token 应轮换、可撤销，并检测旧 token 重用；退出时撤销会话。
- 密码使用经过审查的密码哈希方案存储，不能明文或可逆加密存储。
- 登录、注册、密码重置、邮箱验证和 OAuth 回调应进行速率限制和状态/nonce 校验。
- GitHub App 私钥、客户端密钥和服务端 Token 只能保存在 Worker Secrets 或其他服务端密钥管理机制中，不能写入前端 bundle、KV 明文或 Git 仓库。

## 6. 统计管理与数据分层

### 6.1 统计对象

| 对象 | 建议存储 | 说明 |
|---|---|---|
| authors | D1 | 作者基本信息；文章数可从索引统计或维护聚合值 |
| posts | D1 索引 + GitHub Markdown | 标题、slug、作者、分类、发布时间、内容 SHA、状态等 |
| tags | D1 | 标签元信息、文章关联数量 |
| categories | D1 | 分类元信息、文章关联数量 |
| views | D1 或 KV 计数方案 | 每篇文章总浏览量，不记录具体用户的浏览历史 |
| likes | D1 事件/计数，或 KV 聚合 | 若允许每人仅点赞一次，需要用户/匿名标识去重 |
| favorites | D1 | 可选；若需要查看“我的收藏”，必须记录用户与文章的关系 |
| comments | GitHub Issues/Gitalk 为来源，D1 可缓存汇总 | 统计评论量，不复制完整评论正文 |

### 6.2 D1 与 KV 的职责

D1 更适合：
- 用户、身份绑定、权限关系。
- 文章索引、标签分类关系和唯一约束。
- 需要事务或幂等保证的点赞/收藏记录。
- 构建任务状态、审计记录、事件去重记录。

KV 更适合：
- 可接受短暂陈旧的缓存。
- GitHub App installation token 等短期凭据缓存。
- 计数缓存或分片计数（须设计聚合与持久化策略）。

重要：Cloudflare KV 是最终一致的键值存储，不适合直接作为严格原子递增计数器，也不保证全局实时一致。若浏览量不能丢失，不应仅执行 KV 的读取-加一-写回；应采用 D1 的原子更新/事件记录，或使用具备原子操作能力的计数方案，并进行压测验证。

### 6.3 浏览量

- 只统计每篇文章的总浏览量，不建立可识别的用户浏览历史。
- 由 Worker 统一处理计数，前端不得直接写入计数值。
- 明确一次浏览的定义：例如排除预取、机器人和重复刷新，采用短时间窗口去重。
- 可通过短期匿名去重键降低重复计数；避免保存 IP 等个人数据，除非有明确的必要性、保留期限和隐私说明。
- 若采用异步批量聚合，需要定义可接受的数据延迟、丢失风险和补偿机制。

### 6.4 点赞和收藏

点赞与收藏应区分：
- **点赞量**：展示文章收到的点赞总数。
- **点赞关系**：如果要支持取消点赞或防止重复点赞，必须记录主体与文章的关系，不能只维护总数。
- **收藏量**：如果要提供用户的收藏列表，必须持久化 `user_id + post_id` 关系；仅有总数无法恢复用户收藏列表。
- 对匿名用户，可在产品规则中选择不支持点赞/收藏，或使用经过设计的匿名标识；不能声称严格“一人一次”却没有可靠去重依据。

### 6.5 标签、分类、作者和文章数量

- D1 保存规范化的文章与标签/分类关联。
- 文章发布、下架、删除或更改标签时，保证关联与聚合数量更新。
- 对计数缓存设计定期重算/校验任务，避免失败后出现永久偏差。
- 避免在前端维护权威文章数或标签数。

## 7. Gitalk 评论系统与 GitHub App Token 代理

目标：前端使用 Gitalk，按稳定 slug 关联评论；浏览器不接触 GitHub App 私钥。

建议流程：
1. Worker 使用 GitHub App 私钥签发短期 JWT。
2. Worker 通过 GitHub App installation access token API 获取 installation token。
3. 将 token 缓存到 KV，TTL 不超过 GitHub 返回的过期时间，并预留时钟偏差；在有效期内复用，临近过期时重新获取。
4. 只在服务端使用 token；前端通过 Worker 代理访问明确允许的 GitHub API 路径。
5. 对代理实施严格的路径/方法白名单、参数校验、速率限制、CORS 与权限检查，禁止开放任意 GitHub API 转发。
6. 过期或授权失败时重新申请 token；若 GitHub 返回权限错误，应返回明确错误并记录脱敏日志。
7. 通过 GitHub App 安装权限最小化限制仓库范围与 Issues 读写能力。

安全与兼容性注意：
- Gitalk 的 OAuth/评论授权流程与 GitHub App installation token 并不等价。需要先验证所选 Gitalk 版本和配置是否支持预期的代理方式；不能假设把任意 installation token 返回给浏览器就能完成所有 Gitalk 操作。
- 优先让 Worker 代理所需 API 调用，不向浏览器暴露服务端凭据。
- installation token 只缓存到其实际过期时间，KV 的 TTL 到期删除属于缓存失效机制，不等于凭据主动撤销。
- Gitalk 的 `id` 使用稳定且规范化的文章 slug；slug 修改时需制定迁移策略，否则会关联到不同 Issue。
- GitHub Issues 有数量、速率和权限约束，应提供错误提示、缓存和降级行为。
- 评论总数可通过 GitHub API 查询后缓存，或由可靠的同步任务维护；避免每次文章浏览都直接请求 GitHub API。

## 8. API 草案

所有管理接口均需认证与权限校验；公开读取接口按需开放。

### 文章
- `GET /api/posts`：分页、搜索、标签/分类筛选。
- `GET /api/posts/:slug`：公开文章详情。
- `POST /api/admin/posts`：创建文章。
- `PUT /api/admin/posts/:slug`：更新文章，要求提交期望的内容 SHA 或版本号。
- `DELETE /api/admin/posts/:slug`：删除/归档文章。
- `POST /api/admin/posts/:slug/publish`：发布。
- `POST /api/admin/posts/:slug/unpublish`：取消发布。
- `GET /api/admin/deployments/:id`：查询构建部署状态。

### 用户
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `POST /api/auth/password/change`
- `GET /api/me`
- `PATCH /api/me`
- `POST /api/auth/oauth/:provider/start`
- `GET /api/auth/oauth/:provider/callback`
- `POST /api/me/identities/:provider/link`
- `DELETE /api/me/identities/:provider`

### 统计和评论
- `POST /api/posts/:slug/views`
- `POST /api/posts/:slug/likes`
- `DELETE /api/posts/:slug/likes`
- `POST /api/posts/:slug/favorite`
- `DELETE /api/posts/:slug/favorite`
- `GET /api/posts/:slug/stats`
- `GET /api/comments/:slug`（若 Worker 负责代理/汇总）
- `POST /api/comments/:slug`（仅在所选 Gitalk 集成确实需要且设计允许时启用）

API 路径仅为设计草案；应与现有路由约定统一，避免重复实现已有认证或文章接口。

## 9. 权限、验证和错误处理

- 明确区分公开读取、登录用户操作和管理员操作。
- 不信任浏览器提交的作者 ID、角色、文章状态或统计数字。
- 对输入做 schema 校验、长度限制、slug 规范化和 Markdown 元数据校验。
- GitHub 写入时使用当前 SHA 防止并发覆盖；同一路径写操作应串行处理。
- 通过幂等键或事件 ID 避免重试导致重复计数、重复发布和重复审计事件。
- 对 GitHub API、D1、KV 的限额与故障定义重试、退避、超时和用户可见错误。
- 记录发布、删除、身份绑定、密码变更等关键审计事件，但不记录密码、完整 token 或私钥。
- 对 Markdown 渲染进行 XSS 防护；若允许 HTML，必须采用安全的 sanitization 策略。
- 配置 CORS、CSRF、防暴力登录、速率限制与安全响应头。

## 10. 测试与验收标准

### 文章
- 创建、读取、更新、删除、发布和取消发布均正确操作指定内容分支。
- 无效 Front Matter、重复 slug、非法路径被拒绝。
- 两个编辑会话更新同一文件时，冲突不会静默覆盖。
- 草稿不会出现在公开站点；发布后构建成功才显示“已部署”。
- 删除或重命名文章时，静态路由、索引和 Gitalk slug 行为符合约定。

### 用户
- 邮箱验证、登录、退出、密码修改和 OAuth 回调流程可用。
- 过期/撤销会话不可继续访问管理 API。
- 身份绑定不能被其他用户抢占；邮箱未验证时不允许高风险恢复操作。
- 前端构建产物、日志和公开 API 响应中不存在 GitHub App 私钥或服务端 Token。

### 统计
- 浏览量规则有明确去重定义；重复请求不会超出设计预期。
- 点赞/收藏重复操作符合幂等规则。
- 评论统计与 GitHub Issues 状态保持可接受的一致性。
- KV/D1 故障或限额触发时返回可理解错误，并有可观测日志。
- 能定期重算或校验文章、标签、分类和作者聚合数据。

### 构建部署
- 只修改内容分支的 `posts/**` 时触发工作流。
- 无关路径不触发文章构建（除非另有工作流需求）。
- 构建失败可查询；并发提交不会导致旧版本覆盖新版本。

## 11. 实施阶段

### P0：梳理现有项目
- 检查现有文章路由、认证实现、D1 schema、KV bindings、Wrangler 配置、GitHub Actions 和部署流程。
- 确认内容分支命名、静态构建输入、发布状态和 slug 规则。
- 不重复创建已有的模块、表和 API。

### P1：文章最小闭环
- Markdown/Front Matter schema。
- GitHub Contents API CRUD 与 SHA 冲突检测。
- 管理后台编辑器、本地草稿箱、文章列表和预览。
- 内容分支 push 触发校验、构建与部署。
- 展示提交、构建和部署状态。

### P2：用户与权限
- 注册/邮箱验证/登录/退出/会话续期。
- 修改密码、昵称、简介。
- GitHub/Google 身份绑定与解绑。
- 管理 API 权限检查和审计日志。

### P3：统计
- D1 文章索引、标签分类关系。
- 浏览量采集与去重。
- 点赞与收藏（明确匿名/登录用户规则）。
- 文章统计 API、聚合校验任务。

### P4：Gitalk
- 确认 Gitalk 的授权机制和部署版本。
- GitHub App 最小权限、Worker 代理、installation token KV 缓存。
- slug 关联、评论计数缓存、限流和错误处理。

### P5：强化
- 安全测试、并发测试、配额与失败恢复测试。
- 构建任务可观测性、数据重算和备份/恢复演练。
- 根据实际使用量评估是否需要 Durable Objects、队列或独立统计管道。

## 12. 主要决策总结

1. GitHub Markdown 是文章内容的权威来源；D1 是索引和关系数据的权威来源。
2. GitHub Actions 的触发依据是 push/路径过滤；hash 比较用于识别变更，不是触发机制本身。
3. 不要将所有统计计数直接用 KV 的读改写实现；必须考虑原子性、丢失、重复和最终一致性。
4. 需要“我的收藏”、防重复点赞或撤销点赞时，必须保存关系数据。
5. 七天会话续期需要定义清楚；使用可撤销、轮换的会话机制，而不是无限期延长单个 access token。
6. GitHub App installation token 不等于 Gitalk 的所有授权凭据；先验证 Gitalk 集成方式，再实现代理。
7. 先完成文章 CRUD、发布状态与部署闭环，再逐步加入认证、统计和评论代理，降低一次性实现风险。
