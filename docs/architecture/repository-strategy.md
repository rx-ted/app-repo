---
title: Repository Strategy
author: rx-ted
date: 2026-07-22
category: architecture
tags:
  - monorepo
  - repository
  - strategy
  - ci/cd
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: zh-CN
---

# Repository Strategy

---

# 1. 背景

当前项目采用 **Monorepo** 进行开发，并包含多个应用（Apps）与多个基础模块（Packages）。

项目目标：

- 所有开发均在一个 Monorepo 中完成。
- Packages 作为内部模块统一维护，并发布到 npm。
- Apps 可以选择开源。
- Monorepo 保持私有。
- Public Repository 自动同步，无需人工维护多个仓库。

最终形成：

```
GitHub

rx-ted/
├── app                 (Private Monorepo)
│
├── blog                (Public)
├── blog-api            (Public)
├── admin               (Public)
└── ...
```

---

# 2. Repository 职责

## Private Repository（唯一开发仓库）

```
rx-ted/app-repo
```

负责：

- 所有日常开发
- 所有 CI
- 所有测试
- 所有 Build
- 所有 Release
- 所有 npm Package 发布

目录结构：

```
app-repo/
├── apps/
│   ├── platform-api
│   ├── web-blog
│   └── ...
│
├── packages/
│   ├── core
│   ├── honest
│   ├── honest-plugins
│   ├── markdown-editor
│   └── ...
│
├── config/
├── docs/
├── pnpm-workspace.yaml
└── turbo.json
```

整个 Monorepo 为唯一可信数据源（Single Source of Truth）。

---

## Public Repository

例如：

```
rx-ted/blog
rx-ted/blog-api
```

Public Repository：

- 不直接开发
- 不直接提交功能
- 不维护 Packages
- 不维护 Monorepo

Public Repository 仅用于：

- 开源
- Issue
- Pull Request
- Documentation
- Deployment（可选）

所有代码均由 Private Repository 自动同步。

---

# 3. Packages 策略

所有 Packages 仅存在于：

```
packages/*
```

例如：

```
packages/core
packages/database
packages/cache
packages/logger
```

GitHub：

```
Private
```

npm：

```
Public
```

例如：

```
@rx-ted/core
@rx-ted/database
```

Packages 不建立独立 GitHub Repository。

原因：

- 避免维护多个仓库
- 避免 Issue 分散
- 避免 CI 分散
- 避免 PR 分散

所有源码统一维护。

---

# 4. Apps 策略

Apps 为最终可部署项目。

例如：

```
apps/blog
apps/blog-api
```

每个 App 可以对应一个 Public Repository。

例如：

```
apps/blog
        │
        ▼
rx-ted/blog
```

```
apps/blog-api
        │
        ▼
rx-ted/blog-api
```

Public Repository 不参与开发。

仅用于：

- 展示源码
- 社区协作
- Pull Request
- Issue

真正开发仍在：

```
rx-ted/app-repo
```

---

# 5. 开发流程

所有开发均在：

```
rx-ted/app-repo
```

完成。

流程如下：

```
Developer
      │
      ▼
Local Monorepo
      │
      ▼
Commit
      │
      ▼
Push
      │
      ▼
GitHub
```

开发者永远只需要维护一个仓库。

---

# 6. CI 流程

Push 后，仅进行代码验证。

CI 负责：

```
Install

↓

Format Check

↓

Lint

↓

Type Check

↓

Unit Test

↓

E2E Test（可选）

↓

Build

↓

Success
```

CI 的职责只有一个：

> **验证代码是否可发布。**

CI 不负责同步 Public Repository。

---

# 7. Release 流程

只有当 CI 全部成功后，进入 Release。

Release 顺序：

```
Version

↓

Generate Changelog

↓

Publish npm

↓

同步 Public Repository

↓

Create GitHub Release
```

即：

```
CI
↓

Release
↓

Deploy
```

职责清晰，不互相混合。

---

# 8. Public Repository 同步

同步由 GitHub Actions 自动完成。

例如：

```
apps/blog
```

同步到：

```
rx-ted/blog
```

```
apps/blog-api
```

同步到：

```
rx-ted/blog-api
```

同步采用：

```
git filter-repo
```

