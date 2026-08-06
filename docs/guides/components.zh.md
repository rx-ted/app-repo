---
title: 组件 API
author: rx-ted
date: 2026-08-05
category: guide
tags:
  - components
  - markdown
  - vue
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: zh-CN
---

[English](./components.md) | **中文**

# 组件 API

## `MarkdownEditor`

完整的编辑器：textarea 与渲染预览的左右分栏、工具栏、浮动目录（TOC）、状态栏、保存对话框、草稿自动保存以及 PDF 导出。

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | `string` | —（必填） | Markdown 内容（`v-model`） |
| `loading` | `boolean` | `false` | 保存成功后将其从 `false → true`，以清除草稿 |
| `isEdit` | `boolean` | `false` | 编辑模式；挂载时跳过草稿恢复 |
| `tagOptions` / `categoryOptions` | `{ label, value }[]` | — | 已废弃的兼容项；仅标题对话框已不再使用它们 |
| `initialMeta` | `Partial<EditorSavePayload>` | — | 预填保存对话框（标题、封面、状态……） |
| `helpHref` | `string` | — | 从工具栏打开帮助页面 |
| `draftStorageKey` | `string` | `editor:draft` | 防抖草稿自动保存使用的 localStorage 键 |
| `autoRestore` | `boolean` | `false` | 不提示直接恢复草稿 |
| `editorTheme` | `'light' \| 'dark'` | `light` | 编辑器外壳模式 |
| `previewTheme` | `string` | `github` | `PREVIEW_THEMES[].id` 之一 |
| `codeTheme` | `string` | 主题默认值 | Shiki 代码主题 id（参见 `CODE_THEMES`） |
| `locale` | `'zh-CN' \| 'en'` | `zh-CN` | 界面语言 |
| `messages` | `Partial<MessageSchema>` | `{}` | 文案覆写 |
| `createdAt` / `updatedAt` | `string \| number \| null` | — | 显示在状态栏中 |
| `uploadImage` | `(file: File) => Promise<string>` | — | 返回所选图片的 URL / data URI |
| `saveMode` | `'file' \| 'dialog'` | `file` | `dialog` 打开保存弹窗；`file` 触发 `saveFile` 事件并携带内容 |
| `onBeforeSave` | `(content: string) => void \| Promise<void>` | — | 在保存前执行；`throw`/reject 以中止保存 |
| `overflowOptions` | `MarkdownOverflowOptions` | `{}` | 溢出换行设置：`{ wrapCode?, wrapTables? }`——见下文。会转发给所有内部渲染器（预览、主题弹窗、PDF 覆盖层）。PDF 导出始终强制换行，与该项无关 |

### Events

| Event | 载荷 | 说明 |
| --- | --- | --- |
| `update:modelValue` | `string` | 内容发生变化 |
| `save` | `EditorSavePayload` | 保存对话框已确认 |
| `saveFile` | `string` | 内容以 `file` 模式保存 |
| `cancel` | — | 用户取消了对话框 |
| `update:editorTheme` | `'light' \| 'dark'` | 编辑器主题已更改 |
| `update:previewTheme` | `string` | 预览主题已更改 |
| `update:codeTheme` | `string \| undefined` | 代码主题已更改 |
| `update:locale` | `'zh-CN' \| 'en'` | 语言环境已更改 |

## `MarkdownRenderer`

将 Markdown 渲染为带样式的 HTML，并通过 sourcemap 实现编辑器↔预览同步。

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `content` | `string` | —（必填） | Markdown 源码 |
| `theme` | `string` | `github` | 预览主题 id |
| `codeTheme` | `string` | 主题默认值 | Shiki 代码主题 id |
| `mode` | `'light' \| 'dark'` | `light` | 配色模式 |
| `interactiveTasks` | `boolean` | `false` | 点击任务复选框时触发 `update:content` 并携带切换后的源码 |
| `headingInsert` | `boolean` | `false` | 点击标题锚点时触发 `insertHeading`（否则复制到剪贴板） |
| `id` | `string` | — | 根节点上的可选稳定 id（例如用于打印定位的 `export-pdf-preview`） |
| `overflowOptions` | `MarkdownOverflowOptions` | `{}` | `wrapCode` 让超长代码行换行而不是横向滚动；`wrapTables` 把表格约束在容器宽度内（固定布局 + 单元格换行）。默认 `{}` 保持现有的滚动/溢出行为 |

### Events

- `ready` — 首次渲染后触发 `{ nodes: SourceNode[], rootEl: HTMLElement }`（为滚动同步引擎提供数据）。
- `insertHeading` — 点击标题锚点产生的 `string` 标记。
- `update:content` — 交互式任务被切换时触发，携带 `string`。

### 渲染特性

代码块（使用 `rehype-pretty-code` 高亮、语言徽标、行号开关、复制按钮、长代码块折叠）、带 `title=` 标签的 `::: code-group` 标签页、`{2-3}` 行高亮、`[!code ++/--]` 差异标记、行内数学公式（KaTeX）与块级数学公式、`mermaid` 图表、GFM 表格/任务列表、`==highlight==` 标记、front-matter 元数据表格以及 `details` 块。

## 核心导出

除组件外，`src/index.ts` 还导出了渲染管线与辅助工具：

- `renderMarkdown(md, opts)` / `buildMarkdownPipeline(opts)` — `MarkdownRenderResult { html, nodes }`。
- 源码映射：`MarkdownIndex`、`DomIndex`、`SyncEngine`、`remarkSourceMap`、`SourceNode`。
- `stripFrontMatter(md)`、`headingId(text)`、`isTaskChecked(md, offset)`、`toggleTask(md, offset, next)`。
- `PREVIEW_THEMES`、`CODE_THEMES`、`getPreviewTheme`、`applyPreviewTheme`、`getEditorTheme`、`applyEditorTheme`、`ThemeSource`。
- `createI18n`、`registerLocale`（参见 [本地化](./localization.zh.md)）。
