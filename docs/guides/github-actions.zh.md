---
title: GitHub Actions 工作流说明
author: rx-ted
date: 2026-08-03
category: guide
tags:
  - github-actions
  - ci
  - release
  - npm
  - oidc
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: zh-CN
---

[English](./github-actions.md) | **中文**

# GitHub Actions 工作流说明

本仓库的自动化全部基于 GitHub Actions，覆盖 **CI 校验、PR 自动合并、npm 发布**。核心原则：

- **GitHub 内部操作** 使用 GitHub 自动注入的 `GITHUB_TOKEN`，无需任何手动 secret。
- **npm 发布** 使用 **OIDC Trusted Publishing**（`id-token: write` + npm 后台配置），不存放任何 npm token。
- 唯一的非自动操作是 npmjs.com 上的一次性 OIDC 配置（详见下文）。

## 工作流总览

| 文件 | 触发时机 | 作用 |
| --- | --- | --- |
| `ci.yml` | `pull_request`（opened/synchronize/reopened/ready_for_review）+ `push` main | lint/format/typecheck/test/build |
| `pr-auto-merge.yml` | `pull_request_target` | 为非 bot PR 开启 auto-merge（squash）；版本 PR 改由人工合并 |
| `release.yml` | `push` main | Changesets 版本管理 + tag + GitHub Release + npm 发布 |

## CI（`ci.yml`）

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
  push:
    branches:
      - main
```

`versify` job 依次执行：

1. `pnpm check` — Biome lint + format 检查
2. `pnpm typecheck` — 全量类型检查
3. `pnpm test` — vitest 测试
4. `pnpm build` — 构建所有包

> **注意**：CI 必须同时在 PR 和 main 上运行。之前只挂了 `pull_request_target`，导致 PR 上永远没有 status check，branch protection 的必需检查一直 pending，auto-merge 无法工作。

## PR 自动合并（`pr-auto-merge.yml`）

任何 PR 打开/更新时，用 `peter-evans/enable-pull-request-automerge@v3` 开启 auto-merge（squash）——但 **`github-actions[bot]` 创建的 PR（即 changesets 的 "Version Packages" 版本 PR）除外**，这些必须由维护者手动合并：bot 合并不会重新触发 `release.yml`（见下方"常见问题"）。

前置条件（仓库设置，需 admin）：

1. **Settings → General → Pull Requests → Allow auto-merge**：必须勾选。
2. **Settings → Branches → branch protection rule（main）**：必须启用 **Require status checks to pass before merging** 并选择 `versify`（CI）。

> 两个典型的坑：
> - 报错 `Auto merge is not allowed for this repository` → Allow auto-merge 未开。
> - 报错 `Protected branch rules not configured for this branch` → main 没有 branch protection。
> - 报错 `Pull request is in clean status` → branch protection 没真正关联 status check，PR 无待满足条件。

## 发布（`release.yml`）

触发：push 到 main。核心逻辑由 `changesets/action` 驱动：

```
push main → 检查 .changeset/*.md
  ├─ 有 changeset → 创建/更新 "Version Packages" PR
  │     维护者手动合并 → version bump + changelog 落在 main → 再次触发本流程
  └─ 无 changeset（版本 PR 合并后）→ Build → Tag → GitHub Release → npm publish (OIDC)
```

### 版本变更

- 版本只通过 **changeset 文件**驱动，日常开发不手动改 `package.json`。
- 写 `feat` / `fix` 等变更时，记得提交对应的 `.changeset/*.md`（patch/minor/major）。
- 缺失 changeset 时可手动补一个 patch changeset，push 后由 CI 自动打版本。

### npm 发布（OIDC）

发布步骤为幂等逻辑：遍历所有非 private 包，满足以下条件才执行 `npm publish --access public --provenance`：

- 当前版本存在对应 git tag（`@rx-ted/packages-<name>@<version>`）
- 该版本尚未发布到 npm

因此即使版本 PR 合并后 workflow 未触发（见下方"常见问题"），重新触发一次也会把缺失版本补齐发布。

### npm 后台一次性配置

在 npmjs.com 上为**每个要发布的包**单独配置 Trusted Publisher（OIDC）：

1. 进入 `https://www.npmjs.com/package/<包名>` → **Settings** → **Trusted publishing**
2. 选择 GitHub Actions，填写：
   - **Organization or user**: `rx-ted`
   - **Repository**: `app-repo`
   - **Workflow filename**: `release.yml`（必须与实际执行 npm publish 的 workflow 一致，含 `.yml`）
   - **Allowed actions**: `npm publish`
3. 保存后重复配置所有包：`@rx-ted/packages-core`、`@rx-ted/packages-honest`、`@rx-ted/packages-honest-plugins`、`@rx-ted/packages-markdown-editor`

> 常见报错 `404 Not Found ... you do not have permission to access it`：Trusted Publisher 没覆盖该包，或 workflow filename 与实际执行 `npm publish` 的 workflow（`release.yml`）不一致。npm 保存时不校验，发布时才报错。

### `repository` 字段要求

每个**非 private** 包必须在 `package.json` 中配置 `repository`，且必须指向真实源码仓库（`git+https://github.com/rx-ted/app-repo.git`）。缺失或指向错误会导致 provenance 校验失败：

```text
Error verifying sigstore provenance bundle: Failed to validate repository information:
  package.json: "repository.url" is "", expected to match "https://github.com/rx-ted/app-repo"
```

```json
"repository": {
  "type": "git",
  "url": "git+https://github.com/rx-ted/app-repo.git"
}
```

## Token 策略

| 用途 | 方式 | 是否需要手动配置 |
| --- | --- | --- |
| CI / PR 合并 / 打 tag / 建 Release | `GITHUB_TOKEN`（自动注入） | 否 |
| npm 发布 | OIDC Trusted Publishing（`id-token: write`） | 一次性 npm 后台配置 |
| 跨仓库同步（已移除） | 曾需 `PAT_TOKEN` | 已删除，不再需要 |

## 常见问题

### 版本 PR 合并后没有自动发布

changesets 的 "Version Packages" PR 被 auto-merge 时，合并是用 `GITHUB_TOKEN` 完成的，操作者记为 `github-actions[bot]`。GitHub 会抑制由 `GITHUB_TOKEN` 引发的事件所触发的 workflow run，因此合并产生的 push 不会启动新的 `release.yml`，发布步骤被跳过。

因此版本 PR **改为人工合并**（见 `pr-auto-merge.yml`），push 会记在维护者名下，发布流程正常触发。若某次发布仍被跳过，可向 main 推一个空 commit（`git commit --allow-empty -m "ci: trigger release"`）重新触发。发布步骤是幂等的，会自动补齐所有缺失版本。

### PR 上 CI 不运行

`ci.yml` 必须使用 `pull_request`（而非仅 `pull_request_target`）。首次运行该触发时，GitHub 会要求维护者手动 **Approve** 一次，批准后机器人提交的 PR 不再需要重复批准。

### 本机运行 pnpm 报 `node:sqlite` 错误

仓库要求 Node >= 24（pnpm 11.5 依赖 `node:sqlite`）。本地至少需要 Node v22.5+，建议使用 Node 24。