而非 `git subtree split`。对比：

| 方案                | 速度             | 历史一致性     | 冲突风险           | 维护成本 |
| ------------------- | ---------------- | -------------- | ------------------ | -------- |
| `git subtree split` | 慢（遍历全历史） | 差（重写历史） | 高（远程历史偏移） | 高       |
| `git filter-repo`   | 快（增量）       | 好             | 低（可 squash）    | 低       |

同步流程：

```
1. 从 monorepo checkout 目标 app 目录
2. 用 filter-repo 提取该目录（保留完整历史）
3. 推送到 public repo 的 release/{version} 分支
4. 在 public repo 创建 merge PR，触发 public CI
5. PR 合入 main
```

每次同步为 squash commit，保证：

- Public Repository 保留源码可读
- 不包含 Monorepo 目录
- 冲突时仅需 force-push release 分支，不影响 main
- Public CI 验证通过后再合入（防止损坏）

例如：

```
apps/blog
```

同步后：

```
blog/
├── src/
├── package.json
└── README.md
```

不会出现：

```
packages/
turbo.json
pnpm-workspace.yaml
```

等 Monorepo 文件。

---

# 9. Packages 发布

Packages 统一发布。

例如：

```
packages/core

↓

@rx-ted/core
```

```
packages/database

↓

@rx-ted/database
```

Version 使用：

```
Changesets
```

统一管理。

---

# 10. Workspace Dependency

Monorepo 内使用：

```
workspace:*
```

例如：

```json
{
  "@rx-ted/core": "workspace:*"
}
```

同步 Public Repository 前，将 `workspace:*` 替换为 npm 已发布版本。

实现方式：

```yaml
# 先发布 npm，获取当前版本
pnpm publish --filter @rx-ted/core

# 再替换 workspace 引用
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('apps/blog/package.json'));
  const versionMap = {};
  ['dependencies','devDependencies','peerDependencies'].forEach(key => {
    if (!pkg[key]) return;
    Object.entries(pkg[key]).forEach(([name, ver]) => {
      if (ver === 'workspace:*' || ver.startsWith('workspace:')) {
        const p = require('./packages/' + name.split('/').pop() + '/package.json');
        versionMap[name] = '^' + p.version;
      }
    });
  });
  console.log(JSON.stringify(versionMap));
"
```

替换后的 package.json：

```json
{
  "@rx-ted/core": "^1.5.0"
}
```

保证：

```
npm install
```

即可正常安装。

注意：

- 替换必须在 **Publish npm 之后**执行，因为需要知道已发布版本
- `workspace:*` 和 `workspace:^` 等语法都需要覆盖
- 替换只在同步用的临时分支上进行，不污染 monorepo 主分支
- monorepo 内部始终保留 `workspace:*`，保证本地开发体验

开发体验与开源体验互不影响。

---

# 11. Apps 同步策略

并非每次 Release 都同步所有 App。

Release 时，通过 Turbo `--filter` 判断受影响模块：

```bash
turbo run build --filter="...{apps/blog}" --dry=json
```

Turbo 根据 workspace 依赖图自动计算受影响的 app。

例如：

```
packages/core
```

发生修改：

```
blog
blog-api
```

均需要同步。

若仅：

```
apps/blog
```

发生修改：

则仅同步：

```
rx-ted/blog
```

避免无意义提交。

CI 中实现：

```yaml
- name: Detect affected apps
  id: affected
  run: |
    # 对比上一个 release tag
    BASE=$(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD)
    AFFECTED=$(npx turbo run build --filter="...[$BASE]" --dry=json | \
      node -e "
        const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
        const apps = d.packages.filter(p => p.startsWith('apps/'));
        console.log(apps.join(' '));
      ")
    echo "affected=$AFFECTED" >> $GITHUB_OUTPUT
```

---

# 12. GitHub Actions 推荐流程

## 完整 Release Pipeline

```
Push → main

↓

CI: Install → Format → Lint → TypeCheck → Test → Build

↓

Changesets Version（自动创建 Version PR）

↓

（人工审核 / Auto-merge Version PR）

↓

Version PR Merge → main（版本已 bump）

↓

Publish npm（OIDC，无需 token）

↓

Detect Changed Apps（Turbo --filter）

↓

对每个 affected app：

  ├── filter-repo 提取目录
  ├── Replace workspace:* 为已发布版本
  ├── Push 到 public repo release/{version} 分支
  └── Create Merge PR into public repo main

↓

Create GitHub Release（tag + release notes）
```

