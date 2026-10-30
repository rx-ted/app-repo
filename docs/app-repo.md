# rx-ted/app-repo 博客系统：现状审查、优化建议、评论与 GitHub 集成方案

> 仓库：[https://github.com/rx-ted/app-repo](https://github.com/rx-ted/app-repo)（分支 `main`）
> 整理日期：2026-10-30
> 文档性质：架构审查与实施建议，**不是代码提交记录**。本文没有修改仓库文件、创建分支、提交 commit 或发起 PR。
> 说明：文中代码路径与现状结论基于审查时的 `main`，真正动手前应以最新代码再复核一次。
> 更新：2026-10-30 增补 GitHub 集成 API（token/KV、仓库文件 CRUD、Discussion CRUD、discover 缓存、guestbook 改造）。

---

## 0. 文档说明

本文整理而成，并补充了后续确认的 GitHub 集成 API 设计：

| 内容侧重                                                              |
| --------------------------------------------------------------------- |
| 整体项目审查：安全问题、缓存、数据库与 API 性能、业务模块、前端       |
| 评论系统专项：Gitalk 2.0 + GitHub Discussions，以及由此带来的整体调整 |

合并后的结构：先讲现状与总体判断，再按 **安全 → 评论系统 → GitHub 集成 API → 缓存 → 数据库/API → 前端 → 业务模块** 展开，最后给出目标架构、分阶段清单、验收标准和风险取舍。

本次新增需求的落点：

|                                    需求                                     | 对应章节 |
| :-------------------------------------------------------------------------| :------ |
| GitHub App 已建，只需申请 token 并存入 KV `github:{username}`，TTL 1h or 8h |   4.2    |
|                          仓库某个文件支持 CRUD API                          |   4.3    |
|                Discussion 某条支持 CRUD，并标注对应 blog URL                |   4.4    |
|      discover 页面 KV 优先，未命中读 D1 并回写 KV，并且新增评论Gitalk       |   4.5    |
|                  guestbook 留言改用 Gitalk，不再自定义评论                  |   4.6    |

---

## 1. 总体判断

项目是一个以 TypeScript 为主的博客平台 monorepo，已有较完整的业务基础，**不建议推倒重写**。

| 层次        | 当前技术                                          |
| ----------- | ------------------------------------------------- |
| API         | Hono + Honest DI / honest plugins                 |
| ORM         | Drizzle ORM                                       |
| 数据库      | Cloudflare D1（优先）/ MySQL / SQLite             |
| 缓存        | Redis / Cloudflare KV / Local                     |
| 前端        | Vue 3 + Pinia + Vue Router                        |
| UI          | Naive UI                                          |
| 编辑器      | 独立 Markdown Editor                              |
| GitHub 集成 | GitHub App（REST 文件操作 + GraphQL Discussions） |
| 工程        | pnpm workspace + Turborepo + Biome + Vitest       |
| 部署方向    | Cloudflare Workers / D1                           |

已有业务模块：文章、用户、认证、Session、评论、通知、搜索、文章统计、分类、标签、权限、公告，以及 discover、留言板等页面。

优化目标分三块：

1. **业务完整性**：文章、用户、通知、写作、Session 形成闭环。
2. **读取性能**：减少数据库查询、避免重复计算、建立合理缓存策略。
3. **架构质量**：提高模块间一致性、可靠性和可维护性。

**推荐推进顺序**：先修数据隔离、缓存键、SQL 参数化和事务边界 → 再做评论系统替换与 GitHub 集成 → 然后优化读取性能 → 最后补业务体验。

---

## 2. 最高优先级：安全与数据正确性（P0）

### 2.1 通知必须按用户隔离

涉及文件：

- `apps/platform-api/src/modules/notification/notification.controller.ts`
- `apps/platform-api/src/modules/notification/notification.service.ts`
- `apps/platform-api/src/modules/notification/entities/notification.entity.ts`

问题：通知表已有 `userId`，但当前实现中：

- `listMine()` 没有按当前用户筛选；
- `getSummary()` 统计的是所有用户的通知；
- `markAllRead()` 会修改所有用户的通知；
- `markRead(id)` 没有校验通知归属；
- 缓存 Key 是全局的 `notifications:list`、`notifications:summary`。

多用户环境下会造成**通知泄露和跨用户修改**。

建议：

1. Controller 只从已验证的登录上下文取 `userId`，不信任客户端传入的任意 userId。
2. Service 显式接收 userId：

   ```ts
   listMine(userId);
   getSummary(userId);
   markAllRead(userId);
   markRead(userId, notificationId);
   ```

3. 查询统一带上 `eq(notifications.userId, userId)`。
4. 更新单条通知时同时限定 `id` 和 `userId`。
5. 缓存 Key 包含用户 ID：

   ```text
   notification:list:{userId}:{page}:{pageSize}
   notification:summary:{userId}
   ```

6. `markAllRead` 只失效当前用户的缓存。
7. 补跨用户访问测试（A 用户不能读到/改到 B 用户的通知）。

> 这是本轮最先应处理的安全问题。

### 2.2 搜索缓存 Key 不完整

涉及文件：`apps/platform-api/src/modules/blog/blog.service.ts`、`PostRepository.list`。

`search()` 实际参数包括：`keyword`、`tag`、`category`、`author`、`excludeSlugs`、`page`、`pageSize`（可能还有排序、语言等）。但缓存 Key 只用了：

```ts
`blog:search:${params.keyword ?? ""}:${page}:${pageSize}`;
```

结果：不同标签/分类/作者的请求会命中同一份缓存。`PostRepository.list()` 的 Key 也漏了 `excludeSlugs`。

建议：

- 所有影响结果的参数先规范化；
- 稳定序列化（stable stringify）后计算 hash；
- 数组参数排序/去重；
- 排序字段、排序方向、权限范围、语言一并纳入；
- 私有查询不能写进公共缓存。

```ts
const cacheInput = {
  keyword: normalizeKeyword(query.keyword),
  tag: query.tag ?? null,
  category: query.category ?? null,
  author: query.author ?? null,
  excludeSlugs: [...new Set(query.excludeSlugs ?? [])].sort(),
  page: query.page ?? 1,
  pageSize: query.pageSize ?? 20,
  sort: query.sort ?? "publishedAt:desc",
};

const cacheKey = `blog:search:${stableHash(cacheInput)}`;
```

### 2.3 SQL 条件必须参数化

涉及文件：`apps/platform-api/src/modules/search/search.service.ts`。

审查发现类似写法：

```ts
sql`${postCore.slug} NOT IN (${params.excludeSlugs.join(",")})`;
```

用户可控值直接拼进 SQL，存在注入风险。

建议改用 Drizzle 参数化表达式：

```ts
notInArray(postCore.slug, params.excludeSlugs);
```

空数组要单独处理，避免生成无效 SQL。

### 2.4 文章创建/更新需要事务

涉及文件：`apps/platform-api/src/modules/post/post.service.ts`。

一次创建包含多步写入：

1. 文章主体 `post_core`
2. Markdown 内容 `post_content`
3. 标签关系 `post_tag_mappings`
4. 分类关系 `post_category_mappings`
5. slug / 索引相关数据

中途失败会出现“文章存在但内容或分类缺失”的脏数据。

建议：

```text
BEGIN
  INSERT post_core
  INSERT post_content
  INSERT post_tag_mappings
  INSERT post_category_mappings
COMMIT
```

要点：

- 事务内不要调用 GitHub API、邮件、远程缓存等外部服务；
- slug 冲突用数据库唯一约束兜底，不要只靠“创建前查询”；
- 文章发布 + 创建 Discussion 属于跨系统流程，用 Outbox/重试处理（见 3.4），不能靠数据库事务保证原子性。

### 2.5 Session 与 Refresh Token

现状：`SessionRepository` 主要把 Session 存在 `CacheService` 里，而不是持久化 Session 表。用 Redis 通常可接受，但 Local 与 Cloudflare KV 的持久性、过期与一致性行为不同。

建议：

- Session 安全状态与普通内容缓存分离；
- 生产环境使用有明确持久化保证的存储；
- KV 是最终一致性存储，不适合承担强一致的安全状态；
- 增加 refresh token 并发轮换保护（同一 token 并发刷新只允许一次成功）；
- 补设备列表、最近活跃时间、单设备/全部设备注销、异常登录提醒、管理员审计日志。

---

## 3. 评论系统改造：Gitalk 2.0 + GitHub Discussions

### 3.1 结论与版本区别

评论系统改为 **Gitalk 2.0 + GitHub Discussions**，不使用 Gitalk 1.x 的 Issues backend。

| 版本       | Backend                                           |
| ---------- | ------------------------------------------------- |
| Gitalk 1.x | GitHub Issues                                     |
| Gitalk 2.0 | 默认 GitHub Discussions|

Gitalk 2.0 关键点：

- 提供 Vue 组件 `@aifire/gitalk-vue`，适配当前 Vue 3；
- 支持直接传入 Discussion `number`，避免组件每次按标题扫描；
- 使用 GitHub App + token endpoint/proxy，secret 不能进浏览器。

**接入前置条件（重要）：**

1. 仓库当前 `has_discussions = false`，需管理员先在 Settings → Features 启用 Discussions；
2. 建立专用评论分类（如 `Blog Comments`）；
3. Gitalk 2.0 的 Vue/React 包在首个 release 前**可能尚未发布到 npm**，实施前必须核实 npm 发布状态；未发布则锁定官方仓库的明确 commit/tag 自行构建，不要依赖 `@latest`；
4. 创建 GitHub App 并安装到承载 Discussions 的仓库；
5. 部署 token endpoint / proxy（可评估独立 Worker），不要把 proxy secret 与前端 bundle 混在一起。

参考：

- Gitalk：[https://github.com/gitalk/gitalk](https://github.com/gitalk/gitalk)
- GitHub Discussions Quickstart：[https://docs.github.com/en/discussions/quickstart](https://docs.github.com/en/discussions/quickstart)

### 3.2 目标结构

```text
Vue 3 ArticlePage
   |
   | 1. 获取文章数据
   v
Hono Blog API --------------------> D1 / Database
   |                                  |
   | 2. 异步请求评论映射              | post.slug
   v                                  | discussion_number
Comment Resolver API <---------------+
   |
   | 3. 先查 D1 / Cache
   | 4. 未命中才查 GitHub Discussions
   v
GitHub GraphQL API
   |
   | 5. 返回 Discussion number
   v
Vue Gitalk 2.0 Component
   |
   | 6. 用 number 加载评论
   v
GitHub Discussions
```

前端原则：

- 正文不等待评论 API；
- 评论区域先显示 skeleton；
- 映射解析成功后再挂载 Gitalk；
- 映射不存在显示“评论尚未初始化”，**不能把错误当成没有评论**；
- 评论接口失败不影响正文；
- 可用 IntersectionObserver，评论区域接近视口再加载。

### 3.3 一对一映射规则

```text
post.slug  <---- 1:1 ---->  discussion.number
```

约束：

- 一个有效 slug 最多绑定一个 Discussion；
- 一个 Discussion number 只能绑定一篇文章；
- slug 是博客业务主键，不是 Discussion 标题；
- `number` 是仓库内编号，不是全局 ID；
- slug 改名时保留原 Discussion，只更新映射，不新建；
- 文章删除/进回收站不自动删除 Discussion，保留讨论历史；
- 草稿不公开创建评论 Discussion。

建议映射表 `post_discussion_map`：

| 字段               | 类型建议     | 说明                                 |
| ------------------ | ------------ | ------------------------------------ |
| id                 | integer/uuid | 主键                                 |
| post_id            | 文章主键     | 真正稳定的关联                       |
| post_slug          | varchar      | 当前 slug（冗余，便于查询）          |
| github_owner       | varchar      | 仓库 owner                           |
| github_repo        | varchar      | 仓库名                               |
| discussion_number  | integer      | GitHub Discussion number             |
| discussion_node_id | varchar      | GraphQL node ID（建议保留）          |
| discussion_url     | varchar      | Discussion 地址                      |
| category_slug      | varchar      | 分类                                 |
| scope              | enum         | `post` / `guestbook` / `discover` / `about`，默认 `post`    |
| status             | enum         | pending / active / failed / archived |
| created_at         | datetime     | 创建时间                             |
| updated_at         | datetime     | 更新时间                             |

约束：

```sql
UNIQUE(post_id)
UNIQUE(scope, post_slug)
UNIQUE(github_owner, github_repo, discussion_number)
```

`post_id` 对 guestbook 记录允许为 NULL；`scope` 用于区分文章评论与留言板，避免两者 slug 冲突。

slug 允许变更时，以 `post_id` 为稳定关联，`post_slug` 仅作当前索引。

### 3.4 创建策略与幂等

**不要让普通访客的并发首次访问直接创建 Discussion**，否则爬虫、预加载和并发请求可能产生重复 Discussion。

推荐在文章发布成功后触发异步任务：

```text
PostPublished Event
       |
       v
Outbox / Job Queue
       |
       v
EnsureDiscussion(postId)
       |
       +-- 已有映射 -> 直接结束
       |
       +-- 无映射 -> 按 slug 创建 Discussion
                         |
                         v
                保存 number / node_id / URL
```

Discussion 标题用人类可读标题 + 机器标记：

```text
文章标题

[blog-post:my-article-slug]
```

创建前按标记精确查找（限定仓库与分类），创建后保存映射；不能凭模糊标题包含关系判定为同一篇。

幂等控制：

- `post_id` 数据库唯一约束；
- job dedup key：`ensure-discussion:{postId}`；
- 创建前二次检查映射；
- 远程创建成功但本地写库失败时，重试先按标记查找再补写映射；
- 无法确认的结果进入人工处理，不盲目重建。

guestbook 使用同一套任务，slug 固定为 `guestbook`、`scope=guestbook`，同样需要幂等与唯一约束。

### 3.5 查询流程与接口

用户打开 `/posts/:slug`：

1. 页面先请求文章详情；
2. 并行/稍后请求 `GET /api/comments/discussion?slug={slug}`；
3. API 校验文章存在、公开、允许评论；
4. 查 D1 映射 `post_slug -> discussion_number`；
5. 命中直接返回 `number`、URL、状态；
6. 未命中查 KV/L1；
7. 仍未命中才调用 GitHub GraphQL，在指定分类内按机器标记搜索；
8. 唯一匹配后写回 D1 与缓存；
9. 返回 `discussion_number`；
10. 前端把 number 传给 Gitalk 2.0。

接口：

```http
GET /api/comments/discussion?slug=example-post
GET /api/comments/discussion?scope=guestbook
```

`scope` 缺省为 `post`；guestbook 不需要传 slug。

成功：

```json
{
  "status": "active",
  "discussionNumber": 42,
  "discussionUrl": "https://github.com/OWNER/REPO/discussions/42"
}
```

未初始化：

```json
{
  "status": "not_initialized",
  "discussionNumber": null
}
```

状态必须区分清楚：

- `active`
- `not_initialized`
- `disabled`
- `temporarily_unavailable`

**不要让每次访问都实时搜索 GitHub**：外部延迟、速率限制、页面抖动、模糊匹配风险、GitHub 故障都会影响评论区域。原则是**发布时创建并保存映射，访问时查本地映射，仅缺失时回源**。

### 3.6 前端集成示意

```ts
import { defineAsyncComponent } from "vue";

const GitalkComponent = defineAsyncComponent(() =>
  import("@aifire/gitalk-vue").then((m) => m.Gitalk),
);
```

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

const props = defineProps<{ slug: string }>();

const discussion = ref<{
  status: "active" | "not_initialized" | "disabled" | "temporarily_unavailable";
  discussionNumber: number | null;
} | null>(null);

const loading = ref(true);

onMounted(async () => {
  try {
    const response = await fetch(
      `/api/comments/discussion?slug=${encodeURIComponent(props.slug)}`,
    );
    discussion.value = await response.json();
  } finally {
    loading.value = false;
  }
});

const gitalkOptions = computed(() => {
  if (!discussion.value?.discussionNumber) return null;

  return {
    backend: "discussions",
    clientID: import.meta.env.VITE_GITALK_CLIENT_ID,
    owner: import.meta.env.VITE_GITALK_OWNER,
    repo: import.meta.env.VITE_GITALK_REPO,
    admin: import.meta.env.VITE_GITALK_ADMINS?.split(",") ?? [],
    number: discussion.value.discussionNumber,
    proxy: import.meta.env.VITE_GITALK_PROXY,
    language: "zh-CN",
    perPage: 20,
  };
});
</script>

<template>
  <section class="article-comments">
    <div v-if="loading">正在加载评论…</div>
    <div v-else-if="discussion?.status === 'not_initialized'">
      评论区尚未初始化
    </div>
    <div v-else-if="discussion?.status === 'disabled'">本文暂不开放评论</div>
    <div v-else-if="discussion?.status === 'temporarily_unavailable'">
      评论暂时无法加载，请稍后重试
    </div>
    <GitalkComponent
      v-else-if="gitalkOptions"
      :key="discussion?.discussionNumber"
      :options="gitalkOptions"
    />
  </section>
</template>
```

> 这是集成方向示意，不是仓库中已验证可编译的代码。实施时需按 Gitalk 2.0 Vue 包的实际导出类型、构建工具和发布状态调整。

安全要求：

- GitHub App client secret / private key / installation token / 用户 access token **只能**放在 token endpoint 或 Worker secret；
- 浏览器端只用公开配置（Client ID、owner/repo、proxy URL）；
- 限制 proxy 的允许来源、回调 URL 和可访问仓库，避免变成开放代理；
- Gitalk 2.0 通过 GitHub 登录授权评论，访客需要 GitHub 账号。

### 3.7 GitHub 侧配置清单

1. `rx-ted/app-repo` Settings → Features 启用 Discussions；
2. 建立文章评论分类（如 `Blog Comments`）；
3. 限制普通访客在分类中随意创建主题；
4. 创建 GitHub App，按 Gitalk 2.0 官方说明配置权限与 callback；
5. 安装 App 到承载 Discussions 的仓库；
6. 部署 token endpoint / proxy（可独立 Worker）；
7. Gitalk 配置固定 `backend: "discussions"` 并传 `number`；
8. 搜索时限定 category。

### 3.8 原评论模块的迁移与下线

原本地评论模块不再作为公开文章评论的主存储。

- 文章详情页移除原评论列表、回复树、点赞、创建接口调用；
- 前端评论 UI 统一由 Gitalk 承担；
- 保留评论配置/映射解析 API；
- 原 `comment` 表先备份，确认无其他依赖后再下线；
- 有真实评论数据需单独迁移方案（Issues/Discussions 不会自动迁移）；
- 历史评论可导出后按文章创建 Discussion 再导入，但需注意 GitHub API 的身份、时间戳、编辑记录、用户归属限制；
- 迁移完成前，旧接口可先只读或关闭写入，避免两套评论同时增长。

### 3.9 新评论系统的边界

| 能力                         | 负责方                                   |
| ---------------------------- | ---------------------------------------- |
| 评论展示 UI                  | Gitalk 2.0                               |
| 评论内容/回复                | GitHub Discussions                       |
| reaction                     | GitHub Discussions / Gitalk              |
| GitHub 登录与授权            | Gitalk 2.0 / GitHub                      |
| slug → Discussion 映射       | 博客 D1/数据库                           |
| number 缓存                  | Local LRU + KV/Redis                     |
| Discussion 创建与补偿        | 博客后台任务                             |
| 评论内容搜索                 | GitHub Discussions（不在博客 DB 复制）   |
| 文章评论开关                 | 博客文章配置                             |
| 评论加载失败状态             | 博客前端                                 |
| 留言板（guestbook）          | Gitalk 2.0 + 固定 `guestbook` Discussion |
| 仓库文件 / Discussion 写操作 | GitHub 集成 API（见第 4 节）             |

**注意能力损失**：迁移后，本地评论模块的审核、敏感词、评论统计、用户封禁、站内通知等不会自动保留。若这些是硬需求，需要重新设计 GitHub Webhook / 同步任务或管理流程；不要假设 Gitalk 提供与自建系统相同的后台管理能力。

---

## 4. GitHub 集成 API（新增）

GitHub App 已经创建，因此不再讨论"要不要接 GitHub"，而是把 **token 获取、仓库文件 CRUD、Discussion CRUD、discover 缓存、guestbook 改造** 定义清楚。

### 4.1 定位与总体设计

博客后端作为访问 GitHub 的唯一出口，前端不直接调用 GitHub，也不接触 access token。

```text
Vue 3
  |  博客 session cookie（不接触 GitHub token）
  v
Hono /api/github/*
  |
  v
GitHubGateway（token 读取 / 重试 / 限流 / 错误映射 / 审计）
  |
  +--> KV: github:{username} -> token（TTL 7 天）
  +--> GitHub REST: 仓库文件 CRUD
  +--> GitHub GraphQL: Discussion / Comment CRUD
```

原则：

- 前端永不直接调用 GitHub API，也不接收 access token；
- 写操作只允许管理员/作者角色；
- 统一封装 `GitHubGateway`，不要在 controller 里散落 `fetch`；
- 仓库、路径、Discussion 分类使用 allowlist；
- 所有写操作记录审计日志。

### 4.2 授权流程与 token 存储

#### 授权流程

```text
GET /api/github/auth/url
   |  302 到 github.com/login/oauth/authorize
   |  state 存 KV/签名 cookie，10 分钟过期
   v
GitHub 授权页
   |
   v
GET /api/github/auth/callback?code=...&state=...
   |
   | 1. 校验 state（一次性）
   | 2. POST https://github.com/login/oauth/access_token
   |    { client_id, client_secret, code }
   | 3. GET https://api.github.com/user 取 login / id
   | 4. 写入 KV
   v
建立/刷新博客 session -> 重定向回前端
```

#### KV 存储约定

按约定使用：

```text
key:   github:{username}
value: token（建议存 JSON，便于扩展）
TTL:   7 天
```

推荐 value 结构：

```json
{
  "accessToken": "ghu_xxx",
  "tokenType": "bearer",
  "githubUserId": 123456,
  "login": "octocat",
  "scope": "",
  "expiresAt": "2026-11-06T00:00:00Z",
  "refreshToken": "ghr_xxx",
  "createdAt": "2026-10-30T00:00:00Z"
}
```

实现要点：

1. `username` 统一小写规范化（GitHub login 大小写不敏感）。
2. **username 必须来自已认证的博客 session**，不能从 query/body 取，否则会变成"任意用户 token 读取器"。
3. `github:` 前缀保留给 GitHub 集成，禁止其他模块复用，避免 key 冲突。
4. token 建议加密后写入 KV（AES-GCM，密钥放 Worker secret），不要明文落盘。
5. token 永不返回给浏览器、永不写日志、永不进错误信息。
6. 调用 GitHub 返回 401 时立即删除该 key，返回 `github_reauth_required`，让前端重新授权。
7. 登出时删除 key；管理员可强制清除某用户 token。
8. 写操作前可先 `GET /user` 校验 token 仍有效，避免使用已撤销 token。

#### 三个必须注意的坑

- **GitHub App user token 默认 8 小时过期**（App 设置里可关闭过期）。KV 的 7 天 TTL 只是"缓存上限"，不能超过 token 实际有效期；必须用 `expiresAt` 判断，必要时用 refresh token 刷新，刷新后回写 KV 并重置 TTL。
- **KV 是最终一致性**：登出/撤销后，其他 PoP 可能短暂仍能读到旧 token。安全敏感写操作应实时校验，不能只信 KV。
- **单 key 会互相覆盖**：同一用户多设备/多浏览器授权时，后一次会覆盖前一次。当前约定先用单 key；若要多端并存，改成 `github:{username}:{sessionId}`，并限制每个用户的最大会话数。

### 4.3 仓库文件 CRUD API

#### 仓库文件接口

| 方法   | 路径                                             | 说明                       |
| ------ | ------------------------------------------------ | -------------------------- |
| GET    | `/api/github/files?owner=&repo=&path=&ref=`      | 读取文件，返回内容与 `sha` |
| GET    | `/api/github/files/tree?owner=&repo=&path=&ref=` | 列出目录                   |
| PUT    | `/api/github/files`                              | 新建或更新文件             |
| DELETE | `/api/github/files`                              | 删除文件                   |

#### 请求示例

```json
{
  "owner": "rx-ted",
  "repo": "app-repo",
  "path": "content/posts/hello.md",
  "content": "# Hello\n\n...",
  "message": "docs: update hello",
  "branch": "main",
  "sha": "可选，更新时必填"
}
```

#### 行为约定

- 服务端负责 base64 编码，前端传纯文本；
- `GET` 返回 `{ path, sha, content, encoding, htmlUrl }`；
- `PUT` 无 `sha` 视为新建；文件已存在则返回 `409 sha_conflict` 并带上当前 `sha`；
- `PUT` 带 `sha` 视为更新，`sha` 不匹配返回 `409`，由前端提示"文件已被他人修改"；
- `DELETE` 必须带 `sha`；
- 成功统一返回 `{ sha, commitSha, htmlUrl }`；
- 提交信息统一模板，例如 `blog(api): update {path} by {username}`。

GitHub REST 对应关系：

```text
GET    /repos/{owner}/{repo}/contents/{path}?ref={ref}
PUT    /repos/{owner}/{repo}/contents/{path}
DELETE /repos/{owner}/{repo}/contents/{path}
```

#### 安全限制

- `GITHUB_ALLOWED_REPOS` 白名单，不能写任意仓库；
- path 规范化：拒绝 `..`、绝对路径、`.git/`、`.github/workflows/`（除非明确允许）；
- 单文件大小限制（如 1 MB），超过改用 Git Data API / blob；
- 二进制文件走 base64，并校验 MIME；
- 文件内容缓存 `gh:file:{owner}:{repo}:{ref}:{path}`，TTL 1–5 分钟，写入后主动删除；
- 不要把 GitHub 原始错误直接透传给前端。

### 4.4 Discussion / Comment CRUD 与来源标注

#### Discussion 接口

| 方法   | 路径                                                     | GraphQL 操作                       |
| ------ | -------------------------------------------------------- | ---------------------------------- |
| GET    | `/api/github/discussions?owner=&repo=&category=&cursor=` | `repository.discussions`           |
| GET    | `/api/github/discussions/:number`                        | `discussion`                       |
| POST   | `/api/github/discussions`                                | `createDiscussion`                 |
| PATCH  | `/api/github/discussions/:number`                        | `updateDiscussion`                 |
| DELETE | `/api/github/discussions/:number`                        | `deleteDiscussion`（默认先 close） |
| GET    | `/api/github/discussions/:number/comments`               | `comments`                         |
| POST   | `/api/github/discussions/:number/comments`               | `addDiscussionComment`             |
| PATCH  | `/api/github/comments/:id`                               | `updateDiscussionComment`          |
| DELETE | `/api/github/comments/:id`                               | `deleteDiscussionComment`          |

#### 创建请求

```json
{
  "owner": "rx-ted",
  "repo": "app-repo",
  "categoryId": "DIC_kwDO...",
  "title": "文章标题",
  "body": "...",
  "blogUrl": "https://blog.example.com/posts/hello",
  "slug": "hello"
}
```

#### 来源标注（本次核心需求）

通过 API 创建 Discussion / Comment 时，正文末尾统一追加机器可识别来源块，解决"在 GitHub 上看不出这是哪篇博客"的问题：

```md
## <!-- blog-source:start -->

> 来源：[文章标题](https://blog.example.com/posts/hello)
> 页面：`/posts/hello`

<!-- blog-source:end -->
```

规则：

1. 只由服务端追加，追加前检查 `<!-- blog-source:start -->` 标记，保证幂等；
2. `blogUrl` 必须属于 `SITE_ORIGIN` 白名单，避免写入任意链接；
3. `title` 继续保留 `[blog-post:{slug}]` 机器标记，用于 3.3 的映射查找；
4. guestbook 使用 `/guestbook`，slug 固定为 `guestbook`；
5. 更新正文时保留原来源块，不允许用户通过 PATCH 删除它。

#### 重要限制：Gitalk 直接发的评论不经过这个 API

Gitalk 用户在页面上发评论时，是 **Gitalk → GitHub**，不经过博客后端，所以这些评论不会自动带来源块。

推荐做法（按优先级）：

1. **把来源信息放在 Discussion 主题正文**。主题由后台创建，100% 可控；任何人在 GitHub 打开该 Discussion，第一楼就能看到对应博客地址。这是成本最低、最可靠的方式。
2. 若确实要求"每条用户评论都带来源"，用 GitHub App Webhook 监听 `discussion_comment` 的 `created` 事件，由 bot 追加来源块。注意这会修改用户内容，必须幂等、只追加一次、失败可重试，并明确告知用户；默认不建议。
3. 若 Gitalk 2.0 支持自定义 body/title 模板，可在前端模板里带上链接；实施前需验证该能力是否存在。

#### 删除策略

- 默认 `DELETE` 执行"关闭 Discussion"而不是物理删除，保留讨论历史；
- 物理删除只对管理员开放，并要求二次确认；
- 删除/关闭后同步清理 `post_discussion_map` 与 `comment-map:*` 缓存。

### 4.5 Discover 页面：KV 优先，D1 回源

目标：discover 页面优先读 KV，未命中再读 D1，并把结果写回 KV。

```text
GET /api/discover?...
        |
        v
KV discover:{queryHash}
        |
        | HIT  -> 200 (X-Cache: HIT)
        | MISS
        v
Singleflight（同 key 并发只回源一次）
        |
        v
D1 查询
        |
        v
写回 KV（TTL 10 分钟）
        |
        v
200 (X-Cache: MISS)
```

约定：

| 项        | 建议                                                                  |
| --------- | --------------------------------------------------------------------- |
| Key       | `discover:{stableHash(query)}`；只有一份全局数据时用 `discover:index` |
| TTL       | 10 分钟                                                               |
| 刷新      | SWR：过期先返回旧值，后台刷新                                         |
| 失效      | 文章发布/下线/修改、推荐位调整时删除 key 或递增 `discover:v{n}`       |
| KV 读失败 | 直接回源 D1，不要返回 500                                             |
| KV 写失败 | 仍返回 D1 结果，只记 metric                                           |
| 空结果    | 30–60 秒 negative cache，防穿透                                       |
| 调试      | 响应头 `X-Cache: HIT/MISS`，仅开发或开关开启时返回                    |
| 体积      | KV 单值上限 25 MB，discover 只放摘要字段，不放全文                    |

```ts
async function getDiscover(query: DiscoverQuery) {
  const key = `discover:${stableHash(query)}`;
  const cached = await kv.get(key, "json");
  if (cached) return { data: cached, cache: "HIT" };

  const data = await singleflight(key, async () => {
    const rows = await db
      .select(/* 摘要字段 */)
      .from(/* ... */)
      .limit(query.limit);

    await kv.put(key, JSON.stringify(rows), { expirationTtl: 600 });
    return rows;
  });

  return { data, cache: "MISS" };
}
```

注意：

- KV 是最终一致性，失效后短暂返回旧数据可以接受；discover 不是强一致场景。
- 不要在 KV 里缓存用户私有数据；discover 只缓存公开内容。
- 写 KV 用 `expirationTtl`，不要依赖手动清理。

### 4.6 Guestbook 改造：改用 Gitalk

guestbook 不再使用自定义留言表和接口，统一走 Gitalk + Discussions。

映射方式：

- 固定 `slug = guestbook`（或 `__guestbook__`）；
- 在 `post_discussion_map` 增加 `scope` 字段，`post_id` 允许为 NULL：

```sql
scope ENUM('post','guestbook') NOT NULL DEFAULT 'post'
UNIQUE(scope, post_slug)
```

接口复用：

```http
GET /api/comments/discussion?scope=guestbook
```

返回结构与文章评论一致（`active` / `not_initialized` / `disabled` / `temporarily_unavailable`），前端复用同一个评论组件，只传入不同 slug/scope。

改造要点：

- guestbook 的 Discussion 由后台任务一次性幂等创建，正文带 `/guestbook` 来源链接；
- 原留言接口停止写入，表先备份/只读，确认无依赖后下线；
- 如需保留历史留言，导出后作为 Discussion 评论导入（注意身份、时间戳限制）；
- 前端不再实现留言表单、分页、审核等逻辑。

### 4.7 错误码与限流

| 场景                   | HTTP      | 业务码                                |
| ---------------------- | --------- | ------------------------------------- |
| 未登录博客             | 401       | `unauthorized`                        |
| GitHub token 缺失/失效 | 401       | `github_reauth_required`              |
| 无权限写该仓库         | 403       | `forbidden_repo`                      |
| GitHub 限流            | 429       | `github_rate_limited`（带 `resetAt`） |
| 文件 sha 冲突          | 409       | `sha_conflict`（带当前 `sha`）        |
| Discussion 不存在      | 404       | `discussion_not_found`                |
| 参数不合法             | 400       | `invalid_argument`                    |
| GitHub 5xx / 超时      | 502 / 503 | `github_unavailable`                  |

- 每个用户写操作限流（如 30 次/分钟），读操作单独限流；
- 只有 `403` 且 `x-ratelimit-remaining: 0` 才判定为限流，普通 403 是权限问题；
- 只对 5xx/网络错误重试，指数退避 + jitter，不重试 4xx；
- 所有请求带 `User-Agent` 与 `X-GitHub-Api-Version`；
- 记录 `x-ratelimit-remaining`，低于阈值时告警并降级。

### 4.8 审计与可观测性

审计表 `github_audit_log`：

```text
id, actor_id, actor_login, action, owner, repo,
target_path / discussion_number, before_sha, after_sha,
result, error_code, ip, created_at
```

指标：

- GitHub 调用次数、成功率、P50/P95；
- token 读取命中/缺失/刷新次数；
- `x-ratelimit-remaining`；
- 写失败率、409 冲突率；
- discover KV 命中率与回源耗时。

告警：连续 401、rate limit < 10%、写失败率 > 5%、KV 回源异常升高。

---

## 5. 缓存架构：提升读取性能的重点

### 5.1 三级缓存

```text
Request
  |
  v
