---
title: Guides
author: rx-ted
date: 2026-08-05
category: guide
status: published
visibility: public
allow_comment: true
pinned: true
featured_weight: 0
lang: en
---

**English** | [中文](./README.zh.md)

# Guides

| Guide | Description |
| --- | --- |
| [getting-started](./getting-started.md) | Local development environment setup |
| [development](./development.md) | Daily development workflow |
| [version-management](../implementations/version-management-design.md) | Version management & changelog (unimplemented design proposal) |
| [api](./api.md) | Platform API tech stack and module overview |
| [packages](./packages.md) | Shared package reference |
| [e2e-testing](./e2e-testing.md) | E2E testing workflow |
| [api-routes](./api-routes.md) | Full API route documentation |
| [markdown-syntax](./markdown-syntax.md) | Supported Markdown syntax quick reference |
| [front-matter](./front-matter.md) | Front matter fields reference for posts |
| [github-actions](./github-actions.md) | GitHub Actions workflows (CI / auto-merge / release / npm OIDC) |

### `packages/markdown-editor` usage guide

| Guide | Description |
| --- | --- |
| [components](./components.md) | `MarkdownEditor` + `MarkdownRenderer` props/events, rendering features, core exports |
| [custom-themes](./custom-themes.md) | Build and register custom preview themes |
| [localization](./localization.md) | `createI18n`, overrides, `registerLocale` |
| [markdown-editor-development](./markdown-editor-development.md) | Repository layout, scripts, build notes, testing |

> The package's internals are covered in [docs/architecture/](../architecture/) (render-pipeline / theme-system / sync-engine / pdf-export).

## Quick links

| Documentation | Location |
| --- | --- |
| Architecture overview | [docs/architecture/README.md](../architecture/README.md) |
| Repository strategy | [docs/architecture/repository-strategy.md](../architecture/repository-strategy.md) |
| Database schema | [docs/architecture/schema.md](../architecture/schema.md) |
