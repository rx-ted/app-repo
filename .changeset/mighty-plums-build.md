---
'@rx-ted/packages-markdown-editor': minor
---

Rename `BlogEditor` to `MarkdownEditor` (breaking; no alias), split it into modular composables, add a Vite dist build (ESM, types and CSS exports) and a standalone demo. Theme picker modal now follows the editor's light/dark chrome, filters preview themes to match, and its sample tracks the editor theme; the editor is a single unified box with internal dividers; the save dialog is reduced to a title-only form (metadata carried through `initial-meta`) and the demo saves locally by downloading a `.md` file; a toolbar button exports the page as PDF via `window.print()` with print styles.
