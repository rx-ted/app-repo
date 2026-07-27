---
title: platform-api — API 服务器
author: rx-ted
date: 2026-07-22
category: guide
tags:
  - api
  - hono
  - backend
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
---

# platform-api — API 服务器

基于 Hono + Honest DI 框架的博客平台 API，服务 web-blog 前端。

## 技术栈

- 运行时：Node.js（Bun dev / Node prod）
- 框架：Hono 4.12 + Honest（NestJS 风格 DI）
- 数据库：MySQL / SQLite / D1（via honest-plugins/db）
- 缓存：Redis / KV / Local（via honest-plugins/cache）
- 验证：Zod / OpenAPI 自动生成
- 邮件：Resend / Brevo / SMTP（via honest-plugins/mail）
- 对象存储：AWS S3（via honest-plugins/s3）
- API 文档：OpenAPI + Scalar UI（via honest-plugins/api-doc）

## 依赖包

| 依赖 | 包名 |
| --- | --- |
| packages-core | `@rx-ted/packages-core` |
| packages-honest | `@rx-ted/packages-honest` |
| HonestPlugins/db | `@rx-ted/packages-honest-plugins-db` |
| HonestPlugins/cache | `@rx-ted/packages-honest-plugins-cache` |
| HonestPlugins/mail | `@rx-ted/packages-honest-plugins-mail` |
| HonestPlugins/s3 | `@rx-ted/packages-honest-plugins-s3` |
| HonestPlugins/api-doc | `@rx-ted/packages-honest-plugins-api-doc` |

## 功能模块（21 个）

| 模块 | 路由前缀 | 说明 |
| --- | --- | --- |
| `auth` | `/auth` | 登录/注册/登出/刷新/Email 验证码/会话/OAuth（4 个控制器 + 4 个服务） |
| `post` | `/posts` | 文章 CRUD + 版本管理 + 统计 + CacheInvalidationService |
| `comment` | `/comments` | 评论 CRUD + 点赞/举报/线程 |
| `user` | `/user` | 用户资料/管理（UserController + AdminUserController） |
| `blog` | `/blog` | 博客摘要/首页数据（DashboardService + AuthorService） |
| `category` | `/categories` | 分类 CRUD |
| `tags` | `/tags` | 标签 CRUD |
| `search` | `/search` | 搜索端点 |
| `notification` | `/notification` | 通知（站内 + 邮件）+ 实时推送 |
| `role` | `/role` | 角色管理 |
| `permission` | `/permission` | 权限管理 |
| `permission-request` | `/permission-request` | 权限请求审批流程 |
| `audit` | `/audit` | 审计日志 |
| `announcement` | `/announcement` | 公告 CRUD |
| `mail` | `/mail` | 邮件发送 + 模板 |
| `post-stats` | `/post-stats` | 文章浏览量统计 |
| `author-stats` | `/author-stats` | 作者统计 |
| `friend-link` | `/friend-link` | 友情链接 |
| `system` | `/system` | 系统初始化 + 健康检查 + 站点信息 |
| `hello` | `/hello` | 测试端点 |
| `geoip` | — | IP 地理定位服务 |

完整 API 端点列表见 [api-routes.md](./api-routes.md)。

## 数据库（15+ 表）

| 表 | 用途 |
| --- | --- |
| users / userAuth / userProfiles / userOauth | 用户体系 |
| roles / userRoleMappings | 角色管理 |
| permissions / userPermissionMappings / rolePermissionMappings | 权限管理 |
| permissionRequests | 权限请求 |
| postCore / postContent / postRevisions / postStats | 文章体系 |
| postTagMappings / postCategoryMappings | 文章关联 |
| postTags / postCategories | 标签和分类 |
| comments / commentLikes / commentReports / postCommentThreads | 评论体系 |
| notifications | 通知 |
| auditLogs | 审计日志 |
| authorStats | 作者统计 |
| announcements | 公告 |
| versions / moduleVersions / changelogEntries / commitRecords / releases | 版本管理 |
| mailLogs | 邮件 |
| userLayoutConfigs | 用户布局配置 |
| friendLinks | 友情链接 |

## 认证体系

### 服务拆分

| 服务 | 职责 |
| --- | --- |
| `PasswordAuthService` | 密码登录（scrypt 哈希 + timing-safe 比较）|
| `EmailAuthService` | Email 验证码（6 位，5 分钟 TTL，60s 重发冷却）|
| `OAuthService` | GitHub OAuth 流程 |
| `SessionManagerService` | 会话管理（创建/列出/撤销单条/全部）|
| `AuthContextService` | 实现 `IAuthContextService` 接口，解耦认证上下文 |

### 认证流程

- JWT access token（15m 过期）
- Refresh cookie：httpOnly, secure, SameSite=Lax, path=/api/v1/auth（7d 过期）
- Token 复用检测（被盗提示）

### 控制器拆分

| 控制器 | 路由前缀 | 说明 |
| --- | --- | --- |
| `AuthController` | `/auth` | 核心认证（登录/注册/登出/刷新） |
| `AuthEmailController` | `/auth/email` | Email 验证码 |
| `AuthOAuthController` | `/auth/oauth` | OAuth（GitHub） |
| `SessionsController` | `/auth/sessions` | 会话管理 |

### 路由守卫

| 守卫 | 作用 |
| --- | --- |
| `AuthGuard` | JWT Bearer 验证（通过 `IAuthContextService` 接口解耦认证上下文） |
| `RolesGuard` | 角色检查 |
| `PermissionsGuard` | 权限码检查 |
| `RateLimitGuard` | 速率限制 |
| `EnvironmentGuard` | 生产环境拦截 |
| `InitKeyGuard` | 系统初始化密钥验证 |

## 插件

| 插件 | 包名 | 作用 |
| --- | --- | --- |
| ApiDocPlugin | `honest-plugins/api-doc` | OpenAPI 规范 + Scalar UI |
| DbPlugin | `honest-plugins/db` | Drizzle ORM + MySQL/SQLite/D1 |
| CachePlugin | `honest-plugins/cache` | Redis/KV/Local 缓存 |
| MailPlugin | `honest-plugins/mail` | Resend/Brevo/SMTP 邮件 |
| S3Plugin | `honest-plugins/s3` | AWS S3 对象存储 |

## 公共工具

- `common/utils/pagination.ts` — 分页工具（offset/limit 解析、响应格式化）
- `common/guards/auth-context.interface.ts` — `IAuthContextService` 接口（解耦认证上下文依赖）
