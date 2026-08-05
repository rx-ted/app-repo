---
title: PDF Export
author: rx-ted
date: 2026-08-05
category: architecture
tags:
  - pdf
  - print
  - markdown
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: en
---

**English** | [中文](./pdf-export.zh.md)

# PDF export

PDF export re-renders the document **standalone** so the consumer's layout can
never clip or paginate it incorrectly, then prints through a stable
`#export-pdf-preview` node that carries every page attribute.

## The overlay

```html
<Teleport to="body">
  <div v-if="pdfOverlayVisible" class="pdf-print-overlay" :style="pdfOverlayVars">
    <MarkdownRenderer
      id="export-pdf-preview"
      :content="currentValue"
      :theme="previewThemeRef"
      :code-theme="codeThemeRef"
      :mode="editorThemeRef"
      @ready="pdfOverlayReady = true"
    />
  </div>
</Teleport>
```

- A **fresh `MarkdownRenderer`** is mounted (same theme / code theme / mode as
  the on-screen preview), so what you print is exactly what you see — including
  the loaded theme stylesheet.
- `.pdf-print-overlay` is a fixed, full-viewport, white container on screen;
  in print it becomes `static` with visible overflow.

## The print flow

`exportPdf()` (in `MarkdownEditor.vue`):

1. Show the overlay and reset `pdfOverlayReady`.
2. `await nextTick()`, then poll with `requestAnimationFrame` until the
   renderer emits `ready` (markdown rendering is async — shiki, mermaid, …).
3. Settle `300ms` for fonts/layout.
4. Verify `#export-pdf-preview` exists (mirrors the upstream
   `md-editor-extension` `ExportPDF` guard, whose `EDITOR_ID` is
   `'export-pdf-preview'`).
5. `window.print()`; hide the overlay on `afterprint`, with a 30s fallback
   timer in case `afterprint` never fires (headless / cancelled dialog).

## Page attributes on `#export-pdf-preview`

The print stylesheet (global `<style>` in `MarkdownEditor.vue`) attaches
everything to the one node:

```css
@page export-pdf {
  size: A4;
  margin: 16mm 14mm;
}

#export-pdf-preview {
  page: export-pdf;
}

@media print {
  #export-pdf-preview, #export-pdf-preview * {
    print-color-adjust: exact;        /* keep theme backgrounds */
    -webkit-print-color-adjust: exact;
  }
  #export-pdf-preview pre,
  #export-pdf-preview table,
  #export-pdf-preview blockquote,
  #export-pdf-preview details,
  #export-pdf-preview figure[data-rehype-pretty-code-figure],
  #export-pdf-preview .mermaid,
  #export-pdf-preview .katex-display {
    break-inside: avoid;              /* no mid-block page splits */
  }
  #export-pdf-preview h1, #export-pdf-preview h2,
  #export-pdf-preview h3, #export-pdf-preview h4 {
    break-after: avoid;               /* no orphaned headings */
  }
}
```

- **Named page** — `page: export-pdf` + `@page export-pdf` makes the output
  paginate on a stable A4 sheet with fixed margins, regardless of the browser's
  default paper.
- **`print-color-adjust: exact`** — Chrome's default is `economy`: with the
  "background graphics" option off, it strips background fills and remaps light
  text, which makes a themed document collapse into a "plain default" look.
  `exact` forces code-block fills, inline-code chips and theme backgrounds into
  the PDF. (Verified by A/B: without it, the mk-cute code-block fill and theme
  colors disappear from a `printBackground: false` PDF; with it they survive.)

Consumers can override the sheet or margins by emitting their own `@page` rule
after the package stylesheet.

## Why the id lives on both previews

`MarkdownRenderer` accepts an `id` prop. Both the editor's on-screen preview
and the export overlay render with `id="export-pdf-preview"`, so you can grab
the node on the normal page *and* during export. During the brief export window
two same-id nodes exist (main preview + overlay); the print CSS hides the main
preview (`body > *:not(.pdf-print-overlay)`), so it is harmless.

## Direct printing without the overlay

For consumers that print the editor page without the export button, the scoped
`editor.css` print fallback neutralizes the flex height chain (bounded boxes
with `overflow: hidden` otherwise clip the document to the grid height — the
"only prints N pages" bug). The overlay path is the recommended one.