L1: Local LRU cache
  |
  | miss
  v
L2: Redis / Cloudflare KV
  |
  | miss
  v
L3: Database (D1 / SQLite / MySQL)
  |
  v
回填 L2 -> 回填 L1 -> Response
```

职责：

- L1：单实例热点数据，极低延迟，严格限制容量；
- L2：跨实例共享，按部署环境选 Redis 或 KV；
- L3：数据库，持久化事实来源。

不同部署组合：

| 部署方式           | 建议                   |
| ------------------ | ---------------------- |
| 单机 SQLite        | L1 + SQLite            |
| Cloudflare Workers | L1 + D1，KV 作共享缓存 |
| 多实例 Node/Bun    | L1 + Redis + MySQL     |
| 单实例开发环境     | Local Cache            |

> Cloudflare KV 是最终一致性存储，不要拿它承担强一致 Session、权限变更或关键写入锁。

### 5.2 缓存组件能力补齐

建议升级 `packages/honest-plugins/cache`：

| 能力                      | 作用                   | 优先级   |
| ------------------------- | ---------------------- | -------- |
| LRU                       | 限制内存占用           | 高       |
| TTL                       | 自动过期               | 已有基础 |
| MGET / MSET               | 批量读写               | 已有基础 |
| Cache Stampede Protection | 防大量请求同时回源     | 高       |
| Singleflight              | 同 Key 并发合并        | 高       |
| Cache Tag                 | 按业务标签失效         | 高       |
| Versioned Key             | 版本号切换命名空间     | 高       |
| Negative Cache            | 缓存不存在结果         | 中       |
| Stale While Revalidate    | 先返回旧值再后台刷新   | 高       |
| Cache Metrics             | 命中率、延迟、回源次数 | 高       |
| TTL Jitter                | 防止同时过期           | 中       |
| Batch Invalidation        | 批量失效               | 高       |

**最推荐 Singleflight + SWR**。例如文章缓存 TTL = 300 秒：

```text
0~300 秒    正常读缓存
300~330 秒  先返回旧缓存，后台刷新
330 秒以后  等待重新加载
```

这样热点文章过期时不会让几百个请求同时打到数据库。

### 5.3 失效机制：从 pattern scan 转向版本号

当前失效主要靠：

```ts
cache.deleteByPattern("post:list:*");
```

Redis 用 SCAN、KV 用 list 再逐条删除，数据量增大后成本会上升。

建议版本号：

```text
post:list:v1:...
post:list:v2:...
post:list:v3:...
```

更新文章时只递增列表版本号，旧缓存自然过期。

再配合业务标签：

```text
post:123
  ├── post:detail
  ├── blog:home
  ├── blog:latest
  ├── blog:search
  └── archive:2026
