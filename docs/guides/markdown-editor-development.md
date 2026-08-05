---
title: Development Guide
author: rx-ted
date: 2026-08-05
category: guide
tags:
  - development
  - build
  - testing
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: en
---

**English** | [中文](./markdown-editor-development.zh.md)

# Development

## Repo layout

```
packages/markdown-editor/
├── demo/                    standalone demo app (its own vite config)
├── docs/
│   ├── architecture/        how the internals work
│   └── guides/              task-oriented usage
├── scripts/
│   └── build-themes.mjs     compiles src/themes/*.scss → src/themes/__gen/*.css
├── src/
│   ├── components/
│   │   ├── MarkdownEditor.vue
│   │   ├── MarkdownRenderer.vue
│   │   ├── MarkdownEditorSaveDialog.vue
│   │   ├── TocTree.vue
│   │   └── blog-editor/     composables (useTheme, useSave, useFullscreen, …)
│   ├── core/
│   │   ├── markdown.ts            unified pipeline
│   │   ├── rehypeCodeGroup.ts     code groups / diff / line highlights
│   │   ├── sourcemap.ts / syncEngine.ts / domIndex.ts / remarkSourceMap.ts
│   │   ├── themes.ts / themeCss.ts
│   │   ├── tasks.ts / stripFrontMatter.ts / headingId.ts
│   ├── lang/                zh-CN / en + createI18n
│   ├── themes/              per-theme SCSS + generated __gen/ + urls.ts
│   └── index.ts             public export surface
└── *.spec.ts                tests co-located with their source
```

## Scripts

```sh
pnpm demo          # standalone demo (http://localhost:5179)
pnpm test          # vitest run (pretest regenerates theme CSS)
pnpm typecheck     # vue-tsc --noEmit
pnpm build         # vite build + vue-tsc + postbuild (prebuild regenerates theme CSS)
```

## Build details

- **Lib build** (`vite.config.ts`): `src/index.ts` → `dist/index.js` (ESM).
  Dependencies and peer dependencies are externalized.
- **Theme assets**: `scripts/build-themes.mjs` runs on `pre*` hooks and compiles
  each SCSS to `src/themes/__gen/<id>.css`. `vite.config.ts` routes those to
  `dist/themes/<id>.css` (keyed on `assetInfo.originalFileName`), and
  `package.json` exposes the `./themes/*` subpath export.
- **`src/themes/__gen/` is gitignored and generated** — a fresh clone must run a
  `pre*` script (or the package build) before a source-alias consumer builds.
- **postbuild** strips the side-effect `katex.css` / theme imports from the
  emitted `dist/index.d.ts` so typings stay clean.

## Consumers

- This repo's web-blog/demo resolve the package to **source** via
  `getWorkspaceAliases` (the `vitest` export condition), so changes are live
  after a dev-server restart.
- Dist consumers import the component from the package and theme stylesheets
  explicitly (`@rx-ted/packages-markdown-editor/themes/<id>.css`).

## Testing conventions

- Tests are co-located: `src/core/markdown.spec.ts`, `themes.spec.ts`, etc.
- Vitest runs in a **node environment** — `?url` CSS imports resolve to `""`, so
  asset-existence assertions check the `src/themes/__gen/<id>.css` files on disk
  rather than the URL map.
- `themes.spec.ts` enforces the theme contract (required vars, `codeTheme`,
  `mermaidTheme`, `darkable`, `source`) and that each theme's compiled asset
  exists.
- `lang.spec.ts` enforces zh-CN / en key parity.
