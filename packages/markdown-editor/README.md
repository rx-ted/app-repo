# @rx-ted/packages-markdown-editor

A reusable, Vue 3 **markdown editor + render pipeline** — a full split-pane
editor and a render-only preview, shipped as a Vite-built ESM package with its
own standalone demo, decoupled from the web-blog app.

---

## 项目介绍

- **MarkdownEditor** — textarea + live preview, toolbar, floating TOC, save
  dialog, draft autosave and PDF export.
- **MarkdownRenderer** — render-only preview, the same pipeline as the editor's
  preview pane, with a source map for editor↔preview sync.
- **One pipeline, one source of truth** — markdown → HTML goes through a single
  unified remark/rehype/shiki pipeline (`buildMarkdownPipeline`).
- **Six reading themes** (`github`, `vscode`, `vuepress`, `cyanosis`,
  `smart-blue`, `mk-cute`) + every shiki code theme, loaded as scoped CSS
  assets so only the active theme is fetched.
- Ships as a Vite-built ESM library with a standalone demo and co-located tests.

## Features

- **Editing** — headings, bold/italic, links, quote, code, inline code, emoji
  picker, mermaid, math, image upload, table picker, GFM task lists, full-screen.
- **TOC** — floating, collapsible outline with scroll tracking and click-to-jump.
- **Theming** — per-theme light/dark palettes, curated `PREVIEW_THEMES`, an
  independent shiki code-theme picker, and an API for custom themes.
- **Save** — Ctrl/Cmd+S, title-only dialog, debounced localStorage draft with
  restore prompt, save-on-unload, `onBeforeSave` gate.
- **PDF export** — standalone overlay + a stable `#export-pdf-preview` node that
  carries all page attributes (A4, break rules, `print-color-adjust: exact`).
- **Localization** — `zh-CN` / `en` with overrides and `registerLocale`.

## Architecture

```
markdown source
      │
      ▼
 Render pipeline (unified remark→rehype→shiki, src/core/markdown.ts)
      │ html + sourceNodes
      ▼
 MarkdownRenderer.vue  ──►  Sync engine (source map ↔ scroll linking)
      │                     Theme system (data + per-theme CSS assets)
      └─────────────────────►  PDF export (overlay + print page attrs)
```

Four pillars, each documented in depth under `docs/architecture/`:

| Pillar | Doc |
| --- | --- |
| Render pipeline | [docs/architecture/render-pipeline.md](../../docs/architecture/render-pipeline.md) |
| Theme system | [docs/architecture/theme-system.md](../../docs/architecture/theme-system.md) |
| Sync engine | [docs/architecture/sync-engine.md](../../docs/architecture/sync-engine.md) |
| PDF export | [docs/architecture/pdf-export.md](../../docs/architecture/pdf-export.md) |

## Quick Start

### Install

```sh
pnpm add @rx-ted/packages-markdown-editor
```

Peer dependencies (installed by the host app): `vue` ^3.5, `naive-ui` ^2.44,
`@iconify/vue` ^5.0.

### Full editor

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownEditor, type EditorSavePayload } from '@rx-ted/packages-markdown-editor';

const content = ref('# Hello\n\nSome **markdown**.');
const onSave = (payload: EditorSavePayload) => {
  console.log('saved', payload.title, content.value);
};
</script>

<template>
  <MarkdownEditor
    v-model="content"
    :is-edit="true"
    editor-theme="light"
    preview-theme="github"
    locale="zh-CN"
    :upload-image="(file) => Promise.resolve(`/uploads/${file.name}`)"
    :initial-meta="{ title: 'Untitled' }"
    save-mode="dialog"
    @save="onSave"
  />
</template>
```

### Render-only

```vue
<script setup lang="ts">
import { MarkdownRenderer } from '@rx-ted/packages-markdown-editor';
</script>

<template>
  <MarkdownRenderer
    content="# Title"
    theme="cyanosis"
    mode="dark"
    :interactive-tasks="true"
    @ready="({ nodes, rootEl }) => console.log(nodes, rootEl)"
  />
</template>
```

> Full component API (props / events / rendered features / core exports):
> [docs/guides/components.md](../../docs/guides/components.md).

## Development

```sh
pnpm demo          # standalone demo (http://localhost:5179)
pnpm test          # vitest run
pnpm typecheck     # vue-tsc --noEmit
pnpm build         # vite build + vue-tsc + postbuild
```

Repo layout, build caveats (generated `src/themes/__gen/`, `dist/themes/*`),
consumer aliases and testing conventions:
[docs/guides/markdown-editor-development.md](../../docs/guides/markdown-editor-development.md).

## Documentation

### Architecture — how it works

| Doc | What it covers |
| --- | --- |
| [docs/architecture/README.md](../../docs/architecture/README.md) | Overview + design decisions |
| [docs/architecture/render-pipeline.md](../../docs/architecture/render-pipeline.md) | Unified remark→rehype→shiki pipeline, code-group plugins, KaTeX, mermaid |
| [docs/architecture/theme-system.md](../../docs/architecture/theme-system.md) | Theme config shape, per-theme CSS assets, scoped `<link>` loading, contrast rules |
| [docs/architecture/sync-engine.md](../../docs/architecture/sync-engine.md) | Source map, scroll linking, TOC, interactive tasks |
| [docs/architecture/pdf-export.md](../../docs/architecture/pdf-export.md) | Print overlay, `@page`/break rules, `print-color-adjust` |

### Guides — how to use it

| Doc | What it covers |
| --- | --- |
| [docs/guides/README.md](../../docs/guides/README.md) | Guides index |
| [docs/guides/components.md](../../docs/guides/components.md) | Component props/events, rendered features, core exports |
| [docs/guides/custom-themes.md](../../docs/guides/custom-themes.md) | Build and register a custom preview theme |
| [docs/guides/localization.md](../../docs/guides/localization.md) | `createI18n`, overrides, `registerLocale` |
| [docs/guides/markdown-editor-development.md](../../docs/guides/markdown-editor-development.md) | Repo layout, scripts, build, testing |
