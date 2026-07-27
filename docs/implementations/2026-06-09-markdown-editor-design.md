# Design Spec: Standalone Markdown Editor Package + PostDetailPage Refactor

> **Status: NOT IMPLEMENTED** — `@rx-ted/markdown-core` 和 `@rx-ted/markdown-ui` 独立包从未被创建。

## Overview

Two related projects:
1. **`@rx-ted/markdown-core` + `@rx-ted/markdown-ui`** — a standalone Vue 3 + TypeScript npm package providing a full-featured markdown editor (CodeMirror 6 + toolbar + live preview) and renderer (read-only preview component).
2. **PostDetailPage refactor** — redesign the existing blog article detail page for cleaner reading experience, leveraging the UI package's `MarkdownPreview` component.

## Package Architecture

### markdown-core (framework-agnostic)

Pure markdown-it wrapper with all plugins pre-configured. Zero Vue dependency.

**Dependencies:**
- `markdown-it` ^14.2.0
- `markdown-it-emoji`
- `markdown-it-sub`
- `markdown-it-sup`
- `markdown-it-footnote`
- `markdown-it-deflist`
- `markdown-it-abbr`
- `markdown-it-ins`
- `markdown-it-mark`
- `markdown-it-task-lists`
- `markdown-it-container` (tip, warning, danger, info)
- `@iktakahiro/markdown-it-katex` (KaTeX rendering)
- `highlight.js` (code syntax highlighting)
- `dompurify` (HTML sanitization)

**Exports:**
```ts
// Factory function — creates and returns configured markdown-it instance
createMarkdownIt(options?: MarkdownItOptions): MarkdownIt

// One-shot render — accepts raw markdown, returns sanitized HTML
render(content: string, options?: RenderOptions): string

// Plugin configuration types
MarkdownItOptions: {
  containers?: boolean | ContainerConfig[]
  katex?: boolean | KatexConfig
  highlight?: boolean | HighlightConfig
  sanitize?: boolean
  linkify?: boolean
  typographer?: boolean
}
```

**Custom plugins (included in core):**
- `mermaid` — custom fence renderer that detects ```` ```mermaid ```` and outputs `<div class="mermaid">` for client-side hydration
- Container presets: `tip`, `warning`, `danger`, `info` (matching existing web-blog containers)

### markdown-ui (Vue 3 components)

Vue 3 components that depend on `markdown-core`. Uses Composition API + TypeScript.

**Components:**

```vue
<!-- Read-only renderer -->
<MarkdownPreview
  :content="string"
  :options="MarkdownItOptions?"
  :theme="'light' | 'dark' | 'auto'?"
/>

<!-- Full editor with toolbar -->
<MarkdownEditor
  v-model="string"
  :mode="'split' | 'tab'?"
  :theme="'light' | 'dark' | 'auto'?"
  :toolbar="string[]?"
  :height="string?"
  :sanitize="boolean?"
/>
```

**Editor implementation:**
- `CodeMirror 6` with `@codemirror/lang-markdown` for the editing pane
- Toolbar with buttons: H1-H6, B, I, S, `|`, blockquote, ul, ol, task-list, `|`, link, image, table, `|`, katex, emoji-picker, `|`, undo, redo, `|`, mode-toggle (split/tab), theme-toggle
- Preview mode: controlled by `mode` prop: `'split'` (left-right) or `'tab'` (switchable tabs)
- Status bar: word count, line/col, UTF-8
- Post-render hydration: on each preview update, run `mermaid.run()` and `renderMathInElement()` (KaTeX auto-render)
- Sync scroll: optional scroll-sync between editor and preview panes

**Styling approach:**
- CSS custom properties (`--md-editor-*`) for theming
- Light/dark themes via CSS variables
- No external CSS framework dependency

## Monorepo Integration

```yaml
# pnpm-workspace.yaml — add:
packages:
  - "packages/markdown-core"
  - "packages/markdown-ui"
```

Both packages go under `/packages/` (not `apps/`) since they're libraries consumed by other apps.

The web-blog app (`apps/web-blog`) will depend on both:
```json
{
  "dependencies": {
    "@rx-ted/markdown-core": "workspace:*",
    "@rx-ted/markdown-ui": "workspace:*"
  }
}
```

## PostDetailPage Refactor

### Current Problems
1. Title + meta row outside the content card — visual disconnection
2. Content area has card background (`--app-bg-container`), border, shadow — heavy feel
3. No cover image support
4. No tag display
5. No footer navigation (prev/next)
6. Meta row is text-only, no author avatar

### New Design

**Layout:** Minimal, content-first. Remove the card wrapper. Content floats directly on the page background.

**Structure (top to bottom):**
1. Breadcrumb (provided by layout content injection — already exists)
2. Optional cover image (if `item.cover` exists)
3. Title (`font-size: 36px`, `font-weight: 800`)
4. Author row (avatar + name + date + reading time) + tag chips
5. Content HTML (no card background, `font-size: 17px`, `line-height: 1.85`)
6. Tag chips (outlined pills, `border-radius: 999px`)
7. Prev/Next navigation (provided by layout — already exists)

**Key CSS changes:**
- Remove `.post-content` card background/border/shadow
- Increase base font-size from `16px` → `17px`
- Max-width from `800px` → `720px` (better line length for larger font)
- Author row redesign: avatar + name + date on left, tags on right
- Tags: outlined chips with border, not filled
- Cover image: full-width rounded, gradient fallback when no image
- Responsive: 640px reduce title to 28px, reduce padding

**PostDetailPage usage of markdown-ui:**
```vue
<MarkdownPreview
  v-if="item.contentHtml"
  :content="item.content"
  :options="{ highlight: true, containers: true }"
/>
```

## Migration Path

1. Create `packages/markdown-core` — port existing `src/utils/markdown.ts` logic, add new plugins
2. Create `packages/markdown-ui` — build MarkdownPreview, MarkdownEditor components
3. Update `pnpm-workspace.yaml` + root `turbo.json` to include new packages
4. Refactor PostDetailPage: remove card style, new layout, use MarkdownPreview
5. Replace `src/utils/markdown.ts` in web-blog with `@rx-ted/markdown-core`
6. Update blog editor (`BlogEditor.vue`) to optionally use `@rx-ted/markdown-ui` editor

## Future Considerations

- Mermaid: rendered client-side via `mermaid.run()`, requires loading mermaid library
- KaTeX: `katex.css` auto-injected on first use, math rendered via `renderMathInElement`
- Emoji picker: lightweight picker component in toolbar (not part of initial build)
- i18n: toolbar tooltips and status bar labels should support i18n strings prop
