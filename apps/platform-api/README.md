# @rx-ted/platform-api

API 服务端 — Honest 框架 + Hono + Drizzle ORM。

## 目录

```
src/
  index.ts            — 应用入口，注册插件/模块
  app.module.ts       — 根模块
  modules/            — 业务模块（21 个）
    auth/             — 认证（登录/注册/会话/OAuth/Email）
    post/             — 文章 CRUD + 版本管理
    comment/          — 评论 + 点赞/举报/线程
    user/             — 用户资料/管理
    blog/             — 博客摘要/首页数据
    category/         — 分类 CRUD
    tags/             — 标签 CRUD
    search/           — 搜索端点
    notification/     — 通知（站内 + 邮件）
    role/             — 角色管理
    permission/       — 权限管理
    permission-request/ — 权限请求审批流程
    audit/            — 审计日志
    announcement/     — 公告 CRUD
    mail/             — 邮件发送
    post-stats/       — 文章浏览量统计
    author-stats/     — 作者统计
    friend-link/      — 友情链接
    system/           — 系统初始化 + 健康检查
    hello/            — 测试端点
    geoip/            — IP 地理定位服务
  common/             — 通用守卫/管道/中间件
  lib/                — 工具函数/OpenAPI/插件注册
  schema/             — Drizzle 数据库 Schema
  pages/              — 首页/404 页面
```

## 插件

| 插件 | 用途 |
|------|------|
| `DbPlugin` | Drizzle ORM（MySQL/SQLite/D1） |
| `CachePlugin` | 缓存（Redis/KV/Local） |
| `MailPlugin` | 邮件（Resend/Brevo/SMTP） |
| `S3Plugin` | 对象存储（AWS S3） |
| `ApiDocPlugin` | OpenAPI 规范 + Scalar UI |

## 数据库

使用 `pnpm db` 命令管理数据库：

```bash
pnpm db generate   # 生成 SQL 迁移
pnpm db push       # 应用迁移
pnpm db pull       # 从数据库拉取 Schema
pnpm db studio     # 打开 Drizzle Studio
pnpm db drop       # 删除数据库
```

## 开发

```bash
pnpm dev           # 开发模式（Bun 热重载）
pnpm dev:cf        # Cloudflare Workers 模式
pnpm test          # 运行测试
pnpm typecheck     # 类型检查
pnpm build         # 构建
```