```

只失效相关标签，而不是清空整个区域。

### 5.4 建议 TTL 初值

以下为起始值，需按真实流量与更新频率压测调整。

| 数据                                  |       建议 TTL | 策略                                  |
| ------------------------------------- | -------------: | ------------------------------------- |
| 文章详情                              |         5 分钟 | SWR，发布/编辑主动失效                |
| 文章列表                              |         1 分钟 | SWR                                   |
| 首页聚合                              |         1 分钟 | 统计与列表可拆分                      |
| 分类/标签                             |        10 分钟 | 版本失效                              |
| 用户公开资料                          |         5 分钟 | SWR                                   |
| 权限信息                              |       30–60 秒 | 主动失效                              |
| 评论列表（旧本地评论）                |          30 秒 | 写入主动失效                          |
| 通知未读数                            |          15 秒 | **必须用户隔离**                      |
| 搜索结果                              |         1 分钟 | Key 含完整条件                        |
| slug → discussion number              |      1–24 小时 | 映射稳定，主动失效                    |
| guestbook 映射                        |      1–24 小时 | 与文章映射同策略                      |
| GitHub 用户 token `github:{username}` |           7 天 | 加密存储，且不得超过 token 实际有效期 |
| GitHub 文件内容                       |       1–5 分钟 | 写后主动失效                          |
| discover 聚合                         |        10 分钟 | KV 优先，D1 回源，SWR                 |
| Discussion 评论正文                   | 由 Gitalk 管理 | 不复制进博客缓存                      |
| Session                               |     按会话 TTL | 不用普通内容缓存策略                  |

### 5.5 评论映射缓存

```text
comment-map:{scope}:{postSlug} -> {
  discussionNumber,
  discussionUrl,
  status,
  mappingVersion
}
```

guestbook 固定为 `comment-map:guestbook:guestbook`，与文章映射共用同一套缓存逻辑。

1. D1/DB 为事实来源；
2. L1 存热点 slug；
3. KV/Redis 存跨实例缓存；
4. slug 修改、文章删除、Discussion 迁移时主动失效；
5. GitHub 搜索只在映射缺失或管理员强制刷新时执行；
6. GitHub API 失败做短暂负缓存/熔断，**不能把错误缓存成 `not_initialized`**。

---

## 6. 数据库与 API 性能

### 6.1 旧评论读取的 N+1（迁移前需处理）

涉及文件：`apps/platform-api/src/modules/comment/comment.service.ts`。

`buildCommentVO()` 对每条评论分别执行：查作者、查回复数、查前 5 条回复、查当前用户点赞、递归构造回复。20 条顶级评论就会放大成大量查询。

目标：

```text
GET /comments
    ├── 一次查 20 条顶级评论
    ├── 批量查作者
    ├── 批量查回复数量
    ├── 批量查前 5 条回复
    └── 批量查当前用户点赞状态
