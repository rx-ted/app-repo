# @rx-ted/packages-markdown-editor

## 0.1.1

### Patch Changes

- c15bdef: Switch shiki syntax highlighting to the lighter JavaScript regex engine so code blocks no longer download the oniguruma wasm bundle at runtime
- e102b47: Commit the generated per-theme CSS assets (`src/themes/__gen/*.css`) so apps that consume the package source can build from a fresh checkout without depending on the theme codegen step or the turbo build cache

## 0.1.0

### Minor Changes

- 49d8e23: Rename `BlogEditor` to `MarkdownEditor` (breaking; no alias), split it into modular composables, add a Vite dist build (ESM, types and CSS exports) and a standalone demo. The save dialog is reduced to a title-only form (metadata carried through `initial-meta`) and the demo saves locally by downloading a `.md` file. A toolbar button exports the page as PDF via `window.print()`; the print styles neutralize the editor's flex height chain so long documents paginate fully.

  Preview themes are cut from 20 to a curated four — `github`, `vscode`, `mk-cute`, `vuepress` (breaking: the old `github-light`/`github-dark` ids are gone). Each theme owns its typography, content box and a light/dark palette; the editor theme (light/dark) now flips the active theme's background instead of picking a different preview theme, and the code theme stays an independent shiki picker. The floating TOC panel gains a minimize button in its header.

- 36d62f0: Add an `overflowOptions` prop (`{ wrapCode?, wrapTables? }`) to `MarkdownEditor` and `MarkdownRenderer` so consumers can opt into wrapping over-wide content: `wrapCode` wraps long code lines instead of scrolling horizontally, and `wrapTables` constrains tables to the container width (fixed layout + wrapped cells). `MarkdownEditor` forwards the object to every internal renderer (preview pane, theme modal, PDF overlay). PDF export always wraps code and tables regardless of the prop, because a static fixed-width sheet would otherwise clip the overflow.
- df5f333: Preview themes are now compiled per theme: each `src/themes/*.scss` builds to its own CSS asset (`dist/themes/<id>.css`), and the renderer/editor inject only the active theme's stylesheet at runtime via a scoped `<link>` (new `./themes/*` subpath export for bundler consumers). Themes are scoped under `[data-me-preview-theme]` / `[data-me-mode]`.

  Adds `cyanosis` and `smart-blue` to the theme set (now six) and makes mk-cute a faithful port of its MIT original. `PreviewThemeConfig` grows `darkable` (light-only themes repeat their light palette in dark mode) and `source` (attribution for the three ported juejin themes: cyanosis, smart-blue, mk-cute), surfaced in the theme picker. `ThemeSource` is exported; `applyPreviewTheme` is kept for backward compatibility.

  Code blocks now keep the shiki background (`keepBackground: true`) so the code theme owns the block background instead of inheriting the theme's `--me-bg-code`, and `pre > code` in the ported themes no longer forces its own `color`/`background` — inline code keeps the theme styling via `code:not(pre > code)`.

  PDF export anchors on a stable `export-pdf-preview` node (`MarkdownRenderer` accepts an `id` prop): both the editor preview and the export overlay carry `id="export-pdf-preview"`, and page attributes are attached there — a named `@page export-pdf` (A4, 16×14mm margins), `break-inside`/`break-after` rules for blocks and headings, and `print-color-adjust: exact` so the chosen preview theme (backgrounds, code-block fills, inline-code chips) survives the print output even with the browser's "background graphics" option off. `exportPdf()` verifies the node exists before printing.

  Docs: made `docs/architecture/` + `docs/guides/` bilingual (`name.md` English, `name.zh.md` Chinese), added blog front-matter + language switchers to every doc, cleaned up stale guides (split `markdown-editor.md` into `markdown-syntax`, removed the unimplemented version-management guide into `docs/implementations/version-management-design.md`, trimmed the Version/Metrics sections from `api-routes.md` that referenced non-existent modules).

### Patch Changes

- d70dfae: Ship the standalone demo prebuilt inside the package: `pnpm build` now also emits `dist/demo`, so the demo travels with the published `dist` folder and can be served from any project that has the package installed (`npx serve node_modules/@rx-ted/packages-markdown-editor/dist/demo`). The demo config builds with a relative base so the static site works from any path. The README's documentation links now point at the repo docs on GitHub instead of relative `../../docs/` paths that are dead in the published tarball.

## 0.0.4

### Patch Changes

- 312bbb3: Test changeset to verify automated patch version bump.

## 0.0.3

### Patch Changes

- 32b8b81: Accumulate markdown editor fixes and refinements.

## 0.0.2

### Patch Changes

- 869ff07: Initialize the markdown editor package as a reusable project with its editor and render pipeline setup.
