---
title: 版本管理与变更日志使用指南
author: rx-ted
date: 2026-07-22
category: guide
tags:
  - versioning
  - changelog
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
---

# 版本管理与变更日志使用指南

## 概述

Version Management 模块提供独立于 Git Tag 和 Changeset 的版本管理能力，支持多平台（Web/App/Desktop/API）的版本追踪、变更日志自动生成、客户端升级检测等功能。

核心机制：**Conventional Commit 驱动**。你只需写好 commit message，系统自动完成版本计算、changelog 生成。

## 提交规范

### 一次提交只改一个模块

commit message 必须包含 scope 标明模块：

```bash
# ✅ 正确
git commit -m "feat(web-blog): 新增用户注册页面"
git commit -m "fix(auth): 修复 OAuth 回调异常"
git commit -m "feat(platform-api): 新增健康检查接口"

# ❌ 错误：没有 scope，无法确定归属模块
git commit -m "feat: 新增功能"

# ❌ 错误：一个 commit 改了多个模块
git commit -m "fix(web-blog): 修复样式\nfeat(auth): 新增功能"   # 不要这样做
```

### Commit Type 与版本对应关系

| Commit 格式 | 模块 Version Bump | 说明 |
|---|---|---|
| `feat(scope):` 或 `feat(scope)!:` | minor 或 major | 新功能 |
| `fix(scope):` | patch | Bug 修复 |
| `perf(scope):` | patch | 性能优化 |
| `refactor(scope):` | patch | 重构 |
| `chore(scope):` / `docs:` / `test:` / `style:` | 不 bump | 杂项，仅记录 changelog |
| subject 含 `BREAKING CHANGE` 或 body 含 `BREAKING CHANGE:` | major | 不兼容变更 |

### Scope 与模块映射

| Scope | 对应路径 | 模块类型 |
|-------|---------|---------|
| `web-blog` | `apps/web-blog/` | app |
| `platform-api` | `apps/platform-api/` | app |
| `core` | `packages/core/` | package |
| `honest` | `packages/honest/` | package |
| `docs` | `docs/` | root |
| 其他 | 根目录文件 | root |

## 三阶段工作流

### Phase 1：预览（只读）

```bash
# CI 中或本地查看即将生成的版本
curl http://localhost:8787/versions/detect

# 返回示例
{
  "projectVersion": "0.1.0",
  "nextProjectVersion": "0.2.0",
  "modules": [
    {
      "moduleName": "web-blog",
      "currentVersion": "0.0.1",
      "nextVersion": "0.1.0",
      "bumpType": "minor",
      "changes": [{ "type": "feature", "message": "新增用户注册页面" }],
      "commits": [{ "hash": "5e2d40622...", "message": "feat(web-blog): ..." }]
    }
  ],
  "totalCommits": 3,
  "since": "v0.1.0"
}
```

### Phase 2：生成 Draft（仅写数据库）

```bash
# CI 中由 InitKeyGuard 保护
curl -X POST http://localhost:8787/versions/generate?author=system \
  -H "x-init-key: <INIT_KEY>"

# 效果：
# - 写入 versions 表（status: draft）
# - 写入 module_versions 表（各模块版本记录）
# - 写入 changelog_entries 表（按 type 聚合后的展示内容）
# - 写入 commit_records 表（原始 commit 记录）
# - ❌ 不修改 package.json
# - ❌ 不创建 git tag
```

### Phase 3：发布 Release（写文件 + 上线）

```bash
# 管理员操作
curl -X PUT http://localhost:8787/versions/<id>/release \
  -H "Authorization: Bearer <token>"

# 效果：
# - 修改 versions.status → released
# - 写入各模块 package.json（更新版本号）
# - 写入根目录 package.json
# - 创建 git tag: v<version>
```

## 客户端升级检测

各平台（Web/App/Desktop）通过统一接口检查版本更新：

```bash
curl "http://localhost:8787/versions/check?platform=web&currentVersion=1.0.0&channel=stable"
```

```json
{
  "hasUpdate": true,
  "latestVersion": "1.1.0",
  "forceUpgrade": false,
  "downloadUrl": "https://cdn.example.com/web/1.1.0.zip",
  "releaseNotes": "web-blog: minor; platform-api: patch",
  "rollout": 100
}
```

升级策略：

| `force_upgrade` | `min_client_version` | 行为 |
|:---:|:---:|------|
| false | null | 用户可选升级 |
| true | null | 检测到新版即强制 |
| false | 1.0.0 | 当前版本 < 1.0.0 时强制，否则可选 |
| true | 1.0.0 | 当前版本 < 1.0.0 时强制，且每次弹窗 |

## CI 集成建议

在 CI 中集成版本管理：

```yaml
# .github/workflows/version.yml
on:
  push:
    branches: [main]

jobs:
  version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # 需要完整 git 历史

      - name: Detect & Generate Version
        run: |
          curl -X POST "https://api.example.com/versions/generate?author=ci" \
            -H "x-init-key: ${{ secrets.INIT_KEY }}"

      - name: Release (manual approval)
        if: false  # 需要人工审核后触发
        run: |
          curl -X PUT "https://api.example.com/versions/$VERSION_ID/release" \
            -H "Authorization: Bearer ${{ secrets.ADMIN_TOKEN }}"
```

## 与 Changeset 的关系

| 维度 | Changeset | Version 模块 |
|------|-----------|-------------|
| 用途 | npm publish 工作流 | 业务版本 + changelog |
| 数据源 | `.changeset/*.md` | `git log` |
| 触发时机 | 发布 npm 包前 | 每次 push 到 main |
| 写 package.json | ✅ | ✅ 仅在 Release 阶段 |
| npm publish | ✅ | ❌ |

两者独立运行。日常开发只需关注 conventional commit，无需写 changeset。
Changeset 仅在需要发布 npm 包时使用。

## 灰度发布

通过 releases 表的 `rollout_percent` 控制：

```bash
# 设置灰度 10%
curl -X PUT http://localhost:8787/releases/<id>/rollout \
  -H "Authorization: Bearer <token>" \
  -d '{ "rolloutPercent": 10 }'
```

客户端根据渠道 + 随机数判断是否展示该版本。

## 版本回滚

```bash
# 回滚 v1.6.0 到 v1.5.0
curl -X POST http://localhost:8787/versions/<v1.6.0-id>/rollback \
  -H "Authorization: Bearer <token>" \
  -d '{ "targetVersionId": "<v1.5.0-id>" }'
```

回滚后：
- 原版本 status → `rollback`
- `rollback_version_id` 指向目标版本
- 可追溯完整回滚链

## 版本状态机

```
draft → reviewing → approved → releasing → released
                                         ↓
                                    rollback → archived
```

各状态说明：

| 状态 | 含义 | 可操作 |
|------|------|--------|
| `draft` | 刚生成 | 编辑、删除 |
| `reviewing` | 审核中 | 审核通过/拒绝 |
| `approved` | 审核通过 | 发布 |
| `releasing` | 正在发布 | 等待完成 |
| `released` | 已发布 | 回滚 |
| `rollback` | 已回滚 | 重新发布 |
| `archived` | 归档 | 只读 |
