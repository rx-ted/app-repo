---
title: Shared packages
author: rx-ted
date: 2026-08-05
category: guide
tags:
  - packages
  - npm
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: en
---

**English** | [中文](./packages.zh.md)

# Shared packages

See [docs/plans/2026-07-19-proposal-package-namespace.md](../plans/2026-07-19-proposal-package-namespace.md) for the package naming and publishing conventions.

## packages-core

**Directory**: `packages/core/`  
**npm**: `@rx-ted/packages-core`  
**Purpose**: cross-runtime utilities (Env, Logger, Platform)

- `Env` — environment variable management (loadEnv, var, set, mode)
- `Logger` — cross-runtime logging (Node/Deno/Bun/CF Workers)
- `Platform` — runtime context (request, response, env bindings)

Dependencies: pino, zod (peer)

See [packages/core/README.md](../../packages/core/README.md).

---

## packages-honest

**Directory**: `packages/honest/`  
**npm**: `@rx-ted/packages-honest`  
**Purpose**: a NestJS-style DI framework built on Hono

| Component | Purpose |
| --- | --- |
| `Application` | app entry point (create + lifecycle hooks) |
| `Container` | DI container (constructor injection) |
| `ComponentManager` | manages Controller/Service/Guard/Pipe/Filter |
| `RouteManager` | registers routes on the Hono instance |
| `MetadataRepository` | decorator metadata storage |
| `PluginEngine` | plugin lifecycle management (bootstrap/destroy) |

Decorators: @Controller, @Module, @Service, @Injectable, @Inject, @Get/@Post/@Put/@Patch/@Delete, @Body/@Param/@Query/@Ctx, @UseGuards, @Public, @UseFilters, @UsePipes, @UseMiddleware

Dependencies: packages-core; peer: hono

See [packages/honest/README.md](../../packages/honest/README.md).

---

## packages-honest-plugins

**Directory**: `packages/honest-plugins/`  
**npm**: `@rx-ted/packages-honest-plugins` (barrel)  
**Purpose**: the plugin collection (imported through the barrel)

| Plugin | Sub-package | Purpose |
| --- | --- | --- |
| `db` | `@rx-ted/packages-honest-plugins-db` | database (Drizzle ORM + MySQL/SQLite/D1/PostgreSQL) |
| `cache` | `@rx-ted/packages-honest-plugins-cache` | caching (Redis/KV/Local) |
| `mail` | `@rx-ted/packages-honest-plugins-mail` | email (Resend/Brevo/SMTP) |
| `s3` | `@rx-ted/packages-honest-plugins-s3` | object storage (AWS S3) |
| `api-doc` | `@rx-ted/packages-honest-plugins-api-doc` | OpenAPI docs + Scalar UI |
| `counter` | `@rx-ted/packages-honest-plugins-counter` | counter aggregation based on Durable Objects |

Importing:

```ts
import { DbService } from '@rx-ted/packages-honest-plugins/db'
import { CacheService } from '@rx-ted/packages-honest-plugins/cache'
```

The sub-packages are `private: true` and only published through the barrel.

See each plugin's README:
- [db/README.md](../../packages/honest-plugins/db/README.md)
- [cache/README.md](../../packages/honest-plugins/cache/README.md)
- [mail/README.md](../../packages/honest-plugins/mail/README.md)
- [s3/README.md](../../packages/honest-plugins/s3/README.md)
- [api-doc/README.md](../../packages/honest-plugins/api-doc/README.md)
- [counter/README.md](../../packages/honest-plugins/counter/README.md)

---

## packages-markdown-editor

**Directory**: `packages/markdown-editor/`  
**npm**: `@rx-ted/packages-markdown-editor`  
**Purpose**: a reusable Vue 3 Markdown editor + rendering pipeline (ESM distribution built with Vite)

- `MarkdownEditor` — split-pane editor (edit + preview + toolbar + TOC + PDF export)
- `MarkdownRenderer` — read-only render component sharing the same rendering pipeline as the editor preview
- unified remark→rehype→shiki pipeline (`buildMarkdownPipeline`)
- 6 built-in reading themes + an independent code-theme picker; themes are injected as scoped `<link>` on demand

Dependencies: unified/remark/rehype/shiki/katex/mermaid, etc.; peer: vue, naive-ui, @iconify/vue

See [packages/markdown-editor/README.md](../../packages/markdown-editor/README.md).