## 反向同步（社区贡献）

当 Community Contributor 在 Public Repo 提交 PR 时：

```
Public Repo PR merged

↓

Public Repo CI 触发

  └── gh pr create --repo rx-ted/app-repo \
         --title "sync: blog#123: <original title>" \
         --body "Backport from rx-ted/blog#123 by @contributor"

↓

Monorepo maintainer 在 rx-ted/app-repo 审核并合入

↓

下次 Release 自动同步回 Public Repo
```

实现方式：

```yaml
# .github/workflows/backport.yml (in rx-ted/blog)
name: Backport to monorepo
on:
  pull_request_target:
    types: [closed]
    branches: [main]

jobs:
  backport:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - run: |
          gh pr create \
            --repo rx-ted/app-repo \
            --base main \
            --head "backport/${{ github.event.repository.name }}-${{ github.event.number }}" \
            --title "sync(${{ github.event.repository.name }}): ${{ github.event.pull_request.title }}" \
            --body "Backport of [${{ github.event.repository.name }}#${{ github.event.number }}](${{ github.event.pull_request.html_url }}) by @${{ github.event.pull_request.user.login }}"
        env:
          GH_TOKEN: ${{ secrets.PAT_TOKEN }}
```

## 耗时预估

| 阶段                         | 预估耗时          |
| ---------------------------- | ----------------- |
| CI (install → test → build)  | 3-5 min           |
| Publish npm                  | 1-2 min / pkg     |
| filter-repo + push (per app) | 30s - 1 min / app |
| Create Release               | 10s               |

Total（5 app 场景）：**~8-12 min**，在 GitHub Actions 6h 超时内安全。

---

# 13. 设计原则

本方案遵循以下原则：

- Single Source of Truth：所有开发仅在 Private Monorepo。
- Separation of Concerns：CI、Release、Deploy 职责分离。
- Automation First：发布、同步、版本管理全部自动化。
- Public by Selection：仅 Apps 对外公开，Packages 不建立独立仓库。
- Scalable：未来可扩展至多个 App、多个 npm Package，而无需调整整体架构。

---

# 14. 最终架构

```
                 Developer (仅维护一个仓库)
                     │
                     ▼
          rx-ted/app-repo (Private Monorepo)
                     │
          ┌──────────┴──────────────┐
          │                         │
          ▼                         ▼
   GitHub CI (验证)          Changesets (版本)
          │                         │
          │                         ▼
          │                   Publish npm (OIDC)
          │                         │
          └─────────────┬───────────┘
                        ▼
                 Detect Changed Apps
                  (Turbo --filter)
                        │
          ┌─────────────┴──────────────────┐
          ▼                                ▼
    filter-repo + publish            filter-repo + publish
          │                                │
          ▼                                ▼
   rx-ted/blog (Public)             rx-ted/blog-api (Public)
          │                                │
          ▼                                ▼
   Backport PR (community)          Backport PR (community)
          │                                │
          └─────────────┬──────────────────┘
                        ▼
                rx-ted/app-repo 审核合入
                        │
                        ▼
              下次 Release 自动同步
```

## 15. 社区贡献闭环

```
                      ┌─────────────────────────┐
                      │    rx-ted/app-repo (Private)  │
                      │    Single Source of Truth│
                      └──────────┬──────────────┘
                                 │
             Release 自动同步     │    反向 backport PR
                                 │
                      ┌──────────▼──────────────┐
                      │  rx-ted/blog (Public)   │
                      │  社区 Issue / PR / 讨论  │
                      └─────────────────────────┘
```

闭环原则：

1. 所有代码开发 → 仅在 Private Monorepo
2. 社区贡献 → 在 Public Repo 提交 PR
3. Backport 机器人 → 自动在 Private Monorepo 创建对应 PR
4. Maintainer 审核 → 合入 Private Monorepo
5. 下次 Release → 自动同步回 Public Repo

这样既保证了 Single Source of Truth，又不会拒绝社区贡献。
