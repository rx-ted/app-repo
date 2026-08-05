---
title: Schema
author: rx-ted
date: 2026-07-22
category: architecture
tags:
  - database
  - schema
  - front-matter
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: zh-CN
---

[English](./schema.md) | **中文**

# Schema

文章相关的数据库表结构，以及前端 front-matter 字段映射。

## postCore — 文章核心

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `id` | bigint | auto | 主键 |
| `userId` | char(36) | 必填 | 作者，关联 `users.id`，对应 front-matter `author` |
| `slug` | varchar(128) | 必填 | URL 标识，唯一，对应 front-matter `slug` |
| `title` | varchar(255) | 必填 | 标题，对应 front-matter `title` |
| `coverImage` | varchar(1024) | null | 封面图 URL，对应 front-matter `cover_img` |
| `isPinned` | boolean | false | 是否置顶，对应 front-matter `pinned` |
| `featuredWeight` | integer | 0 | 推荐权重（越大越靠前），对应 front-matter `featured_weight` |
| `status` | enum | draft | 状态：`draft` / `published` / `archived` |
| `visibility` | enum | public | 可见性：`public` / `private` / `password` |
| `passwordHash` | varchar(255) | null | 密码访问的哈希值 |
| `allowComment` | boolean | true | 是否允许评论，对应 front-matter `allow_comment` |
| `deletedAt` | timestamp | null | 软删除时间 |
| `createdAt` | timestamp | 必填 | 创建时间，对应 front-matter `date` |
| `updatedAt` | timestamp | 必填 | 更新时间 |
| `publishedAt` | timestamp | null | 发布时间 |
| `deletedBy` | char(36) | null | 删除者 |
| `createdBy` | char(36) | null | 创建者 |
| `updatedBy` | char(36) | null | 更新者 |

## postContent — 文章内容

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `postId` | bigint | 关联 `postCore.id`，级联删除 |
| `contentMd` | text | Markdown 原始内容 |
| `contentHtml` | text | 渲染后的 HTML |

## postRevisions — 文章版本历史

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint | 主键 |
| `postId` | bigint | 关联 `postCore.id`，级联删除 |
| `contentMd` | text | 该版本的 Markdown |
| `createdAt` | timestamp | 创建时间 |
| `createdBy` | char(36) | 创建者 |

## postStats — 文章统计

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `postId` | bigint | 关联 `postCore.id`，级联删除 |
| `views` | integer | 浏览量 |
| `likes` | integer | 点赞数 |

## postCategories — 分类

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer | 主键 |
| `name` | varchar | 分类名称 |
| `slug` | varchar | URL 标识 |
| `description` | text | 描述 |

## postTags — 标签

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer | 主键 |
| `name` | varchar | 标签名称 |
| `slug` | varchar | URL 标识 |

## postCategoryMappings — 文章-分类关联

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `postId` | bigint | 关联文章 |
| `categoryId` | integer | 关联分类 |

每篇文章至多一个分类。

## postTagMappings — 文章-标签关联

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `postId` | bigint | 关联文章 |
| `tagId` | integer | 关联标签 |

每篇文章可关联多个标签。

## Front-matter

Front-matter 是 Markdown 文件顶部的 YAML 元数据块，用 `---` 包裹，用于定义文档的标题、分类、可见性等属性。本项目的所有文档（包括本文档）均使用 front-matter。

### 格式

```yaml
---
title: 文档标题
author: rx-ted
date: 2026-07-22
category: architecture
tags:
  - database
  - schema
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
---
```

`---` 必须放在文件最顶部，前面不能有任何内容。

### 字段说明

| 字段 | 必填 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `title` | 是 | string | — | 文档标题 |
| `author` | 否 | string | — | 作者 ID，关联 `users.id` |
| `slug` | 否 | string | — | URL 标识，不填则自动从 title 生成 |
| `date` | 否 | string | — | 创建日期，格式 `YYYY-MM-DD` |
| `cover_img` | 否 | string | — | 封面图 URL |
| `category` | 否 | string | — | 分类，单值 |
| `tags` | 否 | string[] | — | 标签，多值 |
| `status` | 否 | enum | `published` | `draft` / `published` / `archived` |
| `visibility` | 否 | enum | `public` | `public` / `private` / `password` |
| `password` | 否 | string | — | 访问密码（仅 visibility=password 时生效） |
| `allow_comment` | 否 | boolean | `true` | 是否允许评论 |
| `pinned` | 否 | boolean | `false` | 是否置顶 |
| `featured_weight` | 否 | integer | `0` | 推荐权重，越大越靠前 |

### 字段映射

Front-matter 字段与后端数据库的对应关系：

| Front-matter | 表字段 | 说明 |
| --- | --- | --- |
| `title` | `postCore.title` | 文章标题 |
| `slug` | `postCore.slug` | URL 标识 |
| `cover_img` | `postCore.coverImage` | 封面图 |
| `date` | `postCore.createdAt` | 创建时间 |
| `author` | `postCore.userId` | 作者 ID |
| `status` | `postCore.status` | 状态（draft/published/archived） |
| `visibility` | `postCore.visibility` | 可见性（public/private/password） |
| `password` | `postCore.passwordHash` | 访问密码（仅 visibility=password） |
| `allow_comment` | `postCore.allowComment` | 是否允许评论 |
| `pinned` | `postCore.isPinned` | 是否置顶 |
| `featured_weight` | `postCore.featuredWeight` | 推荐权重 |
| `category` | `postCategoryMappings` | 分类（单值） |
| `tags` | `postTagMappings` | 标签（多值） |

### 使用场景

- **博客文章**：编辑器保存时，front-matter 字段写入 `postCore` + `postCategoryMappings` + `postTagMappings`
- **文档页面**：本项目的 Markdown 文档也使用相同的 front-matter 格式，便于统一渲染和管理
