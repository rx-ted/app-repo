---
title: Schema
author: rx-ted
date: 2026-08-05
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
lang: en
---

**English** | [中文](./schema.zh.md)

# Schema

Database table structures for articles, and the mapping of front-end front-matter fields.

## postCore — Article core

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | bigint | auto | Primary key |
| `userId` | char(36) | required | Author, references `users.id`, maps to front-matter `author` |
| `slug` | varchar(128) | required | URL identifier, unique, maps to front-matter `slug` |
| `title` | varchar(255) | required | Title, maps to front-matter `title` |
| `coverImage` | varchar(1024) | null | Cover image URL, maps to front-matter `cover_img` |
| `isPinned` | boolean | false | Whether pinned, maps to front-matter `pinned` |
| `featuredWeight` | integer | 0 | Featured weight (higher sorts first), maps to front-matter `featured_weight` |
| `status` | enum | draft | Status: `draft` / `published` / `archived` |
| `visibility` | enum | public | Visibility: `public` / `private` / `password` |
| `passwordHash` | varchar(255) | null | Hash for password-protected access |
| `allowComment` | boolean | true | Whether comments are allowed, maps to front-matter `allow_comment` |
| `deletedAt` | timestamp | null | Soft-delete time |
| `createdAt` | timestamp | required | Creation time, maps to front-matter `date` |
| `updatedAt` | timestamp | required | Update time |
| `publishedAt` | timestamp | null | Publish time |
| `deletedBy` | char(36) | null | Deleter |
| `createdBy` | char(36) | null | Creator |
| `updatedBy` | char(36) | null | Updater |

## postContent — Article content

| Field | Type | Description |
| --- | --- | --- |
| `postId` | bigint | References `postCore.id`, cascading delete |
| `contentMd` | text | Raw markdown content |
| `contentHtml` | text | Rendered HTML |

## postRevisions — Article revision history

| Field | Type | Description |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `postId` | bigint | References `postCore.id`, cascading delete |
| `contentMd` | text | Markdown of this revision |
| `createdAt` | timestamp | Creation time |
| `createdBy` | char(36) | Creator |

## postStats — Article statistics

| Field | Type | Description |
| --- | --- | --- |
| `postId` | bigint | References `postCore.id`, cascading delete |
| `views` | integer | View count |
| `likes` | integer | Like count |

## postCategories — Categories

| Field | Type | Description |
| --- | --- | --- |
| `id` | integer | Primary key |
| `name` | varchar | Category name |
| `slug` | varchar | URL identifier |
| `description` | text | Description |

## postTags — Tags

| Field | Type | Description |
| --- | --- | --- |
| `id` | integer | Primary key |
| `name` | varchar | Tag name |
| `slug` | varchar | URL identifier |

## postCategoryMappings — Post-category associations

| Field | Type | Description |
| --- | --- | --- |
| `postId` | bigint | Associated post |
| `categoryId` | integer | Associated category |

Each post has at most one category.

## postTagMappings — Post-tag associations

| Field | Type | Description |
| --- | --- | --- |
| `postId` | bigint | Associated post |
| `tagId` | integer | Associated tag |

Each post can have multiple tags.

## Front-matter

Front-matter is the YAML metadata block at the top of a Markdown file, wrapped in `---`, used to define the document's title, category, visibility, and other attributes. All documents in this project (including this one) use front-matter.

### Format

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

`---` must be placed at the very top of the file, with nothing before it.

### Field reference

| Field | Required | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | Yes | string | — | Document title |
| `author` | No | string | — | Author ID, references `users.id` |
| `slug` | No | string | — | URL identifier, auto-generated from title if omitted |
| `date` | No | string | — | Creation date, format `YYYY-MM-DD` |
| `cover_img` | No | string | — | Cover image URL |
| `category` | No | string | — | Category, single value |
| `tags` | No | string[] | — | Tags, multiple values |
| `status` | No | enum | `published` | `draft` / `published` / `archived` |
| `visibility` | No | enum | `public` | `public` / `private` / `password` |
| `password` | No | string | — | Access password (only effective when visibility=password) |
| `allow_comment` | No | boolean | `true` | Whether comments are allowed |
| `pinned` | No | boolean | `false` | Whether pinned |
| `featured_weight` | No | integer | `0` | Featured weight, higher sorts first |

### Field mapping

The correspondence between front-matter fields and the backend database:

| Front-matter | Table field | Description |
| --- | --- | --- |
| `title` | `postCore.title` | Article title |
| `slug` | `postCore.slug` | URL identifier |
| `cover_img` | `postCore.coverImage` | Cover image |
| `date` | `postCore.createdAt` | Creation time |
| `author` | `postCore.userId` | Author ID |
| `status` | `postCore.status` | Status (draft/published/archived) |
| `visibility` | `postCore.visibility` | Visibility (public/private/password) |
| `password` | `postCore.passwordHash` | Access password (visibility=password only) |
| `allow_comment` | `postCore.allowComment` | Whether comments are allowed |
| `pinned` | `postCore.isPinned` | Whether pinned |
| `featured_weight` | `postCore.featuredWeight` | Featured weight |
| `category` | `postCategoryMappings` | Category (single value) |
| `tags` | `postTagMappings` | Tags (multiple values) |

### Usage scenarios

- **Blog posts**: when the editor saves, front-matter fields are written to `postCore` + `postCategoryMappings` + `postTagMappings`
- **Documentation pages**: this project's Markdown docs use the same front-matter format, for unified rendering and management
