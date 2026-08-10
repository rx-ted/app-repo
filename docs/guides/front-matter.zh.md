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
lang: zh-CN
cover: https://picx.19981204.xyz/rest/2026/08/m5K4vJk.png
---

[English](./front-matter.md) | **中文**

# Front Matter

每篇文章都是 Markdown 文件，开头的 YAML 块携带文章元数据。该块由
`apps/platform-api/src/lib/post-parser.ts`（接口 `PostMeta`）用 `gray-matter` 解析。

```markdown
---
title: 我的文章
date: 2026-08-10
category: architecture
tags: [vue, hono]
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: zh-CN
slug: my-post
doc_hash: <可选的幂等键>
---
# 正文从这里开始
```

## 字段参考

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | string | — | 文章标题。API 创建/更新时若未通过表单字段传入标题，唯一会从 front-matter 读取的字段（`post.service.ts`）。 |
| `slug` | string | 由 `title` 生成 | URL 路径。缺省时根据标题自动生成（非 ASCII 标题回退为 `post-<hash>`）。重复 slug 会追加 `-<时间戳>` 后缀。 |
| `date` | string（ISO） | 当前时间 | 发布日期。导入 docs 时写入 `publishedAt` / `createdAt`。 |
| `category` | string（slug） | — | 分类 slug，导入时解析为 `post_category_mappings` 记录。 |
| `tags` | string[] | `[]` | 标签 slug/名称，导入时解析为 `post_tag_mappings`。 |
| `status` | `draft` \| `published` \| `archived` | `published`（seed）/ `draft`（编辑器模板） | 控制文章在列表中的可见性。 |
| `visibility` | `public` \| `private` \| `password` | `public` | 文章访问控制。 |
| `allow_comment` | boolean | `true` | 是否允许评论。 |
| `pinned` | boolean | `false` | 置顶到首页 hero / 精选列表。docs 导入器从 doc 记录读取对应的 `is_pinned` 字段。 |
| `featured_weight` | number | `0` | 数值越大，在精选列表中越靠前。 |
| `lang` | `en` \| `zh-CN` | 由 `slug` 推导 | 默认：slug 以 `.zh` 结尾时为 `zh-CN`，否则为 `en`。 |
| `author` | string | — | 仅作展示用途；seed 文档使用，不存储到文章上。 |
| `cover` | string（URL） | — | 仅编辑器模板使用。API 的 `create` 不消费该字段——请改用表单字段 `coverImage`。 |
| `doc_hash` | string | — | docs 导入的幂等键：重新 seed 时未变化的文档会被跳过（`system-init.service.ts`）。请保留在 front-matter 中，保证导入可幂等。 |

## 语言与翻译

`lang` 由 slug 约定推导：slug 以 `.zh` 结尾即为 `zh-CN`，其余为 `en`。编辑器通过
`translation_slug` 列关联翻译版本；站点语言切换时，读者会被重定向到对应的翻译文章。

## 示例（双语对）

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