```

即：顶级评论一次、作者一次、回复一次或少量批量、点赞一次，**不再逐条递归访问数据库**。

> 评论迁移到 GitHub Discussions 后，该路径不再是公开评论加载路径；但下线前仍需确认是否有其他调用者，避免留下性能/正确性问题。

### 6.2 首页聚合

首页当前涉及：文章数、标签数、分类数、推荐、最新、置顶、浏览总数、点赞总数、评论总数、热门标签。

这些已在首页缓存中，但缓存失效后会重新执行多次查询。

建议：

- 建 `blog_aggregates` 快照表：

  ```text
  published_post_count
  tag_count
  category_count
  total_views
  total_likes
  total_comments
  updated_at
  ```

- 统计通过写入事件或定期任务更新；
- 首页拆成独立缓存：

  ```text
  home:content
  home:taxonomy
  home:stats
  home:recommendations
  ```

  （或 `blog:home:hero/featured/latest/pinned/trending`），只刷新变化部分。

### 6.3 索引核对

不要仅凭 Schema 里有没有显式声明就断言索引缺失。应在目标库执行 `EXPLAIN` / `EXPLAIN ANALYZE` 检查真实执行计划。

重点核对：

```text
post_core(status, created_at, id)
post_core(status, published_at)
post_core(user_id, status, created_at)
post_tag_mapping(tag_id, post_id)
post_category_mapping(category_id, post_id)
comments(post_id, status, created_at)       # 旧评论仍被查询时
comments(parent_id, status, created_at)      # 同上
notifications(user_id, is_read, created_at)
comment_likes(user_id, comment_id) UNIQUE    # 本地数据保留时
post_discussion_map(post_slug) UNIQUE
post_discussion_map(github_owner, github_repo, discussion_number) UNIQUE
```

Schema 中的索引 TODO 不代表一定不存在（项目还有初始化建索引逻辑），需按实际数据库验证，不要盲目全加。

### 6.4 Cursor 分页

深分页不要长期用 `OFFSET`。文章、用户活动等列表优先用 `created_at + id` 稳定游标：

```sql
SELECT *
FROM post_core
WHERE status = 'published'
  AND (
    created_at < :cursorCreatedAt
    OR (created_at = :cursorCreatedAt AND id < :cursorId)
  )
