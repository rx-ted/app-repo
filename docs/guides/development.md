---
title: 开发工作流程
author: rx-ted
date: 2026-07-22
category: guide
tags:
  - workflow
  - development
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
---

# 开发工作流程

## 1. 首次拉取

```bash
git clone <repo-url>
cd app
pnpm install              # 安装依赖 + 自动安装 lefthook hooks
```

## 2. 日常开发流程

```
拉取 → 开发 → 创建 changeset → 提交 → 推送
```

### 2.1 拉取

```bash
git pull
pnpm install              # lockfile 有变更时自动同步依赖
```

### 2.2 开发

代码风格由 Biome 自动约束，提交前 lefthook 会执行 `pnpm biome check .`。

常用命令：

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 启动所有应用（并行） |
| `pnpm build` | 构建所有包 |
| `pnpm test` | 运行测试 |
| `pnpm typecheck` | 类型检查 |
| `pnpm lint` | Biome 检查 |
| `pnpm format:fix` | 自动格式化代码 |

### 2.3 创建 changeset

修改 `packages/` 下的模块后，必须创建 changeset 记录版本变更：

```bash
pnpm changeset
```

按提示选择：
- 变更类型（patch / minor / major）
- 填写变更说明

生成的 changeset 文件会存放在 `.changeset/` 目录，随代码一起提交。

> 如果改动不涉及版本发布（仅改 apps 或配置文件），可以用空 changeset：
> ```bash
> pnpm changeset add --empty
> ```

### 2.4 提交

遵循 **Conventional Commits** 格式：

```
<type>(<scope>): <description>
```

类型包括：`feat` `fix` `refactor` `perf` `docs` `style` `test` `chore` `build` `ci` `revert`

实际例子：

```bash
# 新功能
git commit -m "feat(web-blog): 新增博客文章分页功能"

# Bug 修复
git commit -m "fix(web-blog): 修复移动端布局错位问题"

# 文档更新
git commit -m "docs: 更新项目开发文档"

# 重构
git commit -m "refactor(auth): 优化 OAuth 回调流程"

# 依赖维护
git commit -m "chore: 更新依赖版本"

# 样式调整
git commit -m "style(web-blog): 调整 SCSS 命名规范"
```

提交时会自动触发 lefthook 钩子：
- **pre-commit**: `pnpm biome check .` — 代码规范校验
- **commit-msg**: `pnpm changeset status` — changeset 合法性校验

### 2.5 推送

```bash
git push
```

推送后 CI 会自动运行：
1. `pnpm changeset status --since=origin/main` — 校验 changeset
2. `pnpm verify:repo` — lint + check + typecheck + build + test

## 3. 发布流程

只有 maintainer 可操作，由 CI 自动完成。

```bash
git push origin main
```

CI（`.github/workflows/publish.yml`）自动执行：

```
检测 changeset → version bump → build → npm publish
```

- 非私有包（`packages/` 下）会被发布到 npm
- 私有包（`apps/` 下）被自动跳过
- 发布使用 OIDC + `--provenance`，无需配置 NPM_TOKEN

## 4. 版本管理与 Changelog

Version Management 模块提供独立于 Changeset 的版本追踪和变更日志生成能力。

### 核心原则

- **Commit message 驱动**：系统通过解析 `git log` 中的 conventional commit 自动计算版本 bump 和 changelog
- **一次提交一个模块**：commit message 必须包含 scope，如 `feat(web-blog): 新增页面`
- **三阶段流程**：Detect（预览）→ Generate（写库）→ Release（写文件+打 tag）

### 日常开发流程

```bash
# 1. 开发，提交时写 scope
git commit -m "feat(web-blog): 新增用户注册页面"
git commit -m "fix(auth): 修复 OAuth 回调"
git push

# 2. CI 自动检测变更（预览）
curl GET /versions/detect

# 3. CI 自动生成版本（写入数据库）
curl POST /versions/generate

# 4. 管理员发布（写 package.json + 打 tag）
curl PUT /versions/:id/release
```

### 版本聚合规则

| 模块类型 | 是否计入 Project Version | 说明 |
|---------|------------------------|------|
| `apps/*` | ✅ | 影响 project version |
| `docs/`、根目录 | ✅ | 影响 project version |
| `packages/*` | ❌ | 独立 bump，不影响 project version |

### 详细指南

参见 [version-management.md](./version-management.md)。

## 5. 常见问题

### 提交被 lefthook 阻止

```
❌ pre-commit: biome check 报错
→ pnpm format:fix  # 自动修复格式
→ pnpm lint        # 检查剩余的 lint 错误

❌ commit-msg: changeset status 报错
→ pnpm changeset add --empty  # 创建空 changeset（不涉及版本发布时）
```

### 包依赖关系

```
apps/platform-api → packages-core, packages-honest,
                    packages-honest-plugins/*

packages/honest   → packages-core
honest-plugins/*  → packages-core, packages-honest (peer)
```
