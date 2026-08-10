---
title: 指南
author: rx-ted
date: 2026-07-22
category: guide
status: published
visibility: public
allow_comment: true
pinned: true
featured_weight: 0
lang: zh-CN
---

[English](./README.md) | **中文**

# 指南

| 指南                                                                  | 说明                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------- |
| [getting-started](./getting-started.zh.md)                            | 本地开发环境搭建                                              |
| [development](./development.zh.md)                                    | 日常开发工作流程                                              |
| [version-management](../implementations/version-management-design.md) | 版本管理与变更日志（未实现的方案设计）                        |
| [api](./api.zh.md)                                                    | Platform API 技术栈与模块概览                                 |
| [packages](./packages.zh.md)                                          | 共享包说明                                                    |
| [e2e-testing](./e2e-testing.zh.md)                                    | E2E 测试流程                                                  |
| [api-routes](./api-routes.md)                                         | API 路由完整文档                                              |
| [markdown-syntax](./markdown-syntax.zh.md)                            | Markdown 语法速查                                             |
| [front-matter](./front-matter.zh.md)                                  | 文章 Front Matter 字段参考                                    |
| [github-actions](./github-actions.zh.md)                              | GitHub Actions 工作流（CI / auto-merge / release / npm OIDC） |

### `packages/markdown-editor` 使用指南

| 指南                                                               | 说明                                                                   |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| [components](./components.zh.md)                                   | `MarkdownEditor` + `MarkdownRenderer` props/events、渲染特性、核心导出 |
| [custom-themes](./custom-themes.zh.md)                             | 构建并注册自定义预览主题                                               |
| [localization](./localization.zh.md)                               | `createI18n`、覆写、`registerLocale`                                   |
| [markdown-editor-development](./markdown-editor-development.zh.md) | 仓库布局、脚本、构建注意事项、测试                                     |

> 该包内部原理见 [docs/architecture/](../architecture/)（render-pipeline / theme-system / sync-engine / pdf-export）。

## 快速链接

| 文档          | 位置                                                                               |
| ------------- | ---------------------------------------------------------------------------------- |
| 架构概览      | [docs/architecture/README.md](../architecture/README.zh.md)                        |
| 仓库策略      | [docs/architecture/repository-strategy.md](../architecture/repository-strategy.md) |
| 数据库 Schema | [docs/architecture/schema.md](../architecture/schema.zh.md)                        |
