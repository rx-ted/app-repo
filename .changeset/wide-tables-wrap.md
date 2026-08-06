---
'@rx-ted/packages-markdown-editor': minor
---

Add an `overflowOptions` prop (`{ wrapCode?, wrapTables? }`) to `MarkdownEditor` and `MarkdownRenderer` so consumers can opt into wrapping over-wide content: `wrapCode` wraps long code lines instead of scrolling horizontally, and `wrapTables` constrains tables to the container width (fixed layout + wrapped cells). `MarkdownEditor` forwards the object to every internal renderer (preview pane, theme modal, PDF overlay). PDF export always wraps code and tables regardless of the prop, because a static fixed-width sheet would otherwise clip the overflow.
