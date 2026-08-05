---
title: Sync Engine
author: rx-ted
date: 2026-08-05
category: architecture
tags:
  - sourcemap
  - sync
  - markdown
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: en
---

**English** | [中文](./sync-engine.zh.md)

# Sync engine

The editor needs to know, at any moment, which rendered element corresponds to
which part of the markdown source — for scroll linking, heading navigation,
task toggling and the TOC. That contract is a **source map**: a flat list of
`SourceNode`s with markdown offsets.

## Data model (`src/core/sourcemap.ts`)

```ts
interface SourceNode {
  id: number;            // unique, sequentially assigned node id
  kind: NodeKind;        // 'paragraph' | 'heading' | 'code' | 'list' | ...
  startLine: number;     // 1-indexed source line
  endLine: number;       // 1-indexed source line
  startOffset: number;   // 0-indexed offset in the markdown source
  endOffset: number;     // 0-indexed offset in the markdown source
  depth?: number;        // heading-only: 1..6
  parentId?: number;     // parent node id
  children?: number[];   // child node ids
}

class MarkdownIndex {
  // built from SourceNode[]: lookup by line / offset / id (binary search)
}

class HeadingTree {
  // heading-only hierarchy for the TOC (nested by depth)
}
```

## Building the map (`src/core/remarkSourceMap.ts`)

`remarkSourceMap` runs inside the remark phase of the pipeline (see
[render-pipeline](./render-pipeline.md)). While unified walks the markdown AST
it records each block/heading's source offsets into a shared `SourceNode[]`
array — the same array `renderMarkdown` returns. This happens in the **remark**
phase so offsets refer to the *source text*, not the rendered HTML.

`MarkdownRenderer` emits the result on `ready`:

```ts
@ready="({ nodes, rootEl }) => console.log(nodes, rootEl)"
// nodes:  SourceNode[] for scroll linking
// rootEl: the .markdown-body element for DOM lookup
```

## DOM side (`src/core/domIndex.ts`)

`DomIndex` walks `rootEl` and matches rendered elements back to source nodes,
so an event target (e.g. a heading element the user clicks) can be resolved to
its markdown offset.

## `SyncEngine` (`src/core/syncEngine.ts`)

`SyncEngine` (with `SyncReason` tags) ties it together:

- **Preview → editor**: when the preview scrolls, the currently-visible heading
  resolves to a source offset and the textarea scrolls to (and briefly marks)
  the corresponding line.
- **Editor → preview / TOC click**: a heading offset resolves to the rendered
  element and the preview scrolls it into view.
- **Typing**: the engine keeps the two views aligned while content changes.

It is also what powers:

- the floating **TOC** (`TocTree.vue`), built from `HeadingTree`, with a
  scrollspy that highlights the active heading as you scroll;
- **heading anchors**: clicking a heading anchor either inserts the marker into
  the editor (`headingInsert`) or copies it to the clipboard.

## Interactive tasks (`src/core/tasks.ts`)

Task toggling is source-offset aware:

- `isTaskChecked(md, blockStartOffset)` — read the current checkbox state.
- `toggleTask(md, blockStartOffset, next)` — rewrite the source line and return
  the new document.

`MarkdownRenderer` wires checkbox clicks to these and emits `update:content`
with the rewritten source, so `v-model`-style flows stay in sync without ever
re-rendering from HTML.

## Heading ids (`src/core/headingId.ts`)

`headingId(text)` produces the GitHub-style id (`rehype-slug` also runs; the
sourcemap uses this helper for deterministic heading anchors).