ORDER BY created_at DESC, id DESC
LIMIT :pageSize;
```

接口：

```http
GET /posts?limit=20&cursor=...
```

优点：深分页稳定、不会因新插入导致翻页重复、能利用联合索引。旧页码分页可保留兼容。

评论分页由 Gitalk/GitHub 承担，博客不再为评论树实现 offset 分页。

### 6.5 搜索

`LIKE '%keyword%'` 无法有效利用普通 B-Tree 索引。按部署选择：

| 方案           | 适用                         |
| -------------- | ---------------------------- |
| SQLite FTS5    | SQLite / D1 需要本地全文搜索 |
| MySQL FULLTEXT | MySQL 环境                   |
| Meilisearch    | 需要独立服务、中文分词       |
| Typesense      | 全文检索 + 筛选排序          |

建议：小型博客先做数据库全文索引；中大型再拆独立 Search Provider；不要为搜索引入过度复杂的分布式架构。

另外，搜索作者时对每个作者单独查文章数量也是 N+1，应改 `GROUP BY` 批量统计。

搜索索引异步更新，文章写主库不等待外部搜索服务。

---

## 7. 前端与内容分发

保持 Vue 3，不需要为了性能直接换框架。

优先级：

1. 首屏文章标题、摘要、正文优先加载；
2. 评论组件独立异步加载，不阻塞正文；
3. 评论映射请求与文章详情并行；
4. 评论区域接近视口再加载 Gitalk（IntersectionObserver）；
5. 编辑器、管理后台、统计图表按路由/组件懒加载；
6. 搜索输入 debounce + 取消过期请求；
7. 图片懒加载、尺寸占位，减少 CLS；
8. 图片转 WebP/AVIF，生成缩略图并走 CDN；
9. 静态资源长缓存 + 内容 hash；
10. 公开文章配置 `Cache-Control`、ETag、Brotli/Gzip；
11. 私有文章、密码文章、草稿、用户数据不得使用公共 CDN 缓存；
12. SEO 需要时再评估 SSR/预渲染，不要未经测量就大规模重构。

文章详情建议：

```http
Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=60
ETag: "content-version"
```

其他：

- Markdown → HTML 在发布/更新时完成，不要每次访问重新解析；
- 代码高亮、数学公式、复杂 Markdown 插件按需加载；
- 公开博客页面与管理后台分离加载：不一定要拆项目，但普通访客不应下载编辑器、管理面板、权限管理的 JS。

文章与评论请求互不阻塞：

```text
GET /api/posts/:slug
GET /api/comments/discussion?slug=:slug
```

评论 API 慢、GitHub 限流或 proxy 故障，都不能拖慢正文。

---

## 8. 业务模块完善建议

### 8.1 文章 Post

已有：创建/修改/查询、草稿/发布/归档、公开/私有/密码、置顶/推荐、Markdown、分类标签、修订表、浏览点赞评论统计、中英文关联。

建议补齐：

| 功能       | 说明                                      |
| ---------- | ----------------------------------------- |
| 自动保存   | 编辑器定时保存，离开页面前 flush          |
| 版本管理   | 每次重要修改写 revision，支持比较与恢复   |
| 定时发布   | `scheduledAt` + 定时任务                  |
| 回收站     | 软删除、恢复、彻底删除                    |
| 文章锁     | 防多窗口覆盖                              |
| 草稿预览   | 未发布文章用安全预览 Token                |
| 发布工作流 | 草稿 → 待发布 → 已发布                    |
| 文章关联   | 正确管理中英文版本                        |
| SEO        | 独立 title/description/og:image/canonical |
| 内容统计   | 阅读时长、字数、更新时间                  |

已有 `PostRevisionsSchema` 基础，应确认每次更新是否真正写入 revision，并保证恢复可追踪。

```text
post_revisions
  id
  post_id
  revision
  title
  content_md
  created_by
  created_at
