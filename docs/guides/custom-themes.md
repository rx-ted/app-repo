---
title: Custom Themes
author: rx-ted
date: 2026-08-05
category: guide
tags:
  - themes
  - scss
  - markdown
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: en
---

**English** | [中文](./custom-themes.zh.md)

# Custom preview themes

A preview theme is a `PreviewThemeConfig` plus a scoped SCSS stylesheet. The
two must agree on the CSS variable contract so components never hard-code
colors.

## 1. Define the config

Register your theme in `PREVIEW_THEMES` in `src/core/themes.ts`:

```ts
{
  id: 'my-theme',
  label: 'My Theme',
  fontFamily: "'Source Serif 4', Georgia, serif",
  fontSize: '17px',
  lineHeight: '1.9',
  contentMaxWidth: '780px',
  contentPadding: '32px',
  vars: {
    light: {
      '--me-text': '#202124',
      '--me-text-secondary': '#5f6368',
      '--me-bg': '#ffffff',
      '--me-bg-code': '#f6f8fa',
      '--me-link': '#1a73e8',
      /* ... every REQUIRED_PREVIEW_VARS key */
    },
    dark: {
      /* repeat if your theme has an official dark variant */
    },
  },
  codeTheme: { light: 'github-light', dark: 'github-dark' },
  mermaidTheme: { light: 'default', dark: 'dark' },
  darkable: true,
  source: { name: '…', author: '…', url: '…', license: 'MIT' }, // optional attribution
}
```

## 2. Write the SCSS

Create `src/themes/my-theme.scss`, scoped to the theme so it cannot leak:

```scss
[data-me-preview-theme='my-theme'] {
  /* palette + typography via the --me-* variables … */

  .markdown-body {
    font-family: var(--me-font-family);
    color: var(--me-text);
    /* … full reading style */
  }
}
```

Two hard rules, inherited from [theme-system](../architecture/theme-system.md):

- **`pre > code` must never set `color` / `background`** — the shiki code theme
  owns those via `keepBackground: true` (inline on `<pre>`). Only block-level
  layout (`font-family`, radius, padding, overflow, …) belongs there.
- **Inline code** keeps its chip styling via `code:not(pre > code)` (using
  `--me-bg-code`), so it survives theme contrast fixes.

If your theme has no dark variant, set `darkable: false` — it then renders its
light palette under both editor modes (as mk-cute / smart-blue do).

## 3. Wire it up

The build script (`scripts/build-themes.mjs`, run by `pretest`/`prebuild`/
`predemo`) compiles every `src/themes/*.scss` into `src/themes/__gen/*.css`,
which the package build emits as `dist/themes/<id>.css`. `MarkdownRenderer` and
the theme picker pick up the new theme automatically from `PREVIEW_THEMES`.

## 4. Give it a source

Ported themes should carry `source` — the picker renders the attribution and
`themes.spec.ts` checks each entry's integrity (id, vars, `codeTheme`,
`mermaidTheme`, `darkable`, and that the compiled asset exists).

## Porting from a juejin theme

The existing ports (cyanosis, smart-blue, mk-cute) are faithful SCSS
transplants of their MIT originals — see the header of each `src/themes/*.scss`
for the exact approach: copy the original styles into the `[data-me-preview-theme]`
scope, map hard-coded colors onto the `--me-*` contract, and keep the original's
prose palette as `vars`.
