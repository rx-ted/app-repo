---
title: Front Matter
author: rx-ted
date: 2026-08-10
category: guide
status: published
visibility: public
allow_comment: true
pinned: true
featured_weight: 0
lang: en
cover: https://picx.19981204.xyz/rest/2026/08/m5K4vJk.png
---

**English** | [中文](./front-matter.zh.md)

# Front Matter

Every post is a Markdown file whose leading YAML block carries the post
metadata. The block is parsed with `gray-matter` in
`apps/platform-api/src/lib/post-parser.ts` (interface `PostMeta`).

```markdown
---
title: My Post
date: 2026-08-10
category: architecture
tags: [vue, hono]
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: en
slug: my-post
doc_hash: <optional idempotency key>
---
# Content starts here
```

## Field reference

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `title` | string | — | Post title. The only field read by the API's create/update when the title isn't passed as a form field (`post.service.ts`). |
| `slug` | string | derived from `title` | URL path. If absent it is auto-generated from the title (fallback: `post-<hash>` for non-ASCII). Duplicate slugs get a `-<timestamp>` suffix. |
| `date` | string (ISO) | now | Publish date. Sets `publishedAt` / `createdAt` during docs import. |
| `category` | string (slug) | — | Category slug, resolved to a `post_category_mappings` row on import. |
| `tags` | string[] | `[]` | Tag slugs/names, resolved to `post_tag_mappings` on import. |
| `status` | `draft` \| `published` \| `archived` | `published` (seed) / `draft` (editor template) | Controls visibility in the blog listing. |
| `visibility` | `public` \| `private` \| `password` | `public` | Access control on the post. |
| `allow_comment` | boolean | `true` | Whether comments are enabled. |
| `pinned` | boolean | `false` | Pin to the home-page hero / featured listing. The docs importer reads the equivalent `is_pinned` field from the doc record. |
| `featured_weight` | number | `0` | Higher values rank the post earlier in featured lists. |
| `lang` | `en` \| `zh-CN` | derived from `slug` | Falls back to `zh-CN` when the slug ends with `.zh`, otherwise `en`. |
| `author` | string | — | Informational; used by seed docs, not stored on the post. |
| `cover` | string (URL) | — | Editor template only. Not consumed by the API's `create` — pass `coverImage` as a form field instead. |
| `doc_hash` | string | — | Idempotency key for docs import: unchanged docs are skipped on re-seed (`system-init.service.ts`). Keep it in the front matter so imports stay idempotent. |

## Language & translation

`lang` is derived from the slug convention: a slug ending in `.zh` is
`zh-CN`, everything else is `en`. The editor links translations via a
`translation_slug` column; when the site locale changes, the reader is
redirected to the matching translated post.

## Example (bilingual pair)

```markdown
---
title: Architecture Overview
author: rx-ted
date: 2026-08-05
category: architecture
tags: [architecture, hono]
status: published
visibility: public
allow_comment: true
pinned: true
featured_weight: 5
lang: en
slug: architecture
doc_hash: 547b801f842e936b1ca02b4c97bfe807e03b8ee2f5dfd47ed5f71fb4289a00ad
---
```

```markdown
---
title: 架构概览
author: rx-ted
date: 2026-08-05
category: architecture
tags: [architecture, hono]
status: published
visibility: public
allow_comment: true
pinned: true
featured_weight: 5
lang: zh-CN
slug: architecture.zh
---
```