```

评论数不再从本地 comments 表实时 count。若需展示 Discussion 评论数，用异步统计（短 TTL 或 webhook/job 更新），不要为显示一个数字让文章详情每次请求 GitHub。

### 8.2 用户 User

建议分三层：账号（登录/密码/邮箱/OAuth）、资料（头像/昵称/简介/网站/主页）、权限（角色/权限/封禁/状态）。

补齐：

- 关注/取消关注、粉丝；
- 拉黑；
- 个人文章列表；
- 活动时间线；
- 登录历史；
- 安全设置；
- 管理员封禁/解封；
- 数据导出、账号注销。

若 `getBrief()` 的关注数/粉丝数仍是固定 `0`，应明确标记未实现，不能让前端误以为是真实统计。

### 8.3 通知 Notification

统一事件模型：

```text
Domain Event
   |
   v
Notification Outbox
   |
   +--> In-app notification
   +--> Email
   +--> Browser push
```

支持：评论回复、@提及、文章点赞、关注、系统公告、管理员通知、全部/单条已读、删除、分类、偏好设置。

数据库字段参考：

```text
notifications
  id
  user_id
  type
  channel
  title
  content
  payload_json
  is_read
  read_at
  created_at
```

采用 Outbox/队列，避免“评论提交成功但通知发送失败无法补偿”。同时补去重 key、失败重试、频率限制。

评论迁移后，若仍要“文章有新评论”的站内通知，需要 GitHub Webhook 或定期同步，不能继续依赖本地 comment service。

### 8.4 写作 Editor

已有独立 Markdown Editor 包、`EditorPage.vue`、`DraftsPage.vue`、`PostsPage.vue`、Markdown 解析器。

建议：

1. 自动保存草稿；
2. 本地 IndexedDB 临时备份；
3. 服务端定时同步；
4. 编辑冲突检测；
5. 历史版本恢复；
6. 图片拖拽上传；
7. 图片压缩与格式转换；
8. 实时预览；
9. 快捷键；
10. 字数、阅读时长统计；
11. 目录自动生成；
12. 发布前检查；
13. 多语言文章关联；
14. 未发布文章分享预览。

**最推荐：本地自动保存 + 服务端自动保存 + 版本恢复**，保证断网、崩溃、误关页面不丢稿。

实现要点：保存用 debounce，离开页面前 flush；多标签页编辑用 revision/version 做乐观并发控制。

### 8.5 Session / Auth

已有：Session 创建、refresh token 轮换、Session 列表、单设备注销、全部注销、登录设备信息。

补齐：

- 设备名称管理；
- 最近活动时间；
- IP/UA（按隐私策略处理）；
- 异常登录检测与提醒；
- 登录地理位置；
- Session 过期提醒；
- refresh token 并发轮换保护；
- 管理员强制注销；
- 审计日志。

架构问题见 2.5：Session 不应只依赖 CacheService，生产环境需明确持久化保证。

---

## 9. 推荐目标架构

```text
                         Vue 3 Web
                            |
        +-------------------+-------------------+
        |                   |                   |
    Blog API          Comment Resolver     Discover API
        |                   |                   |
        v                   v                   v
 Content / User /     D1 mapping table      KV (discover:*)
 Auth / Notification  (scope: post/guestbook)     |
 Editor / Session           |                     | miss
        |                   v                     v
        |             L1 + KV cache            D1 query
        |                   |                     |
        v                   v                     v
   L1 + L2 Cache      GitHub GraphQL         写回 KV
        |
        v
   D1 / MySQL
        |
        v
   Outbox / Async Jobs
        |
        +--> Search indexing
        +--> Notification delivery
        +--> Blog aggregates
        +--> Ensure Discussion (post / guestbook)
        +--> Webhook reconciliation

   GitHub Gateway  <--- KV: github:{username} -> token (TTL 7d)
        |
        +--> REST: 仓库文件 CRUD
        +--> GraphQL: Discussion / Comment CRUD
        |
        v
      GitHub
