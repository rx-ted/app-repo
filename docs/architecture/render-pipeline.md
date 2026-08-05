---
title: Render Pipeline
author: rx-ted
date: 2026-08-05
category: architecture
tags:
  - markdown
  - pipeline
  - remark
  - rehype
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: en
---

**English** | [中文](./render-pipeline.zh.md)

# Render pipeline

`src/core/markdown.ts` builds one unified markdown→HTML pipeline with
[`unified`](https://github.com/unifiedjs/unified). The same pipeline backs both
`MarkdownRenderer` and the editor's preview pane, so a standalone render and the
in-editor preview can never drift apart.

## `buildMarkdownPipeline(options)`

Options (all optional):

| Option | Default | Effect |
| --- | --- | --- |
| `sourceMap` | `true` | Record a `SourceNode` for every rendered element (see [sync-engine](./sync-engine.md)) |
| `codeTheme` | `'github-light'` | Shiki code theme id passed to `rehype-pretty-code` |
| `interactiveTasks` | `false` | Make GFM task checkboxes clickable (`rehypeInteractiveTasks`) |

### Plugin order (remark)

```
remark-parse
  → remark-directive + remarkDirectiveHandler     ::details/::note etc. directives
  → remarkFrontMatter                             leading YAML → <table> or dropped
  → remarkCodeLabel                               capture ```ts title="..." / group= / tab=
  → [remarkSourceMap]                             (when sourceMap) record node offsets
  → remark-gfm                                    tables, task lists, strikethrough, autolinks
  → remark-math                                   $...$ and $$...$$
  → remark-emoji                                  :tada: → emoji
  → remarkHighlight                               ==mark== → <mark>
  → remark-rehype (allowDangerousHtml: true)      HTML passthrough
```

### Plugin order (rehype)

```
rehype-capture-code-meta        stash each <pre> code meta before rehype-raw eats it
  → rehype-raw                  allow raw HTML in source
  → rehype-details-heading      ::details with a summary
  → rehype-mermaid              ```mermaid → <div class="mermaid"> (client-rendered)
  → rehype-pretty-code (shiki)  syntax highlight (see below)
  → rehype-code-data            annotate <pre> with data-lang / meta
  → rehype-line-highlight       {2-3} ranges → .highlighted line spans
  → rehype-code-group           adjacent code blocks with group= → tabbed :::
  → rehype-restore-code-blocks  put <pre> back after rehype-raw mangling
  → rehype-diff-mark            [!code ++/--] → diff spans
  → rehype-notation-diff        diff ranges via {4-4}
  → rehype-katex                math → KaTeX markup
  → rehype-slug                 heading ids (then GitHub-style via headingId.ts)
  → rehype-autolink-headings    prepend a `#` ×depth heading anchor
  → [rehypeInteractiveTasks]    (when interactiveTasks) enable task checkboxes
  → rehype-stringify
```

The code-block features live in `src/core/rehypeCodeGroup.ts` as small,
composable rehype plugins rather than one monolithic pass.

## Code highlighting

`getPrettyCodeOptions(codeTheme)` configures `rehype-pretty-code`:

- `keepBackground: true` — shiki's `background-color` is written **inline on the
  `<pre>`**, so the code theme owns the block background. The reading theme's
  figure/code-group backgrounds are transparent; a block can never show a dark
  code theme's tokens on a light block background (or vice-versa).
- `defaultLang: 'plaintext'` — unlabeled fences degrade gracefully.
- `filterMetaString` strips the internal `group=`/`tab=` and `{2-3}` meta tokens
  before pretty-code sees them.

### Code block extras (client side, in `MarkdownRenderer`)

After the HTML lands in the DOM:

- **Copy button** and **line-number toggle** per `pre[data-theme]`.
- **Fold** — blocks taller than `400px` get a fold button (`code-collapsible`).
- **Mermaid** — `<div class="mermaid">` blocks are initialized via a dynamic
  `import('mermaid')` with the preview theme's `mermaidTheme`.
- **Interactive tasks** — checkboxes lose `disabled` and emit `update:content`
  with the toggled source (via `toggleTask` in `src/core/tasks.ts`).

## Front matter

`remarkFrontMatter` turns a leading YAML block into either a metadata `<table>`
(default) or drops it (`render: 'hide'`). Stripping for your own use is exposed
as `stripFrontMatter(md)`.

## Output

`renderMarkdown(md, opts)` returns:

```ts
{ html: string; nodes: SourceNode[] }
```

`html` is the stringified document; `nodes` is the source map consumed by the
sync engine (and by `MarkdownRenderer`'s `ready` event).

## Rendering

The pipeline is intentionally **render-once**: `MarkdownRenderer` re-runs it
when `content` / `theme` / `codeTheme` / `mode` change, then patches the DOM via
`v-html` and re-applies the client-side extras.
