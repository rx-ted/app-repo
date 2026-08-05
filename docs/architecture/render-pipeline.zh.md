---
title: 渲染管线
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
lang: zh-CN
---
[English](./render-pipeline.md) | **中文**

# 渲染管线

`src/core/markdown.ts` 基于 [`unified`](https://github.com/unifiedjs/unified) 构建了一条统一的 markdown→HTML 渲染管线。`MarkdownRenderer` 和编辑器的预览面板共用同一条管线，因此独立渲染与编辑器内预览永远不会出现偏差。

## `buildMarkdownPipeline(options)`

选项（均为可选）：

| 选项 | 默认值 | 作用 |
| --- | --- | --- |
| `sourceMap` | `true` | 为每个渲染元素记录 `SourceNode`（见 [同步引擎](./sync-engine.zh.md)） |
| `codeTheme` | `'github-light'` | 传给 `rehype-pretty-code` 的 Shiki 代码主题 id |
| `interactiveTasks` | `false` | 让 GFM 任务复选框可点击（`rehypeInteractiveTasks`） |

### 插件顺序（remark）

```
remark-parse
  → remark-directive + remarkDirectiveHandler     ::details/::note 等指令
  → remarkFrontMatter                             开头的 YAML → <table> 或丢弃
  → remarkCodeLabel                               捕获 ```ts title="..." / group= / tab=
  → [remarkSourceMap]                             （开启 sourceMap 时）记录节点偏移
  → remark-gfm                                    表格、任务列表、删除线、自动链接
  → remark-math                                   $...$ 和 $$...$$
  → remark-emoji                                  :tada: → emoji
  → remarkHighlight                               ==mark== → <mark>
  → remark-rehype (allowDangerousHtml: true)      HTML 透传
```

### 插件顺序（rehype）

```
rehype-capture-code-meta        在 rehype-raw 吞掉 meta 之前先暂存每个 <pre> 的 code meta
  → rehype-raw                  允许源码中的原始 HTML
  → rehype-details-heading      ::details 带 summary
  → rehype-mermaid              ```mermaid → <div class="mermaid">（客户端渲染）
  → rehype-pretty-code (shiki)  语法高亮（见下文）
  → rehype-code-data            为 <pre> 标注 data-lang / meta
  → rehype-line-highlight       {2-3} 范围 → .highlighted 行 span
  → rehype-code-group           相邻 group= 的代码块 → 选项卡 :::
  → rehype-restore-code-blocks  rehype-raw 处理后把 <pre> 放回去
  → rehype-diff-mark            [!code ++/--] → diff span
  → rehype-notation-diff        通过 {4-4} 实现 diff 范围
  → rehype-katex                数学公式 → KaTeX 标记
  → rehype-slug                 标题 id（随后通过 headingId.ts 改为 GitHub 风格）
  → rehype-autolink-headings    为标题前置 `#` ×深度锚点
  → [rehypeInteractiveTasks]    （开启 interactiveTasks 时）启用任务复选框
  → rehype-stringify
```

代码块相关功能放在 `src/core/rehypeCodeGroup.ts` 中，以小而可组合的 rehype 插件形式存在，而不是单个臃肿的 pass。

## 代码高亮

`getPrettyCodeOptions(codeTheme)` 配置 `rehype-pretty-code`：

- `keepBackground: true` — shiki 的 `background-color` 以**内联样式**写在 `<pre>` 上，因此代码主题拥有块级背景。阅读主题的 figure/code-group 背景是透明的；一个块绝不会把深色代码主题的 token 渲染在浅色块背景上（反之亦然）。
- `defaultLang: 'plaintext'` — 未标注语言的代码块可以优雅降级。
- `filterMetaString` 会在 pretty-code 处理之前剥掉内部的 `group=`/`tab=` 和 `{2-3}` meta token。

### 代码块增强（客户端，位于 `MarkdownRenderer`）

HTML 进入 DOM 之后：

- 每个 `pre[data-theme]` 提供**复制按钮**和**行号开关**。
- **折叠** — 高度超过 `400px` 的代码块会出现折叠按钮（`code-collapsible`）。
- **Mermaid** — `<div class="mermaid">` 块通过动态 `import('mermaid')` 初始化，并使用预览主题的 `mermaidTheme`。
- **交互式任务** — 复选框去掉 `disabled`，并通过 `update:content` 发出切换后的源码（经由 `src/core/tasks.ts` 的 `toggleTask`）。

## Front-matter

`remarkFrontMatter` 将开头的 YAML 块转换为元数据 `<table>`（默认）或将其丢弃（`render: 'hide'`）。供你自行使用的剥离能力以 `stripFrontMatter(md)` 暴露。

## 输出

`renderMarkdown(md, opts)` 返回：

```ts
{ html: string; nodes: SourceNode[] }
```

`html` 是序列化后的文档字符串；`nodes` 是同步引擎（以及 `MarkdownRenderer` 的 `ready` 事件）消费的 source map。

## 渲染

管线刻意设计为**只渲染一次**：当 `content` / `theme` / `codeTheme` / `mode` 变化时，`MarkdownRenderer` 会重新运行它，然后通过 `v-html` 修补 DOM，并重新应用客户端增强。
