---
title: 同步引擎
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
lang: zh-CN
---
[English](./sync-engine.md) | **中文**

# 同步引擎

编辑器需要随时知道哪个渲染元素对应 markdown 源码的哪一部分——用于滚动联动、标题导航、任务切换和 TOC。这个契约就是 **source map**：一个带 markdown 偏移量的 `SourceNode` 扁平列表。

## 数据模型（`src/core/sourcemap.ts`）

```ts
interface SourceNode {
  id: number;            // 唯一、按顺序分配的节点 id
  kind: NodeKind;        // 'paragraph' | 'heading' | 'code' | 'list' | ...
  startLine: number;     // 源码行，从 1 开始
  endLine: number;       // 源码行，从 1 开始
  startOffset: number;   // markdown 源码中的偏移量，从 0 开始
  endOffset: number;     // markdown 源码中的偏移量，从 0 开始
  depth?: number;        // 仅标题：1..6
  parentId?: number;     // 父节点 id
  children?: number[];   // 子节点 id 列表
}

class MarkdownIndex {
  // 由 SourceNode[] 构建：按行 / 偏移 / id 查找（二分查找）
}

class HeadingTree {
  // 仅标题的层级结构，用于 TOC（按 depth 嵌套）
}
```

## 构建映射（`src/core/remarkSourceMap.ts`）

`remarkSourceMap` 运行在管线的 remark 阶段（见 [渲染管线](./render-pipeline.zh.md)）。unified 遍历 markdown AST 时，它把每个块 / 标题的源码偏移记录进共享的 `SourceNode[]` 数组——也就是 `renderMarkdown` 返回的那个数组。这一步发生在 **remark** 阶段，因此偏移量指向的是*源文本*，而不是渲染后的 HTML。

`MarkdownRenderer` 在 `ready` 时发出结果：

```ts
@ready="({ nodes, rootEl }) => console.log(nodes, rootEl)"
// nodes:  SourceNode[]，用于滚动联动
// rootEl: .markdown-body 元素，用于 DOM 查找
```

## DOM 侧（`src/core/domIndex.ts`）

`DomIndex` 遍历 `rootEl`，把渲染后的元素匹配回源节点，这样事件目标（例如用户点击的标题元素）就能解析回它的 markdown 偏移量。

## `SyncEngine`（`src/core/syncEngine.ts`）

`SyncEngine`（带 `SyncReason` 标签）把这一切串起来：

- **预览 → 编辑器**：预览滚动时，当前可见的标题解析为源码偏移量，textarea 滚动到对应行（并短暂标记）。
- **编辑器 → 预览 / TOC 点击**：标题偏移量解析为渲染后的元素，预览把它滚动到视野内。
- **输入**：内容变化时，引擎让两个视图保持对齐。

它还支撑以下功能：

- 浮动 **TOC**（`TocTree.vue`），由 `HeadingTree` 构建，带 scrollspy——滚动时高亮当前活动标题；
- **标题锚点**：点击标题锚点会把标记插入编辑器（`headingInsert`），或复制到剪贴板。

## 交互式任务（`src/core/tasks.ts`）

任务切换是感知源码偏移的：

- `isTaskChecked(md, blockStartOffset)` — 读取当前复选框状态。
- `toggleTask(md, blockStartOffset, next)` — 重写源码行并返回新文档。

`MarkdownRenderer` 把复选框点击接到这些函数，并通过 `update:content` 发出重写后的源码，因此 `v-model` 风格的流程无需从 HTML 重新渲染就能保持同步。

## 标题 id（`src/core/headingId.ts`）

`headingId(text)` 生成 GitHub 风格的 id（`rehype-slug` 也会运行；sourcemap 用这个辅助函数保证标题锚点的确定性）。
