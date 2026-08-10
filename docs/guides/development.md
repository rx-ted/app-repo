---
title: Development workflow
author: rx-ted
date: 2026-08-05
category: guide
tags:
  - workflow
  - development
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: en
---

**English** | [中文](./development.zh.md)

# Development workflow

## 1. First clone

```bash
git clone <repo-url>
cd app
pnpm install              # install dependencies + auto-install lefthook hooks
```

## 2. Daily development flow

```
pull → develop → create changeset → commit → push
```

### 2.1 Pull

```bash
git pull
pnpm install              # automatically syncs dependencies when the lockfile changes
```

### 2.2 Develop

Code style is enforced automatically by Biome; lefthook runs `pnpm biome check .` before committing.

Common commands:

| Command | Purpose |
|---|---|
| `pnpm dev` | Start all apps (in parallel) |
| `pnpm build` | Build all packages |
| `pnpm test` | Run tests |
| `pnpm typecheck` | Type check |
| `pnpm lint` | Biome check |
| `pnpm format:fix` | Auto-format code |

### 2.3 Create a changeset

After modifying a module under `packages/`, you must create a changeset to record the version change:

```bash
pnpm changeset
```

Follow the prompts to select:
- Change type (patch / minor / major)
- Fill in the change description

Generated changeset files are stored in the `.changeset/` directory and committed with the code.

> If the change doesn't involve a release (only apps or config files), you can use an empty changeset:
> ```bash
> pnpm changeset add --empty
> ```

### 2.4 Commit

Follow the **Conventional Commits** format:

```
<type>(<scope>): <description>
```

Types include: `feat` `fix` `refactor` `perf` `docs` `style` `test` `chore` `build` `ci` `revert`

Real-world examples:

```bash
# New feature
git commit -m "feat(web-blog): 新增博客文章分页功能"

# Bug fix
git commit -m "fix(web-blog): 修复移动端布局错位问题"

# Documentation update
git commit -m "docs: 更新项目开发文档"

# Refactor
git commit -m "refactor(auth): 优化 OAuth 回调流程"

# Dependency maintenance
git commit -m "chore: 更新依赖版本"

# Style adjustment
git commit -m "style(web-blog): 调整 SCSS 命名规范"
```

Committing automatically triggers lefthook hooks:
- **pre-commit**: `pnpm biome check .` — code style validation
- **commit-msg**: `pnpm changeset status` — changeset validity check

### 2.5 Push

```bash
git push
```

After pushing, CI runs automatically:
1. `pnpm changeset status --since=origin/main` — validates changesets
2. `pnpm verify:repo` — lint + check + typecheck + build + test

## 3. Release flow

Only maintainers can operate; this is handled automatically by CI.

```bash
git push origin main
```

CI (`.github/workflows/release.yml`) automatically executes:

```
detect changeset → version bump → build → npm publish
```

- Non-private packages (under `packages/`) are published to npm
- Private packages (under `apps/`) are skipped automatically
- Publishing uses OIDC + `--provenance`, no NPM_TOKEN configuration needed

## 4. Version management & changelog

The Version Management module provides version tracking and changelog generation independent of Changeset.

### Core principles

- **Commit-message driven**: the system parses conventional commits from `git log` to automatically compute the version bump and changelog
- **One module per commit**: the commit message must include a scope, e.g. `feat(web-blog): 新增页面`
- **Three-stage flow**: Detect (preview) → Generate (write to DB) → Release (write files + tag)

### Daily development flow

```bash
# 1. Develop, write the scope on commit
git commit -m "feat(web-blog): 新增用户注册页面"
git commit -m "fix(auth): 修复 OAuth 回调"
git push

# 2. CI auto-detects changes (preview)
curl GET /versions/detect

# 3. CI auto-generates the version (writes to the database)
curl POST /versions/generate

# 4. Admin releases (writes package.json + tags)
curl PUT /versions/:id/release
```

### Version aggregation rules

| Module type | Counts toward Project Version | Notes |
|---------|------------------------|------|
| `apps/*` | ✅ | affects the project version |
| `docs/`, root | ✅ | affects the project version |
| `packages/*` | ❌ | bumped independently, does not affect the project version |

### Detailed guide

See [version-management-design.md](../implementations/version-management-design.md).

## 5. FAQ

### Commit blocked by lefthook

```
❌ pre-commit: biome check error
→ pnpm format:fix  # auto-fix formatting
→ pnpm lint        # check remaining lint errors

❌ commit-msg: changeset status error
→ pnpm changeset add --empty  # create an empty changeset (when no release is involved)
```

### Package dependency graph

```
apps/platform-api → packages-core, packages-honest,
                    packages-honest-plugins/*

packages/honest   → packages-core
honest-plugins/*  → packages-core, packages-honest (peer)
```
