---
title: Docs Import Preprocessor & Seeder
author: rx-ted
date: 2026-07-22
category: plan
tags:
  - docs
  - importer
  - preprocessing
  - seed
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
---

# Docs Import Preprocessor & Seeder

## 背景

将 `docs/architecture/` 和 `docs/guides/` 下的 Markdown 文档导入数据库（D1），作为博客文章发布。

文档内部包含**相对路径链接**，导入后浏览器无法正确解析。需要：

1. **预处理** — 将相对路径转为绝对路径，上传图片到图床
2. **播种** — 将处理后的文档写入数据库，保持内容一致性

---

## 一、Slug 生成

每篇文档生成一个唯一 `slug`，用于：
- 博客文章 URL：`/post/{slug}`
- 链接重写时的目标标识

### 规则

```
{parent_dir} - {basename_without_ext}
```

`docs/` 以下部分作为父目录，`-` 连接多层目录。`README.md` 跳过 `README`，只保留目录路径。

### 完整映射表

| 源文件 | 推算过程 | 最终 slug |
|---|---|---|
| `docs/architecture/README.md` | 父目录=`architecture`，`README` 跳过 | `architecture` |
| `docs/architecture/repository-strategy.md` | `architecture-repository-strategy` | `architecture-repository-strategy` |
| `docs/architecture/schema.md` | `architecture-schema` | `architecture-schema` |
| `docs/guides/README.md` | 父目录=`guides`，`README` 跳过 | `guides` |
| `docs/guides/getting-started.md` | `guides-getting-started` | `guides-getting-started` |
| `docs/guides/development.md` | `guides-development` | `guides-development` |
| `docs/guides/version-management.md` | `guides-version-management` | `guides-version-management` |
| `docs/guides/api.md` | `guides-api` | `guides-api` |
| `docs/guides/packages.md` | `guides-packages` | `guides-packages` |
| `docs/guides/e2e-testing.md` | `guides-e2e-testing` | `guides-e2e-testing` |
| `docs/guides/api-routes.md` | `guides-api-routes` | `guides-api-routes` |

slug 冲突时自动追加 `-1`、`-2`... 后缀。

---

## 二、链接重写

### 匹配范围

扫描 Markdown 全文（body，不含 front-matter），匹配 `[text](path)` 和 `![text](path)`。

| path 特征 | 处理方式 |
|---|---|
| 以 `http://` 或 `https://` 开头 | 跳过（外部链接） |
| 以 `#` 开头 | 跳过（锚点） |
| 以 `./` 或 `../` 引导，`.md` 结尾 | → `/post/{目标slug}` |
| 以 `./` 或 `../` 引导，图片格式 | → 上传图床 → CDN URL |
| 其他路径 | 保留原样 |

### 重写示例

| 源文件 | 原链接 | 解析过程 | 重写后 |
|---|---|---|---|
| `docs/guides/README.md` | `[本地开发](./getting-started.md)` | 解析→`docs/guides/getting-started.md`→slug=`guides-getting-started` | `[本地开发](/post/guides-getting-started)` |
| `docs/guides/README.md` | `[架构概览](../architecture/README.md)` | 解析→`docs/architecture/README.md`→slug=`architecture` | `[架构概览](/post/architecture)` |
| `docs/guides/api.md` | `[api-routes.md](./api-routes.md)` | 解析→`docs/guides/api-routes.md`→slug=`guides-api-routes` | `[api-routes](/post/guides-api-routes)` |
| `docs/guides/development.md` | `[version-management.md](./version-management.md)` | 解析→`docs/guides/version-management.md`→slug=`guides-version-management` | `[version-management](/post/guides-version-management)` |
| `docs/guides/README.md` | `[仓库策略](../architecture/repository-strategy.md)` | →slug=`architecture-repository-strategy` | `[仓库策略](/post/architecture-repository-strategy)` |
| `docs/guides/README.md` | `[数据库 Schema](../architecture/schema.md)` | →slug=`architecture-schema` | `[数据库 Schema](/post/architecture-schema)` |

### 外部链接

指向 `docs/architecture/` 和 `docs/guides/` 之外的文件（如 `packages/core/README.md`、`docs/plans/xxx.md`），不在 slug 映射表中：
- 输出警告，方便人工检查
- 保留原链接不变

---

## 三、图片处理

### 上传 API

**端点**：`POST https://picx.19981204.xyz/rest/upload`

**认证**：`X-API-Key: px_{prefix}.{secret}` — 从项目根目录 `.env` 文件 `PICX_API_KEY` 读取

