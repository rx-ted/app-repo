---
title: Component API
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
lang: en
---

**English** | [中文](./components.zh.md)

# Components & core exports

## `MarkdownEditor`

The full editor: textarea + rendered preview in a split pane, toolbar, floating
TOC, status bar, save dialog, draft autosave and PDF export.

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `modelValue` | `string` | — (required) | The markdown content (`v-model`) |
| `loading` | `boolean` | `false` | Set `false → true` after a successful save to clear the draft |
| `isEdit` | `boolean` | `false` | Edit mode; skips draft restore on mount |
| `tagOptions` / `categoryOptions` | `{ label, value }[]` | — | Deprecated compat; the title-only dialog no longer uses them |
| `initialMeta` | `Partial<EditorSavePayload>` | — | Pre-fills the save dialog (title, cover, status, …) |
| `helpHref` | `string` | — | Opens a help page from the toolbar |
| `draftStorageKey` | `string` | `editor:draft` | localStorage key for the debounced draft autosave |
| `autoRestore` | `boolean` | `false` | Restore the draft without prompting |
| `editorTheme` | `'light' \| 'dark'` | `light` | Editor chrome mode |
| `previewTheme` | `string` | `github` | One of `PREVIEW_THEMES[].id` |
| `codeTheme` | `string` | theme default | Shiki code theme id (see `CODE_THEMES`) |
| `locale` | `'zh-CN' \| 'en'` | `zh-CN` | UI language |
| `messages` | `Partial<MessageSchema>` | `{}` | Message overrides |
| `createdAt` / `updatedAt` | `string \| number \| null` | — | Shown in the status bar |
| `uploadImage` | `(file: File) => Promise<string>` | — | Returns a URL / data URI for the picked image |
| `saveMode` | `'file' \| 'dialog'` | `file` | `dialog` opens the save modal; `file` emits `saveFile` with the content |
| `onBeforeSave` | `(content: string) => void \| Promise<void>` | — | Run before saving; `throw`/reject to abort the save |

### Events

| Event | Payload | Description |
| --- | --- | --- |
| `update:modelValue` | `string` | Content changed |
| `save` | `EditorSavePayload` | Save dialog confirmed |
| `saveFile` | `string` | Content saved in `file` mode |
| `cancel` | — | User cancelled the dialog |
| `update:editorTheme` | `'light' \| 'dark'` | Editor theme changed |
| `update:previewTheme` | `string` | Preview theme changed |
| `update:codeTheme` | `string \| undefined` | Code theme changed |
| `update:locale` | `'zh-CN' \| 'en'` | Locale changed |

## `MarkdownRenderer`

Renders markdown to styled HTML with a sourcemap for editor↔preview sync.

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `content` | `string` | — (required) | Markdown source |
| `theme` | `string` | `github` | Preview theme id |
| `codeTheme` | `string` | theme default | Shiki code theme id |
| `mode` | `'light' \| 'dark'` | `light` | Palette mode |
| `interactiveTasks` | `boolean` | `false` | Clicking a task checkbox emits `update:content` with the toggled source |
| `headingInsert` | `boolean` | `false` | Clicking a heading anchor emits `insertHeading` (else copies to clipboard) |
| `id` | `string` | — | Optional stable id on the root node (e.g. `export-pdf-preview` for print targeting) |

### Events

- `ready` — `{ nodes: SourceNode[], rootEl: HTMLElement }` after the first render (feeds the scroll-sync engine).
- `insertHeading` — `string` marker from a heading anchor click.
- `update:content` — `string` when an interactive task is toggled.

### Rendered features

Code blocks (highlighted with `rehype-pretty-code`, language badge, line numbers
toggle, copy button, fold on long blocks), `::: code-group` tabs with `title=`
labels, `{2-3}` line highlighting, `[!code ++/--]` diff marks, inline math
(KaTeX) and block math, `mermaid` diagrams, GFM tables/task lists,
`==highlight==` marks, front-matter metadata tables, and `details` blocks.

## Core exports

Beyond the components, `src/index.ts` exports the render pipeline and helpers:

- `renderMarkdown(md, opts)` / `buildMarkdownPipeline(opts)` — `MarkdownRenderResult { html, nodes }`.
- Source map: `MarkdownIndex`, `DomIndex`, `SyncEngine`, `remarkSourceMap`, `SourceNode`.
- `stripFrontMatter(md)`, `headingId(text)`, `isTaskChecked(md, offset)`, `toggleTask(md, offset, next)`.
- `PREVIEW_THEMES`, `CODE_THEMES`, `getPreviewTheme`, `applyPreviewTheme`, `getEditorTheme`, `applyEditorTheme`, `ThemeSource`.
- `createI18n`, `registerLocale` (see [localization](./localization.md)).
