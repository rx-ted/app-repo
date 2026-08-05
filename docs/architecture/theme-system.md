---
title: Theme System
author: rx-ted
date: 2026-08-05
category: architecture
tags:
  - themes
  - markdown
  - css
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: en
---

**English** | [中文](./theme-system.zh.md)

# Theme system

Theming is **data + compiled CSS assets**, not hard-coded logic. `src/core/themes.ts`
owns the shapes and the curated list; `src/themes/*.scss` own the actual reading
styles; a build script compiles each SCSS into its own CSS asset; `themeCss.ts`
injects only the active theme at runtime.

## The config shape

```ts
interface PreviewThemeConfig {
  id: string;                    // stable id, also the attribute value
  label: string;                 // shown in the picker
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  contentMaxWidth: string;       // the content "box"
  contentPadding: string;
  vars: Record<EditorTheme, Record<string, string>>;  // palette per light/dark
  codeTheme: Record<EditorTheme, string>;             // default shiki theme per mode
  mermaidTheme: Record<EditorTheme, 'default' | 'dark'>;
  darkable: boolean;             // does an official dark variant exist?
  source?: ThemeSource;          // attribution for ported themes
}
```

### The CSS variable contract

Every theme's SCSS defines the same contract, so components never hard-code
colors. Required palette variables (`REQUIRED_PREVIEW_VARS`):

```
--me-text --me-text-secondary --me-text-muted --me-text-tertiary
--me-border --me-bg --me-bg-soft --me-bg-code --me-bg-highlight
--me-primary --me-link --me-success --me-warning --me-danger --me-info
--me-bg-success --me-bg-warning --me-bg-danger --me-bg-info --me-error
```

Plus typography / box variables (`REQUIRED_PREVIEW_TYPOGRAPHY`):

```
--me-font-family --me-font-size --me-line-height
--me-content-max-width --me-content-padding
```

`themes.spec.ts` asserts every registered theme defines all of these.

## From SCSS to a per-theme CSS asset

1. `src/themes/<id>.scss` — the full reading stylesheet, scoped under
   `[data-me-preview-theme="<id>"]` (and `[data-me-mode]` where palettes differ).
2. `scripts/build-themes.mjs` (run by `pretest` / `prebuild` / `predemo`)
   compiles each SCSS into `src/themes/__gen/<id>.css` (gitignored,
   regenerated on every run).
3. The package's `vite.config.ts` routes those generated files to
   `dist/themes/<id>.css` (via `assetInfo.originalFileName`) instead of the
   hashed `assets/` folder, and `package.json` exposes a `./themes/*` subpath
   export so bundler consumers can import them.

> **Caveat for fresh clones:** `__gen/` is generated, so build the package (or
> run its `pre*` scripts) before building an app that consumes it through
> source aliases.

## Loading at runtime

`src/core/themeCss.ts`:

```ts
loadPreviewThemeCss(themeId)  // idempotent <link> injection, per theme
resetPreviewThemeCss()        // test-only
```

- A `<link rel="stylesheet">` is appended to `<head>` per theme id, tagged
  `data-me-theme-css="<id>"`, **at most once** — links are never torn down, so
  switching themes is cheap and multiple previews (e.g. the theme-modal sample)
  can coexist on one page.
- `MarkdownRenderer` calls it on mount and whenever `theme` changes, and applies
  `data-me-preview-theme` / `data-me-mode` to its root. The editor's preview
  pane does the same through the same component.
- Because the theme `<link>` loads **after** the bundle CSS, theme rules win by
  source order at equal specificity. This is why the theme stylesheets are
  scoped (`[data-me-preview-theme]`) — it keeps them from leaking across themes
  while still winning over base rules.

### Consumers

- **Source consumers** (this repo's `getWorkspaceAliases` in web-blog/demo):
  the `?url` theme imports are bundled and emitted automatically.
- **Dist consumers**: import the stylesheets explicitly through your bundler:

  ```ts
  import '@rx-ted/packages-markdown-editor/themes/cyanosis.css';
  ```

## Code blocks and theme contrast

Two rules keep code readable across every theme combination:

1. **`keepBackground: true`** — shiki writes its `background-color` inline on
   `<pre>`, and `figure[data-rehype-pretty-code-figure]` / `.code-group`
   backgrounds are `transparent`. The code theme, not the reading theme, owns
   the block background.
2. **`pre > code` never forces color/background** — the ported juejin themes
   originally hard-coded `pre > code { color; background }`, which fought the
   shiki inline styles (e.g. dark mk-cute chip text on a light code block).
   Those declarations are stripped; inline code keeps its theme identity via
   `code:not(pre > code)` (using `--me-bg-code`).

## Editor chrome vs preview themes

- `EDITOR_THEMES` (`light` / `dark`) + `EDITOR_THEME_VARS` define the chrome
  (toolbar, panes, dialogs), applied by `applyEditorTheme(el, theme)`.
- The **preview theme** is independent: `useTheme` (in
  `src/components/blog-editor/useTheme.ts`) holds `editorThemeRef`,
  `previewThemeRef`, `codeThemeRef`, keeps them in sync with props, and runs the
  theme picker modal (draft selection + a live sample render).
- `darkable: false` themes (mk-cute, smart-blue) have no official dark variant,
  so they render their light palette under both editor modes — matching the
  originals.

## The six curated themes

| id | Palette | `darkable` | Source |
| --- | --- | --- | --- |
| `github` | GitHub light/dark | ✓ | — |
| `vscode` | VS Code light/dark | ✓ | — |
| `vuepress` | VuePress light/dark | ✓ | — |
| `cyanosis` | Cyanosis light/dark | ✓ | [cumt-robin/juejin-markdown-theme-cyanosis](https://github.com/cumt-robin/juejin-markdown-theme-cyanosis) (MIT) |
| `smart-blue` | Smart blue (light) | — | [cumt-robin/juejin-markdown-theme-smart-blue](https://github.com/cumt-robin/juejin-markdown-theme-smart-blue) (MIT) |
| `mk-cute` | Mk cute (light) | — | [Jacky-Summer/juejin-markdown-theme-mk-cute](https://github.com/Jacky-Summer/juejin-markdown-theme-mk-cute) (MIT) |

The three ported themes are faithful SCSS transplants (see the header of each
`src/themes/*.scss`) and carry their `source` attribution into the picker.

See [custom-themes](../guides/custom-themes.md) to add your own.
