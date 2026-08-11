# Todo

## Pending

### Blog statistics

- [x] Design counter system for views, likes, comments with write-behind cache pattern (KV → DB flush) — `StatsBufferService` + `@rx-ted/packages-honest-plugins/counter`

### 功能计划（来源：`PLAN.md` 审计，2026-08 代码核对）

#### IP 地理定位（§1.1）

- 状态：部分实现 — 评论已记录城市（`comments.city`），Session 已有 `city`
- [ ] 登录时记录城市到用户记录；audit_log 增加城市字段

#### 用户在线状态（§1.2）

- 状态：部分实现 — 心跳接口 `PUT /user/heartbeat` + 前端绿点已有
- [ ] `users` 表增加 `last_active_at` 并持久化，用户/作者信息接口返回（当前仅存在于 session 缓存）

#### 文章统计缓存（§1.4）

- 状态：已实现（以缓存失效代替 +1/-1 增量）— `GET /posts/calendar` + `cacheable` 首次回源 + 写失效，日历组件已接入

#### 评论增强（§1.5）

- 状态：部分实现 — IP/UA/城市已记录，随机头像已生成（Gravatar/DiceBear）
- [ ] 解析并结构化存储 OS/浏览器版本（当前仅存原始 `user_agent`）

#### 标签/分类审批工作流（§1.6）

- 状态：部分实现 — 表结构/权限常量/`findApprovers`/approve-reject 接口/前端审批页均存在（设计文档标注 NOT IMPLEMENTED）
- [ ] `POST /tags`、`POST /categories` 非管理员改走审批请求（创建时带 `entity_type`/`entity_data`）
- [ ] approve 时自动创建对应 tag/category 实体

#### 用户布局持久化（§2.1）

- 状态：已实现 — `layoutStore` 持久化到 `localStorage`（含单测）

#### 标签页面重新设计（§2.3）

- 状态：已实现 — `TagList`（Top10 + 比例条）+ `/tags/:name` 时间线详情页

#### 分类页面重新设计（§2.4）

- 状态：部分实现 — 分类详情页与标签详情页一致
- [ ] 分类主列表页 / `CategoryList` 与标签页结构保持一致

#### 归档/时间线（§2.5）

- 状态：已实现 — `ArchivePage`（`/archive`）
- [ ] （可选）接入未使用的 `ArchiveTimeline.vue`，否则删除

#### 相册页面（§2.7）

- 状态：未实现
- [ ] 相册页面（上传和预览）
- [ ] 相册 API 支持

#### 链接菜单（§2.8）

- 状态：已实现 — 顶栏 Discover → `/discover` 友链页

#### 日历组件（§2.9）

- 状态：已实现 — `CalendarPage`/`CalendarWidget` 每日篇数 + 后端接口 + 缓存

#### 评论增强前端（§2.10）

- 状态：已实现 — 未登录昵称/邮箱/网址、IP/UA 自动捕获、随机头像展示

## 已实现功能（2026-08 代码核对，供后续对比）

> 依据：本次代码审计。`部分实现` 项的剩余缺口见上方 `Pending → 功能计划`。

