# Todo

## Pending

- [ ] **Blog statistics** — Design counter system for views, likes, comments with write-behind cache pattern (KV → DB flush)

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

| 项目 | 风格 | 评价 | 可借鉴 |
|------|------|------|--------|
| [YYsuni/2025-blog-public](https://github.com/YYsuni/2025-blog-public) | 卡片仪表盘 + Liquid Grass 动效 + 拖拽布局 | 功能全但**太重**，像桌面不像博客 | 自定义光标、明暗主题 |
| [QNquenan/Simple-Homepage](https://github.com/QNquenan/Simple-Homepage) | 个人导航页（Link-in-Bio） | 极简但**没有文章内容**，只是导航 | JSON 配置驱动、打字机效果 |

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
