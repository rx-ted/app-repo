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
