---
'@rx-ted/packages-markdown-editor': minor
---

Rename `BlogEditor` to `MarkdownEditor` (breaking; no alias), split it into modular composables, add a Vite dist build (ESM, types and CSS exports) and a standalone demo. Theme picker modal now follows the editor's light/dark chrome, filters preview themes to match, and its sample tracks the editor theme; the editor is a single unified box with internal dividers; save dialog pre-fills the title from the first heading instead of parsing front-matter; a toolbar button exports the page as PDF via `window.print()` with print styles.