**请求格式**：`multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `files` | File[] | 是 | 图片文件 |
| `path` | string | 否 | 留空，使用服务端默认路径 |
| `keepName` | boolean | 否 | ASCII 文件名传 `true`；中文名不传（默认 false，服务端随机生成） |

**响应**：

```json
{
  "code": 200,
  "data": [{ "url": "https://cdn.picx.19981204.xyz/2026/07/22/abc123.jpg" }]
}
```

### 替换策略

分两个地方替换：

| 替换位置 | 说明 |
|---|---|
| **源文件** (`docs/xxx/*.md`) | 原地修改，`![](./assets/diagram.png)` → `![](https://cdn.picx.19981204.xyz/xxx.jpg)` |
| **输出 JSON** (`scripts/import-docs-output.json`) | `content_md` 中同样是 CDN URL |

这样一来，本地文件也持有 CDN 链接，再次运行脚本时图片不会重复上传（因为源文件里已是 CDN URL，不再匹配 `![](相对路径)` 规则）。

### keepName

始终 `keepName=false`（不传该字段）。无论中文还是英文文件名，都由服务端自动生成随机 key，避免文件名冲突和编码问题。

---

## 四、预处理脚本

**文件**：`scripts/import-docs.ts`

### 执行流程

```
Phase 1 — 文件发现
   扫描 docs/architecture/ 和 docs/guides/，找到全部 .md 文件

Phase 2 — 解析 + 建表
   解析 YAML front-matter
   生成 slug，建立 {绝对路径 → slug} 映射
   生成 doc_hash = SHA256(body) 用于后续变更检测

Phase 3 — 图片上传（可选）
   扫描 body 中所有 ![](相对路径)
   有图片 → 逐张上传到 picx.19981204.xyz，拿回 CDN URL
   同时替换本地 .md 源文件中的图片链接
   无图片 → 跳过

Phase 4 — 链接重写
   [text](./xxx.md) → [text](/post/{slug})
   外部链接 → 警告，保留原样

Phase 5 — 输出
   写入 data/import-docs-output.json
```

### doc_hash 机制

```
doc_hash = SHA256(body_after_front_matter)
```

嵌入到输出 JSON 和文档 front-matter 中，供播种时做变更检测。

### 不修改源文件（图片除外）

- 链接重写只影响输出 JSON，不修改 `docs/` 下原始 `.md` 文件
- **图片上传例外**：上传成功后原地修改源文件，将 `![](相对路径)` 替换为 `![](CDN URL)`，避免重复上传

---

## 五、静态数据文件

将原本硬编码在 `SystemInitService` 中的种子数据拆分为独立的 JSON 文件，统一放在 `data/`：

| 文件 | 内容 |
|---|---|
| `data/permissions.json` | 权限定义（约 60 条） |
| `data/roles.json` | 角色定义（admin / user） |
| `data/tags.json` | 种子标签 |
| `data/categories.json` | 种子分类 |
| `data/discoveries.json` | 友链/发现 |
| `data/import-docs-output.json` | 预处理后的文档（import-docs.ts 输出） |

`SystemInitService` 改为 `readFileSync` 读取这些 JSON 文件，不再硬编码数组。

---

## 六、播种（SystemInitService 集成）

**位置**：`apps/platform-api/src/modules/system/system-init.service.ts`

新增 `seed_posts` 模块，通过系统初始化 API 触发。

### 新增模块 `seed_posts`

```typescript
private readonly modules = {
  indexes: () => this.ensureIndexes(),
  permissions: () => this.runPermissions(),
  roles: () => this.runRoles(),
  seed_content: () => this.runSeedContent(),
  seed_discoveries: () => this.runSeedDiscoveries(),
  seed_posts: () => this.runSeedPosts(),  // ← 新增
};
```

### seed_posts 逻辑

```
读取 data/import-docs-output.json

遍历每篇文档:
  SELECT from postCore WHERE slug = doc.slug

  ├── 不存在:
  │    INSERT postCore (slug, title, contentMd, status, visibility, ...)
  │    INSERT postContent (postId, contentMd)
  │    INSERT postStats (postId, views=0, likes=0)
  │    → CREATE

  └── 存在:
       解析已有 contentMd 的 front-matter，提取 doc_hash
       ├── doc_hash 相同 → SKIP
       └── doc_hash 不同
            UPDATE postCore SET contentMd, title, ...
            UPDATE postContent SET contentMd
            → UPDATE
```

### 触发方式

通过系统初始化 API：

| 请求 | 作用 |
|---|---|
| `POST /api/v1/system/init` | 运行所有模块（含 seed_posts） |
| `POST /api/v1/system/init/seed_posts` | 仅运行文档播种 |

需要 `x-init-key` 头。

### hash 整体变更检测

`computeSeedHash()` 包含所有 seed 数据（含 docs 的 slug + doc_hash），存入 `systemMeta` 表：

```
hash = SHA256(JSON.stringify({
  permissions: loadPermissions(),
  roles: loadRoles(),
  tags: loadTags(),
  categories: loadCategories(),
  discoveries: loadDiscoveries(),
  docs: docs.map(d => ({ slug, doc_hash }))
}))
```

任一 JSON 文件变化 → hash 不一致 → 下次 init 自动触发全量更新。

---

## 七、输出格式

`data/import-docs-output.json`：

```json
[
  {
    "title": "架构概览",
    "slug": "architecture",
    "doc_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "content_md": "---\ntitle: 架构概览\nslug: architecture\ndoc_hash: e3b0c44...\n---\n[repository-strategy.md](/post/architecture-repository-strategy)",
    "status": "published",
    "visibility": "public",
    "allow_comment": true,
    "is_pinned": false,
    "featured_weight": 0
  }
]
```

---

## 八、完整工作流

```bash
# Step 1: 预处理（生成 data/import-docs-output.json）
npx tsx scripts/import-docs.ts

# Step 2: 触发系统初始化（播种所有数据 + 文档）
curl -X POST http://localhost:3000/api/v1/system/init \
  -H "x-init-key: YOUR_INIT_KEY"
```

或单独播种文档：

```bash
curl -X POST http://localhost:3000/api/v1/system/init/seed_posts \
  -H "x-init-key: YOUR_INIT_KEY"
```
