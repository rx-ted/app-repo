---
title: 架构概览
author: rx-ted
date: 2026-07-22
category: architecture
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: zh-CN
---

[English](./README.md) | **中文**

# 架构

## 项目概览

`@rx-ted/app` — 基于 Turborepo 的全栈博客平台，Monorepo 单仓管理所有代码。

## 分层

| 层 | 技术 | 目录 |
| --- | --- | --- |
| 前端 | Vue 3.5 + Vite 8 + Naive UI | `apps/web-blog/` |
| 后端 | Hono 4.12 + Honest DI | `apps/platform-api/` |
| 共享包 | TypeScript 6.0 | `packages/*/` |

## 核心包

| 包 | 用途 |
| --- | --- |
| `packages/core` | 跨运行时工具（Env, Logger, Platform） |
| `packages/honest` | 基于 Hono 的 NestJS 风格 DI 框架 |
| `packages/honest-plugins` | 插件集合（db, cache, mail, s3, api-doc, counter） |

## 依赖流向

```
apps/web-blog → apps/platform-api
apps/platform-api → packages-core, packages-honest, honest-plugins/*
packages-honest → packages-core
honest-plugins/* → packages-core, packages-honest (peer)
```

## 基础设施

| 服务 | 用途 | 本地启动 |
| --- | --- | --- |
| MySQL | 主数据库 | `docker compose up -d mysql` |
| Redis | 缓存 | `docker compose up -d redis` |

## 仓库策略

见 [repository-strategy.md](./repository-strategy.md)。

---

## Markdown 编辑器（`packages/markdown-editor`）

`@rx-ted/packages-markdown-editor` 是可复用的 Vue 3 markdown 编辑器 + 渲染管线包，采用单管线共享架构：

```
markdown source
      │
      ▼
┌──────────────────────────────────────────────────────────────┐
│ Render pipeline (core/markdown.ts)                            │
│ unified: remark-parse → remark plugins → remark-rehype       │
│          → rehype plugins → rehype-pretty-code (shiki)        │
│          → rehype-slug → rehype-autolink-headings → stringify │
└──────────────────────────────────────────────────────────────┘
      │  html + sourceNodes
      ▼
┌──────────────────────────────────────────────────────────────┐
│ MarkdownRenderer.vue                                         │
│ • injects the active theme stylesheet (<link>, scoped)        │
│ • renders html, then client-side: code copy/fold/line buttons │
│ • renders mermaid, makes task checkboxes clickable            │
│ • emits ready { nodes, rootEl } for the sync engine           │
└──────────────────────────────────────────────────────────────┘
      │
      ├──────────────► Sync engine (sourcemap ↔ scroll linking)
      ├──────────────► Theme system (data-driven, per-theme CSS)
      └──────────────► PDF export (overlay + print page attrs)
```

四大支柱，各有深入文档：

| Pillar | File | Doc |
| --- | --- | --- |
| Render pipeline | `src/core/markdown.ts`, `src/core/rehypeCodeGroup.ts` | [render-pipeline.zh.md](./render-pipeline.zh.md) |
| Theme system | `src/core/themes.ts`, `src/themes/*`, `src/core/themeCss.ts` | [theme-system.zh.md](./theme-system.zh.md) |
| Sync engine | `src/core/sourcemap.ts`, `remarkSourceMap.ts`, `syncEngine.ts`, `domIndex.ts` | [sync-engine.zh.md](./sync-engine.zh.md) |
| PDF export | `src/components/MarkdownEditor.vue` (overlay + print CSS) | [pdf-export.zh.md](./pdf-export.zh.md) |

### Key design decisions

- **A single unified pipeline** (`buildMarkdownPipeline`) is shared by the editor preview and `MarkdownRenderer`, so standalone rendering and the in-editor preview always agree. Options (`sourceMap`, `codeTheme`, `interactiveTasks`) are additive.
- **Themes are data + CSS assets, not logic.** `themes.ts` holds the shape (typography, palettes, code theme, mermaid theme, `darkable`, `source`); the real styling lives in `src/themes/*.scss`, compiled per theme and injected as a scoped `<link>` at runtime. Only the active theme is fetched.
- **The code theme owns the code-block background.** `keepBackground: true` writes shiki's background onto `<pre>`, so blocks always match their highlight theme and never fight the reading theme.
- **Editor ↔ preview sync is source-map driven.** Every rendered node carries a `data-node` index back to its markdown offsets; `SyncEngine` turns that into scroll linking and heading navigation.
- **PDF export never depends on consumer layout.** It re-renders the document standalone in a teleported overlay and attaches every page attribute to a stable `#export-pdf-preview` node (named `@page`, break rules, `print-color-adjust: exact`).

任务导向的用法见 [guides](../guides/README.zh.md)（组件 API、自定义主题、本地化、开发工作流）。
