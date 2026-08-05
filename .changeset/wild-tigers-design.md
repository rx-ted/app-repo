---
'@rx-ted/packages-markdown-editor': minor
---

Preview themes are now compiled per theme: each `src/themes/*.scss` builds to its own CSS asset (`dist/themes/<id>.css`), and the renderer/editor inject only the active theme's stylesheet at runtime via a scoped `<link>` (new `./themes/*` subpath export for bundler consumers). Themes are scoped under `[data-me-preview-theme]` / `[data-me-mode]`.

Adds `cyanosis` and `smart-blue` to the theme set (now six) and makes mk-cute a faithful port of its MIT original. `PreviewThemeConfig` grows `darkable` (light-only themes repeat their light palette in dark mode) and `source` (attribution for the three ported juejin themes: cyanosis, smart-blue, mk-cute), surfaced in the theme picker. `ThemeSource` is exported; `applyPreviewTheme` is kept for backward compatibility.

Code blocks now keep the shiki background (`keepBackground: true`) so the code theme owns the block background instead of inheriting the theme's `--me-bg-code`, and `pre > code` in the ported themes no longer forces its own `color`/`background` — inline code keeps the theme styling via `code:not(pre > code)`.

PDF export anchors on a stable `export-pdf-preview` node (`MarkdownRenderer` accepts an `id` prop): both the editor preview and the export overlay carry `id="export-pdf-preview"`, and page attributes are attached there — a named `@page export-pdf` (A4, 16×14mm margins), `break-inside`/`break-after` rules for blocks and headings, and `print-color-adjust: exact` so the chosen preview theme (backgrounds, code-block fills, inline-code chips) survives the print output even with the browser's "background graphics" option off. `exportPdf()` verifies the node exists before printing.

Docs: made `docs/architecture/` + `docs/guides/` bilingual (`name.md` English, `name.zh.md` Chinese), added blog front-matter + language switchers to every doc, cleaned up stale guides (split `markdown-editor.md` into `markdown-syntax`, removed the unimplemented version-management guide into `docs/implementations/version-management-design.md`, trimmed the Version/Metrics sections from `api-routes.md` that referenced non-existent modules).
