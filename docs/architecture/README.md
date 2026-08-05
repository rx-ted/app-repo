---
title: Architecture Overview
author: rx-ted
date: 2026-08-05
category: architecture
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: en
---

**English** | [中文](./README.zh.md)

# Architecture

## Project Overview

`@rx-ted/app` — a full-stack blog platform built on Turborepo, with a monorepo managing all code in one place.

## Layers

| Layer | Tech | Directory |
| --- | --- | --- |
| Frontend | Vue 3.5 + Vite 8 + Naive UI | `apps/web-blog/` |
| Backend | Hono 4.12 + Honest DI | `apps/platform-api/` |
| Shared packages | TypeScript 6.0 | `packages/*/` |

## Core packages

| Package | Purpose |
| --- | --- |
| `packages/core` | Cross-runtime utilities (Env, Logger, Platform) |
| `packages/honest` | NestJS-style DI framework built on Hono |
| `packages/honest-plugins` | Plugin collection (db, cache, mail, s3, api-doc, counter) |

## Dependency flow

```
apps/web-blog → apps/platform-api
apps/platform-api → packages-core, packages-honest, honest-plugins/*
packages-honest → packages-core
honest-plugins/* → packages-core, packages-honest (peer)
```

## Infrastructure

| Service | Purpose | Local startup |
| --- | --- | --- |
| MySQL | Primary database | `docker compose up -d mysql` |
| Redis | Cache | `docker compose up -d redis` |

## Repository Strategy

See [repository-strategy.md](./repository-strategy.md).

---

## Markdown editor (`packages/markdown-editor`)

`@rx-ted/packages-markdown-editor` is a reusable Vue 3 markdown editor + rendering pipeline package, built on a shared single-pipeline architecture:

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

Four pillars, each with dedicated documentation:

| Pillar | File | Doc |
| --- | --- | --- |
| Render pipeline | `src/core/markdown.ts`, `src/core/rehypeCodeGroup.ts` | [render-pipeline.md](./render-pipeline.md) |
| Theme system | `src/core/themes.ts`, `src/themes/*`, `src/core/themeCss.ts` | [theme-system.md](./theme-system.md) |
| Sync engine | `src/core/sourcemap.ts`, `remarkSourceMap.ts`, `syncEngine.ts`, `domIndex.ts` | [sync-engine.md](./sync-engine.md) |
| PDF export | `src/components/MarkdownEditor.vue` (overlay + print CSS) | [pdf-export.md](./pdf-export.md) |

### Key design decisions

- **A single unified pipeline** (`buildMarkdownPipeline`) is shared by the editor preview and `MarkdownRenderer`, so standalone rendering and the in-editor preview always agree. Options (`sourceMap`, `codeTheme`, `interactiveTasks`) are additive.
- **Themes are data + CSS assets, not logic.** `themes.ts` holds the shape (typography, palettes, code theme, mermaid theme, `darkable`, `source`); the real styling lives in `src/themes/*.scss`, compiled per theme and injected as a scoped `<link>` at runtime. Only the active theme is fetched.
- **The code theme owns the code-block background.** `keepBackground: true` writes shiki's background onto `<pre>`, so blocks always match their highlight theme and never fight the reading theme.
- **Editor ↔ preview sync is source-map driven.** Every rendered node carries a `data-node` index back to its markdown offsets; `SyncEngine` turns that into scroll linking and heading navigation.
- **PDF export never depends on consumer layout.** It re-renders the document standalone in a teleported overlay and attaches every page attribute to a stable `#export-pdf-preview` node (named `@page`, break rules, `print-color-adjust: exact`).

For task-oriented usage, see [guides](../guides/).
