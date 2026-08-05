---
title: 共享包
author: rx-ted
date: 2026-07-22
category: guide
tags:
  - packages
  - npm
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: zh-CN
---

[English](./packages.md) | **中文**

# 共享包

见 [docs/plans/2026-07-19-proposal-package-namespace.md](../plans/2026-07-19-proposal-package-namespace.md) 了解包命名和发布规范。

## packages-core

**目录**: `packages/core/`  
**npm**: `@rx-ted/packages-core`  
**用途**: 跨运行时工具（Env, Logger, Platform）

- `Env` — 环境变量管理（loadEnv, var, set, mode）
- `Logger` — 跨运行时日志（Node/Deno/Bun/CF Workers）
- `Platform` — 运行时上下文（request, response, env bindings）

依赖：pino, zod（peer）

详见 [packages/core/README.md](../../packages/core/README.md)。

---

## packages-honest

**目录**: `packages/honest/`  
**npm**: `@rx-ted/packages-honest`  
**用途**: 基于 Hono 的 NestJS 风格 DI 框架

| 组件 | 用途 |
| --- | --- |
| `Application` | 应用入口（create + 生命周期钩子）|
| `Container` | DI 容器（构造器注入）|
| `ComponentManager` | 管理 Controller/Service/Guard/Pipe/Filter |
| `RouteManager` | 路由注册到 Hono 实例 |
| `MetadataRepository` | 装饰器元数据存储 |
| `PluginEngine` | 插件生命周期管理（bootstrap/destroy）|

装饰器：@Controller, @Module, @Service, @Injectable, @Inject, @Get/@Post/@Put/@Patch/@Delete, @Body/@Param/@Query/@Ctx, @UseGuards, @Public, @UseFilters, @UsePipes, @UseMiddleware

依赖：packages-core; peer: hono

详见 [packages/honest/README.md](../../packages/honest/README.md)。

---

## packages-honest-plugins

**目录**: `packages/honest-plugins/`  
**npm**: `@rx-ted/packages-honest-plugins`（barrel）  
**用途**: 插件集合（通过 barrel 导入）

| 插件 | 子包 | 用途 |
| --- | --- | --- |
| `db` | `@rx-ted/packages-honest-plugins-db` | 数据库（Drizzle ORM + MySQL/SQLite/D1/PostgreSQL） |
| `cache` | `@rx-ted/packages-honest-plugins-cache` | 缓存（Redis/KV/Local） |
| `mail` | `@rx-ted/packages-honest-plugins-mail` | 邮件（Resend/Brevo/SMTP） |
| `s3` | `@rx-ted/packages-honest-plugins-s3` | 对象存储（AWS S3） |
| `api-doc` | `@rx-ted/packages-honest-plugins-api-doc` | OpenAPI 文档 + Scalar UI |
| `counter` | `@rx-ted/packages-honest-plugins-counter` | 基于 Durable Objects 的计数器聚合 |

导入方式：

```ts
import { DbService } from '@rx-ted/packages-honest-plugins/db'
import { CacheService } from '@rx-ted/packages-honest-plugins/cache'
```

子包为 `private: true`，仅通过 barrel 发布。

详见各插件 README：
- [db/README.md](../../packages/honest-plugins/db/README.md)
- [cache/README.md](../../packages/honest-plugins/cache/README.md)
- [mail/README.md](../../packages/honest-plugins/mail/README.md)
- [s3/README.md](../../packages/honest-plugins/s3/README.md)
- [api-doc/README.md](../../packages/honest-plugins/api-doc/README.md)
- [counter/README.md](../../packages/honest-plugins/counter/README.md)

---

## packages-markdown-editor

**目录**: `packages/markdown-editor/`  
**npm**: `@rx-ted/packages-markdown-editor`  
**用途**: 可复用的 Vue 3 Markdown 编辑器 + 渲染管线（Vite 构建的 ESM 发行包）

- `MarkdownEditor` — 分栏编辑器（编辑 + 预览 + 工具栏 + TOC + PDF 导出）
- `MarkdownRenderer` — 只读渲染组件，与编辑器预览共用同一渲染管线
- 统一 unified remark→rehype→shiki 管线（`buildMarkdownPipeline`）
- 6 个内置阅读主题 + 独立代码主题选择器，主题按需注入 scoped `<link>`

依赖：unified/remark/rehype/shiki/katex/mermaid 等；peer: vue、naive-ui、@iconify/vue

详见 [packages/markdown-editor/README.md](../../packages/markdown-editor/README.md)。
