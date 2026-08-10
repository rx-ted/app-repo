# @rx-ted/packages-markdown-editor

[![npm version](https://img.shields.io/npm/v/@rx-ted/packages-markdown-editor)](https://www.npmjs.com/package/@rx-ted/packages-markdown-editor)

A reusable **Vue 3 markdown editor + render pipeline** — a full split-pane
editor and a render-only preview, shipped as a Vite-built ESM package with its
own standalone demo, decoupled from the web-blog app.

---

## Introduction

- **MarkdownEditor** — textarea + live preview, toolbar, floating TOC, save
  dialog, draft autosave, PDF export, bilingual UI (`zh-CN` / `en`).
- **MarkdownRenderer** — render-only preview, the same pipeline as the editor's
  preview pane, with a source map for editor↔preview sync.
- **One pipeline, one source of truth** — markdown → HTML goes through a single
  unified remark/rehype/shiki pipeline (`buildMarkdownPipeline`).
- **Six reading themes** (`github`, `vscode`, `vuepress`, `cyanosis`,
  `smart-blue`, `mk-cute`) + every shiki code theme, loaded as scoped CSS
  assets so only the active theme is fetched.
- Ships as a Vite-built ESM library with a standalone demo and co-located tests.

## Features

- **Editing** — headings, bold/italic/strike/underline, links, blockquote, code
  & inline code, emoji picker, mermaid, KaTeX math, image upload, table picker,
  GFM task lists, full-screen modes.
- **Code highlighting** — per-language badges, line numbers, line highlighting
  (`{1,3,5-6}`), diff highlighting (`// [!code ++]` / `--` or the `diff`
  language), code groups with a tab bar, and single-tab code-block titles.
- **Overflow control** — opt-in auto-wrap for wide code blocks and tables via a
  single `overflowOptions` prop, so wide content fits instead of overflowing;
  PDF export always wraps, so nothing is silently clipped on the print sheet.
- **TOC** — floating, collapsible outline with scroll tracking and click-to-jump.
- **Theming** — per-theme light/dark palettes, curated `PREVIEW_THEMES`, an
  independent shiki code-theme picker, and an API for custom themes.
- **Save** — Ctrl/Cmd+S, save dialog or save-file mode, debounced localStorage
  draft with restore prompt, save-on-unload, `onBeforeSave` gate.
- **PDF export** — standalone overlay + a stable `#export-pdf-preview` node that
  carries all page attributes (A4, break rules, `print-color-adjust: exact`).
- **Localization** — built-in `zh-CN` / `en`, message overrides and
  `registerLocale`.

## Preview

### Editor Theme

- light theme
  ![white mode](https://picx.19981204.xyz/rest/2026/08/NsTz9Jk.png)
- dark theme
  ![dark mode](https://picx.19981204.xyz/rest/2026/08/UwaAKJk.png)

### Preview Theme

- github theme
  ![github](https://picx.19981204.xyz/rest/2026/08/dHpAKJk.png)

- vscode theme
  ![vscode](https://picx.19981204.xyz/rest/2026/08/yh5aKJk.png)

- mk-cute theme
  ![mk-cute](https://picx.19981204.xyz/rest/2026/08/pwqAKJk.png)

- smart-blue theme
  ![smart-blue](https://picx.19981204.xyz/rest/2026/08/2wfaKJk.png)

Run the standalone demo — it renders a bilingual markdown syntax reference
covering headings, text styles, lists, blockquotes, links & images, code
blocks, tables, KaTeX math, directives, raw HTML and mermaid diagrams. The
prebuilt demo ships inside the npm package, so from any project that has it
installed, serve the bundled folder:

```sh
npx serve node_modules/@rx-ted/packages-markdown-editor/dist/demo
# http://localhost:3000
```

In this monorepo, run it from the package directory instead for live
reloading against the source:

```sh
cd packages/markdown-editor
pnpm demo     # http://localhost:5179
```

## Install

```sh
pnpm add @rx-ted/packages-markdown-editor
```

Peer dependencies (installed by the host app): `vue` ^3.5, `naive-ui` ^2.44,
`@iconify/vue` ^5.0.

## Usage

### Full editor

```vue
<script setup lang="ts">
import { ref } from "vue";
import {
  MarkdownEditor,
  type EditorSavePayload,
} from "@rx-ted/packages-markdown-editor";

const content = ref("# Hello\n\nSome **markdown**.");
const onSave = (payload: EditorSavePayload) => {
  console.log("saved", payload.title, content.value);
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
import { MarkdownRenderer } from "@rx-ted/packages-markdown-editor";
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

### Wrap wide code and tables

Opt in to auto-wrapping for wide code blocks and tables with one prop — it is
forwarded to every internal renderer (preview pane, theme modal, PDF overlay):

```vue
<template>
  <MarkdownEditor
    v-model="content"
    :overflow-options="{ wrapCode: true, wrapTables: true }"
  />
</template>
```

> Full component API (props / events / rendered features / core exports):
> [docs/guides/components.md](https://github.com/rx-ted/app-repo/blob/main/docs/guides/components.md).

## Documentation

### Architecture — how it works

| Doc                                                                                  | What it covers                                                                     |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| [architecture/README.md](https://github.com/rx-ted/app-repo/blob/main/docs/architecture/README.md) | Overview + design decisions                                                        |
| [architecture/render-pipeline.md](https://github.com/rx-ted/app-repo/blob/main/docs/architecture/render-pipeline.md) | Unified remark→rehype→shiki pipeline, code-group plugins, KaTeX, mermaid           |
| [architecture/theme-system.md](https://github.com/rx-ted/app-repo/blob/main/docs/architecture/theme-system.md) | Theme config shape, per-theme CSS assets, scoped `<link>` loading, contrast rules  |
| [architecture/sync-engine.md](https://github.com/rx-ted/app-repo/blob/main/docs/architecture/sync-engine.md) | Source map, scroll linking, TOC, interactive tasks                                 |
| [architecture/pdf-export.md](https://github.com/rx-ted/app-repo/blob/main/docs/architecture/pdf-export.md) | Print overlay, `@page`/break rules, `print-color-adjust`, forced overflow wrapping |

### Guides — how to use it

| Doc                                                                                          | What it covers                                          |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [guides/README.md](https://github.com/rx-ted/app-repo/blob/main/docs/guides/README.md)       | Guides index                                            |
| [guides/components.md](https://github.com/rx-ted/app-repo/blob/main/docs/guides/components.md) | Component props/events, rendered features, core exports |
| [guides/custom-themes.md](https://github.com/rx-ted/app-repo/blob/main/docs/guides/custom-themes.md) | Build and register a custom preview theme               |
| [guides/localization.md](https://github.com/rx-ted/app-repo/blob/main/docs/guides/localization.md) | `createI18n`, overrides, `registerLocale`               |
| [guides/markdown-editor-development.md](https://github.com/rx-ted/app-repo/blob/main/docs/guides/markdown-editor-development.md) | Repo layout, scripts, build, testing                    |

## Contribute

Contributions are welcome. This package lives in the monorepo at
`packages/markdown-editor`; its docs, demo and tests are co-located.

```sh
pnpm demo          # standalone demo (http://localhost:5179)
pnpm test          # vitest run
pnpm typecheck     # vue-tsc --noEmit
pnpm build         # vite build + vue-tsc + postbuild
```

Guidelines:

- **Scope commits** — use Conventional Commits with the package scope, e.g.
  `feat(packages/markdown-editor): ...`, `fix(packages/markdown-editor): ...`.
- **Keep docs bilingual** — when a change affects behaviour or the public API,
  update both the English and `.zh.md` docs.
- **Run the checks** — `pnpm typecheck`, `pnpm test` and biome must pass before
  merging; the pre-commit hook runs them for you.
- **Update the demo** — the standalone demo doubles as a feature showcase, so
  new features should appear there too.
- **Add a changeset** — for package releases, include a changeset under
  `.changeset/` describing the user-facing change.

Report issues and open pull requests on
[github.com/rx-ted/app-repo](https://github.com/rx-ted/app-repo).