| 功能                                           | 状态    | 实现位置                                                                                                                                                                                                                     |
| ---------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blog statistics（浏览/点赞/评论 write-behind） | ✅      | `apps/platform-api/src/modules/post-stats/stats-buffer.service.ts` + `@rx-ted/packages-honest-plugins/counter`                                                                                                               |
| IP 地理定位（§1.1）                            | 🟡 部分 | `modules/geoip/geoip.service.ts`；评论城市 `comment.service.ts:62` → `comments.city`；Session 城市 `session-manager.service.ts:67`                                                                                           |
| 用户在线状态（§1.2）                           | 🟡 部分 | 心跳 `PUT /user/heartbeat`（`modules/user/user.controller.ts:36-49`）；前端绿点 `stores/auth.ts` + `composables/useHeartbeat.ts`                                                                                             |
| 文章统计缓存（§1.4）                           | ✅      | `GET /posts/calendar`（`post.controller.ts:96-118`）；`getCalendarCounts()` 首次回源 + cacheable（`post.service.ts:167-197`）；写失效 `cache-invalidation.service.ts`                                                        |
| 评论增强后端（§1.5）                           | 🟡 部分 | IP/UA/城市入库（`comment.controller.ts` `@Ip()`/`@UA()` → `comment.service.ts`）；随机头像 `buildGuestAuthorBrief()`（Gravatar/DiceBear）                                                                                    |
| 标签/分类审批基础设施（§1.6）                  | 🟡 部分 | `permissionRequests.entity_type/entity_data` 列；权限常量 `tags:approve`/`category:approve`；`tags/category.service.ts` `findApprovers()`；`POST /permission-request/:id/approve\|reject`；前端 `dashboard/RequestsPage.vue` |
| 用户布局持久化（§2.1）                         | ✅      | `stores/layout.ts` `loadFromStorage()`/`persistToStorage()` → `localStorage`（key `userLayout`）；单测 `layout.spec.ts`                                                                                                      |
| 标签页面重新设计（§2.3）                       | ✅      | `TagList.vue`（Top10 + 比例条，`component-registry` 注册为 `tag-list`）；`TagDetailPage.vue`（`/tags/:name` 时间线）                                                                                                         |
| 分类页面重新设计（§2.4）                       | 🟡 部分 | `CategoryDetailPage.vue`（`/categories/:name`）与标签详情页结构一致                                                                                                                                                          |
| 归档/时间线（§2.5）                            | ✅      | `ArchivePage.vue`（`/archive`）；另 `ArchiveTimeline.vue` 存在但未接入                                                                                                                                                       |
| 链接菜单（§2.8）                               | ✅      | 顶栏 Discover（`layouts/TopBar.vue`）→ `/discover` → `DiscoverPage.vue`；后端 `modules/discover/discover.controller.ts`                                                                                                      |
| 日历组件（§2.9）                               | ✅      | `CalendarPage.vue` + 侧栏 `CalendarWidget.vue`（每日篇数）；后端 `GET /posts/calendar`                                                                                                                                       |
| 评论增强前端（§2.10）                          | ✅      | `CommentInput.vue` 未登录昵称/邮箱/网址；`CommentItem.vue` 随机头像展示；IP/UA 由后端自动捕获                                                                                                                                |
| 站点信息运行时获取                             | ✅      | `web-blog/src/config/site.ts` `fetchSiteConfig()` → `GET /api/v1/system/info`（SeoHead.vue 调用）                                                                                                                            |

## API Changes — Frontend 需同步

### Login/Register 相关

- **`POST /auth/login`** — 返回值**不再包含 `user` 字段**。仅返回 `accessToken`、`expiresIn`、`sessionId`
- **`POST /auth/register`** — 同上
- **`POST /auth/email/login`** — 同上
- **`POST /auth/email/register`** — 同上
- 登录后请调用 `GET /user/me` 获取当前用户信息

### 用户信息 API 整合

- **`GET /user/me`** — **返回值已变更**。现在返回**完整的 `UserProfile`**（驼峰命名），包含所有字段：

  ```jsonc
  {
    "id": "string",
    "username": "string",
    "email": "string | null",
    "preferredLocale": "zh-CN | en",
    "status": "NORMAL | MUTED | BANNED | DELETED",
    "tokenVersion": "number",
    "lastLoginAt": "string | null",
    "nickname": "string | null",
    "avatarUrl": "string | null",
    "gender": "Male | Female | Unknown | null",
    "birthday": "string | null",
    "bio": "string | null",
    "website": "string | null",
    "location": "string | null",
  }
  ```

  > ⚠️ 之前返回的是 snake_case 的 `preferred_locale`、`last_login_at`、`created_at`、`updated_at`，现已改为驼峰。同时新增了 `email`、`tokenVersion`、`gender`、`birthday`、`website` 等字段。

- **`GET /user/me/profile`** — **已删除**。请使用 `GET /user/me` 替代
- **`GET /auth/me`** — 返回值不变，仍返回同样的 `UserProfile` 格式

### 需要前端修改的文件

- 登录页面：登录后调用 `GET /user/me` 获取用户信息
- 用户资料展示页：更新字段名为驼峰命名
- 用户资料编辑页：使用驼峰命名字段提交

### 站点信息获取方式变更 — VITE 构建变量 → API 运行时获取

**`web-blog/src/config/site.ts`** — 已重构为：

- 导出**响应式** `siteConfig` 对象（Vue `reactive`），含默认值
- `fetchSiteConfig()` — 调用 `GET /api/v1/system/info` 异步获取，合并到 reactive 对象
- `SeoHead.vue` 在 `onMounted` 时调用 `fetchSiteConfig()`