```

Blog API 的写操作（文件 CRUD、Discussion CRUD）统一经过 GitHub Gateway，不允许 controller 直连 GitHub。

分层视图：

- **Frontend**：Vue 3 · Pinia · Markdown Editor · Lazy Loading
- **API Gateway**：Hono · Auth · Rate Limit · Validation · Response Cache
- **Content Domain**：Post · Draft · Revision · Taxonomy · Search
- **User Domain**：User · Auth · Session · Permission
- **Interaction Domain**：Comment · Like · Notification
- **System Domain**：Audit · Upload · Mail · Statistics
- **GitHub Integration**：Gateway · Token(KV) · File CRUD · Discussion CRUD · Audit
- **Cache Layer**：L1 Local · L2 Redis / KV
- **Storage Layer**：MySQL / SQLite / D1 · S3
- **Async Jobs / Events**：Stats Flush · Notification · Search Index · Scheduled Publishing

核心原则：

- 文章、用户、权限、Session 仍由自己的数据库管理；
- 评论正文与回复归 GitHub Discussions；
- 博客库只保存 Discussion 映射与必要同步元数据；
- 跨系统动作通过异步任务 + 幂等重试；
- 热点读取走缓存，数据库是事实来源；
- GitHub API 不进入文章正文关键路径；
- GitHub token 只存在服务端 KV，前端只拿博客 session；
- 模块间通过事件或明确服务接口协作，不直接操作对方的 Repository。

---

## 10. 分阶段实施清单

### 阶段 1：安全与正确性（最高优先级）

- [ ] 通知接口补齐 `userId` 数据隔离（list / summary / markAllRead / markRead）
- [ ] 通知缓存 Key 增加 `userId`
- [ ] 搜索缓存 Key 纳入所有过滤/排序条件
- [ ] `PostRepository.list` 缓存 Key 补 `excludeSlugs`
- [ ] SQL 拼接改为 Drizzle 参数化查询（`notInArray` 等）
- [ ] 文章创建/更新核心写入增加事务 + slug 唯一约束
- [ ] 检查 refresh token 并发刷新与 Session 持久化策略

### 阶段 2：评论系统替换

- [ ] 确认使用 Gitalk 2.0，而非 1.x
- [ ] GitHub 仓库启用 Discussions（当前 `has_discussions = false`）
- [ ] 建立专用文章评论分类
- [ ] 建立 GitHub App 与 token endpoint/proxy
- [ ] 验证 Gitalk Vue 包发布状态、版本、类型定义
- [ ] 增加 `post_discussion_map` 表与唯一约束
- [ ] 增加 `GET /api/comments/discussion?slug=...`
- [ ] 增加发布后幂等创建 Discussion 的任务
- [ ] 文章页改为评论异步加载 + 状态区分
- [ ] 原评论接口/表进入迁移与下线计划
- [ ] 验证 slug 修改、文章删除、Discussion 不存在、GitHub 限流、proxy 故障

### 阶段 3：GitHub 集成

- [ ] GitHub App 授权回调、state 校验与错误处理
- [ ] token 加密写入 KV `github:{username}`，TTL 7 天
- [ ] 处理 user token 默认 8 小时过期与 refresh 回写
- [ ] 统一 `GitHubGateway`：token 读取、重试、限流、错误码映射
- [ ] 仓库文件 CRUD（sha 乐观锁、repo/path 白名单、审计）
- [ ] Discussion / Comment CRUD（GraphQL）
- [ ] 创建内容时幂等追加 `blog-source` 来源块
- [ ] Discussion 主题正文写入对应 blog URL（post / guestbook）
- [ ] discover 接口：KV 优先、D1 回源、Singleflight、写回 KV、主动失效
- [ ] guestbook 改用 Gitalk，映射 `scope=guestbook`
- [ ] 原留言接口/表进入只读与下线计划
- [ ] 验证 token 失效、限流、sha 冲突、GitHub 5xx 降级

### 阶段 4：数据库与 API 性能

- [ ] 旧评论 N+1 改批量查询（或确认随迁移下线）
- [ ] 搜索作者统计改 `GROUP BY`
- [ ] 通过 `EXPLAIN` 核对并补齐索引
- [ ] 深分页改 Cursor
- [ ] 首页统计改 `blog_aggregates` 快照
- [ ] 搜索按部署引入全文索引（FTS5 / FULLTEXT / Meilisearch）

### 阶段 5：缓存架构

- [ ] Local LRU 容量与淘汰策略
- [ ] L1 + L2 + DB 回源链路
- [ ] Singleflight
- [ ] SWR
- [ ] Versioned Key / Cache Tag
- [ ] TTL Jitter / Negative Cache
- [ ] 缓存命中率与回源耗时指标
- [ ] Discussion mapping 长 TTL 缓存

### 阶段 6：业务与访问体验

- [ ] 自动保存、版本恢复、定时发布、回收站
- [ ] 用户关注/拉黑/活动记录
- [ ] 通知偏好与异步投递（Outbox）
- [ ] Session 设备管理与审计
- [ ] 图片 WebP/AVIF + CDN，文章静态资源缓存
- [ ] 前端路由/编辑器按需加载，搜索 debounce
- [ ] GitHub Discussion webhook 与博客通知联动（若产品确实需要）
- [ ] SEO / 预渲染（按实际需要评估）

---

## 11. 性能验收标准

实施前建立基准，实施后用相同数据规模、相同环境比较。

| 指标                             | 目的                          |
| -------------------------------- | ----------------------------- |
| API P50 / P95 / P99              | 典型与尾部延迟                |
| DB query count/request           | 检查 N+1 与多余查询           |
| DB query duration                | 找慢查询                      |
| Cache hit ratio                  | 验证缓存有效性                |
| Cache miss origin latency        | 衡量回源成本                  |
| GitHub resolver latency          | 单独观察映射解析              |
| GitHub API rate-limit remaining  | 外部 API 限流预警             |
| GitHub 写操作成功率 / 409 冲突率 | 文件与 Discussion CRUD 健康度 |
| discover KV 命中率 / 回源耗时    | 验证 KV 优先策略              |
| Article FCP                      | 文章首屏体验                  |
| Comment widget ready time        | 评论区域加载体验              |
| JS bundle size                   | 前端资源体积                  |

验收目标（非当前测量结果）：

- 文章详情命中缓存时，不等待 GitHub API；
- 评论映射命中缓存时，只需本地/边缘缓存读取；
- 同一 slug 并发映射 miss 只触发一次 GitHub 查找/创建；
- GitHub API 失败时正文仍正常显示；
- 不同用户的通知列表、摘要、已读状态绝不串数据；
- 搜索不同过滤条件不会错误复用缓存；
- 深分页延迟不随页数线性恶化；
- GitHub token 不出现在任何 API 响应、日志或前端 bundle；
- 文件更新 sha 不匹配时返回 409 且绝不覆盖对方提交；
- discover 命中 KV 时不查询 D1；
- guestbook 不再有自定义留言写接口；
- GitHub 故障时 discover 仍能回源 D1 返回。

基准测试至少覆盖：首页、文章详情、文章列表、搜索、评论列表（旧模块）五个接口。

> 不要只看缓存命中率，还要同时看数据库回源次数、P50/P95/P99、缓存失效后的响应耗时、并发写入的数据正确性。

---

## 12. 风险与产品取舍

### 12.1 评论依赖 GitHub

优点：

- 不自行维护评论正文、回复树、点赞数据；
- 评论历史直接在 GitHub Discussions 管理；
- 复用 GitHub 社区能力与账号体系；
- 博客数据库压力更小。

代价：

- 评论者需要 GitHub 账号并完成授权；
- GitHub API / Gitalk proxy / GitHub 服务异常时评论可能不可用；
- 评论 UI 与审核能力受 Gitalk/Discussions 限制；
- GitHub API 有速率限制，需要缓存与降级；
- 评论数、站内评论通知需要额外同步才能在博客侧展示。

### 12.2 不要每次访问都实时搜索 Discussion

否则会带来：外部网络延迟、速率限制、加载时间波动、模糊匹配风险、GitHub 故障影响评论区。

原则：**发布时创建并保存映射，访问时查本地映射，仅缺失时回源。**

### 12.3 `number` / `node_id` / `url` 不要混用

- `number`：仓库内可读编号（如 `42`），传给 Gitalk `number`；
- `node_id`：GraphQL 全局节点标识；
- `discussion_url`：跳转 GitHub 页面。

数据库可同时保存三者，但不要把 `number` 当成跨仓库唯一主键。

### 12.4 其他需要接受的取舍

- 迁移到 Discussions 后，本地审核、敏感词、封禁、统计等能力需另行设计；
- 全文搜索、SSR、独立搜索服务都属于“按需引入”，不要一次性上复杂架构；
- Cloudflare KV 不适合强一致安全状态；
- Gitalk 2.0 生态（尤其 Vue 包发布状态）尚需实施时验证，必要时锁定 commit 构建。

### 12.5 GitHub token 与 KV 的额外风险

- **token 生命周期**：GitHub App user token 默认 8 小时过期，KV TTL 7 天不能替代真实过期时间；必须存 `expiresAt` 并在过期前刷新，否则会出现"KV 里明明有 token 但 GitHub 返回 401"。
- **最终一致性**：KV 撤销/登出传播有延迟，跨 PoP 可能短暂读到旧 token；敏感写操作应实时校验。
- **单 key 覆盖**：同一用户多端授权会互相覆盖；需要多端并存时改为按 session 分 key。
- **权限过大**：GitHub App 只申请必要权限（contents、discussions），并限制安装仓库；不要用个人 PAT 代替。
- **token 泄露面**：Worker 日志、错误堆栈、审计记录都可能带出 token，必须统一脱敏。
- **写操作破坏性**：文件 DELETE、Discussion DELETE 都不可轻易恢复；默认关闭而非删除，并保留审计。

### 12.6 discover 与 guestbook 的取舍

- discover 依赖 KV 最终一致性，刚发布的内容可能短暂不出现；产品上可接受即可。
- guestbook 迁移后同样需要 GitHub 账号才能留言，且失去自定义留言的审核/通知能力。
- 原留言数据迁移到 Discussions 受 GitHub 身份与时间戳限制，不能保证 100% 还原。

---

## 13. 最终建议

1. **评论：Gitalk 2.0 + GitHub Discussions**，不采用 1.x Issues backend；guestbook 复用同一套组件。
2. **映射：slug → 本地映射表 → Discussion number**，发布时创建，访问时异步查询；`scope` 区分文章与留言板。
3. **读取：Gitalk 直接使用 `number`**，不依赖每次标题搜索。
4. **GitHub 集成：后端唯一出口 + token 存 KV（`github:{username}`，7 天）**，文件与 Discussion 的写操作统一走 `GitHubGateway`。
5. **来源标注：Discussion 主题正文写入 blog URL**，API 创建的内容追加 `blog-source` 块；Gitalk 用户评论默认靠主题上下文说明来源。
6. **缓存：映射长 TTL，正文走原有 L1/L2，discover 走 KV 优先 + D1 回源**，重点补 Singleflight + SWR + 版本化失效。
7. **安全先行：通知用户隔离、SQL 参数化、缓存 Key 完整、事务边界、Session 持久化、token 不出服务端。**
8. **性能随后：首页聚合、索引、Cursor 分页、旧评论 N+1。**
9. **业务最后：自动保存、版本恢复、定时发布、用户关系、通知偏好、Session 审计。**

这套方案保留现有 Hono + Drizzle + Vue 3 + Cloudflare 技术路线，不推翻原有架构。评论系统与 GitHub 写操作转为外部能力，博客只维护轻量映射、token、配置与必要的异步联动。

如果只能优先做一件事：**先修安全与数据正确性（通知隔离 + 缓存 Key + SQL 参数化 + 事务 + token 管理）**；如果只能优先做一个架构改进：**升级 Cache Plugin（L1 + L2 + Singleflight + SWR + 版本化失效），并把 discover 的 KV 优先链路作为第一个落地场景**。

---

## 参考资料

1. 项目仓库：[https://github.com/rx-ted/app-repo](https://github.com/rx-ted/app-repo)
2. Gitalk 2.0：[https://github.com/gitalk/gitalk](https://github.com/gitalk/gitalk)
3. GitHub Discussions Quickstart：[https://docs.github.com/en/discussions/quickstart](https://docs.github.com/en/discussions/quickstart)
4. GitHub Discussions 启用说明：[https://docs.github.com/en/enterprise-cloud@latest/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/enabling-or-disabling-github-discussions-for-a-repository](https://docs.github.com/en/enterprise-cloud@latest/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/enabling-or-disabling-github-discussions-for-a-repository)
5. giscus（另一种 Discussions 组件，可作对比）：[https://github.com/giscus/giscus](https://github.com/giscus/giscus)
6. GitHub App 用户授权与 token：[https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)
7. GitHub REST - Repository contents：[https://docs.github.com/en/rest/repos/contents](https://docs.github.com/en/rest/repos/contents)
8. GitHub GraphQL - Discussions：[https://docs.github.com/en/graphql/reference/objects#discussion](https://docs.github.com/en/graphql/reference/objects#discussion)
9. Cloudflare KV：[https://developers.cloudflare.com/kv/](https://developers.cloudflare.com/kv/)

> 本文是架构建议与实施清单，不代表已完成代码实现、数据库迁移、GitHub App 配置或性能压测。所有代码路径和现状结论应在真正实施时再次对照最新 `main` 分支确认。
