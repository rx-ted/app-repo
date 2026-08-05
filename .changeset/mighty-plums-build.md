---
'@rx-ted/packages-markdown-editor': minor
---

Rename `BlogEditor` to `MarkdownEditor` (breaking; no alias), split it into modular composables, add a Vite dist build (ESM, types and CSS exports) and a standalone demo. The save dialog is reduced to a title-only form (metadata carried through `initial-meta`) and the demo saves locally by downloading a `.md` file. A toolbar button exports the page as PDF via `window.print()`; the print styles neutralize the editor's flex height chain so long documents paginate fully.

Preview themes are cut from 20 to a curated four — `github`, `vscode`, `mk-cute`, `vuepress` (breaking: the old `github-light`/`github-dark` ids are gone). Each theme owns its typography, content box and a light/dark palette; the editor theme (light/dark) now flips the active theme's background instead of picking a different preview theme, and the code theme stays an independent shiki picker. The floating TOC panel gains a minimize button in its header.