**`GET /api/v1/system/info` 返回结构：**
| 字段 | 说明 | 来源 |
|------|------|------|
| `siteName` | 站点名称 | `VITE_SITE_NAME` / `SITE_NAME` |
| `siteUrl` | 站点完整 URL | `VITE_SITE_URL` / `SITE_URL` |
| `siteDesc` | 站点描述 | `VITE_SITE_DESCRIPTION` / `SITE_DESCRIPTION` |
| `siteImg` | OG 图片路径 | `VITE_SITE_OG_IMAGE` / `SITE_OG_IMAGE` / `SITE_IMG` |
| `author` | 作者名 | `VITE_SITE_AUTHOR` / `SITE_AUTHOR` |
| `version` | 应用版本 | `package.json` |
| `gitUrl` | 仓库 URL | `GITHUB_REPO_OWNER`+`GITHUB_REPO_NAME` 拼接 / `GIT_URL` |
| `license` | 许可协议 | `SITE_LICENSE` |
| `runtime` | 运行时环境 | 自动检测 |
| `uptime` | 运行时长 | 自动计算 |
| `env` | 环境模式 | 自动检测 |

**已删除的 VITE 构建变量：** `VITE_SITE_NAME`、`VITE_SITE_DESCRIPTION`、`VITE_SITE_OG_IMAGE`、`VITE_SITE_AUTHOR` 不再需要。`VITE_API_BASE_URL` 保留用于 API 地址。

- [ ] rss subscriber
- [ ] fix toTop
- [ ] article detail page backend
- [ ] fix toc

## Blog 首页设计

> 追求**与众不同 + 简洁**。目标：一眼记住，不油腻。

### 参考项目

| 项目                                                                    | 风格                                      | 评价                             | 可借鉴                    |
| ----------------------------------------------------------------------- | ----------------------------------------- | -------------------------------- | ------------------------- |
| [YYsuni/2025-blog-public](https://github.com/YYsuni/2025-blog-public)   | 卡片仪表盘 + Liquid Grass 动效 + 拖拽布局 | 功能全但**太重**，像桌面不像博客 | 自定义光标、明暗主题      |
| [QNquenan/Simple-Homepage](https://github.com/QNquenan/Simple-Homepage) | 个人导航页（Link-in-Bio）                 | 极简但**没有文章内容**，只是导航 | JSON 配置驱动、打字机效果 |

### 设计原则

- 内容优先，动效克制
- 移动端优先（竖屏阅读）
- 首屏 = 文章列表或精选内容，不藏功能
- 配置与内容分离，方便迭代

### 候选方案

- [ ] **1. 终端/命令行** — 全黑 + 等宽字体，文章像命令输出，`$ cat latest.md` | 成本：低 | 独特：★★★★
- [x] **2. 单页滚动** — 无分页，精选→最近发布，半幅内容区 + 双侧栏 | 成本：中 | 独特：★★★
- [ ] **3. 杂志/报纸排版** — 大标题 + 大留白，一张大图配长标题 | 成本：中 | 独特：★★★★
- [ ] **4. 时间线** — 垂直时间轴，文章按时间左右交替 | 成本：中 | 独特：★★★
- [ ] **5. 书签/笔记型** — 便签纸或书签样式，手写体标题 + 标签色块 | 成本：中 | 独特：★★★★
- [ ] **6. 作品集型** — 每篇文章 = 项目展示，悬停摘要，点击详情 | 成本：中 | 独特：★★★
- [ ] **7. 地图/图谱型** — 文章按主题聚类成岛屿/节点，可视化知识关联 | 成本：高 | 独特：★★★★★

### 推荐组合

- **终端 + 单页滚动** — 技术感强、实现简单、视觉独特
- **杂志排版 + 单页滚动** — 冲击力强、适合长文/深度内容

### 实现方案

- **布局**：沿用 FullLayout（TopBar + 双 aside + footer），只改 HomePage 内容区
- **Hero**：保留现有 HeroSection 轮播
- **文章列表**：去掉分页，spotlight + list 混合展示
- **左侧栏**：首页保持隐藏
- **预览文件**：`blog-homepage-preview.html`

### 下一步

1. ~~选定方案~~ ✅
2. ~~出 wireframe~~ ✅ `blog-homepage-preview.html`
3. ~~改造 HomePage.vue~~ ✅ 去分页，spotlight+list 单列
4. ~~拆分 NetworkCard~~ ✅ → AuthorProfileCard + BlogStatsCard（新增点赞/评论）
5. ~~修复 BlogStatsCard 溢出~~ ✅ 自适应 grid + text-overflow
