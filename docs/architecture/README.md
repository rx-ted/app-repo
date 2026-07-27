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
---

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
| MySQL | 主数据库 | `docker compose up -d db` |
| Redis | 缓存 | `docker compose up -d cache` |

## 仓库策略

见 [repository-strategy.md](./repository-strategy.md)。
