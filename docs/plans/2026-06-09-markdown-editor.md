# Markdown Editor Package + PostDetailPage Refactor Implementation Plan

> **Status: NOT IMPLEMENTED** — `@rx-ted/markdown-core` 和 `@rx-ted/markdown-ui` 独立包从未被创建。博客使用 `md-editor-v3` 替代。PostDetailPage 已使用其他方式重构。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a standalone Vue 3 markdown editor npm package (`@rx-ted/markdown-core` + `@rx-ted/markdown-ui`) and refactor the blog PostDetailPage for better reading experience.

**Architecture:** Two-package design: `markdown-core` (framework-agnostic markdown-it wrapper with 14 plugins) and `markdown-ui` (Vue 3 components — MarkdownPreview + MarkdownEditor with CodeMirror 6). PostDetailPage removes card wrapper, adopts content-first layout, uses MarkdownPreview component.

**Tech Stack:** Vue 3, TypeScript, markdown-it ^14, CodeMirror 6, KaTeX, highlight.js, DOMPurify, tsup, Vitest

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `packages/markdown-core/package.json` | Package config, deps: markdown-it + plugins, highlight.js, dompurify |
| `packages/markdown-core/tsconfig.json` | TypeScript config (extends root patterns) |
| `packages/markdown-core/tsup.config.ts` | Build config for ESM + CJS output |
| `packages/markdown-core/src/index.ts` | Main exports: `createMarkdownIt()`, `render()`, types |
| `packages/markdown-core/src/plugins/mermaid.ts` | Custom mermaid fence renderer |
| `packages/markdown-core/src/plugins/containers.ts` | Container presets (tip/warning/danger/info) |
| `packages/markdown-core/src/types.ts` | MarkdownItOptions, RenderOptions interfaces |
| `packages/markdown-core/src/index.spec.ts` | Tests for render output (basic, XSS, plugins) |
| `packages/markdown-ui/package.json` | Package config, deps: vue, codemirror, markdown-core |
| `packages/markdown-ui/tsconfig.json` | TypeScript config |
| `packages/markdown-ui/tsup.config.ts` | Build config |
| `packages/markdown-ui/src/index.ts` | Main exports: MarkdownPreview, MarkdownEditor, useMarkdownIt |
| `packages/markdown-ui/src/MarkdownPreview.vue` | Read-only preview component |
| `packages/markdown-ui/src/MarkdownEditor.vue` | Full editor with CodeMirror 6 + toolbar |
| `packages/markdown-ui/src/composables/useMarkdownIt.ts` | Shared factory composable |
| `packages/markdown-ui/src/composables/useMarkdownIt.spec.ts` | Tests for composable |

### Modified files

| Path | Change |
|---|---|
| `pnpm-workspace.yaml` | Add `packages/markdown-core`, `packages/markdown-ui` |
| `turbo.json` | Add `inputs` for new packages in `check` task |
| `apps/web-blog/package.json` | Add `@rx-ted/markdown-core`, `@rx-ted/markdown-ui` workspace deps |
| `apps/web-blog/src/utils/markdown.ts` | Replace with re-export from `@rx-ted/markdown-core` |
| `apps/web-blog/src/utils/markdown.spec.ts` | Update imports to new package |
| `apps/web-blog/src/components/editor/preview/PreviewPanel.vue` | Use MarkdownPreview from markdown-ui |
| `apps/web-blog/src/pages/PostDetailPage.vue` | Remove card style, new content-first layout, use MarkdownPreview |
| `apps/web-blog/src/stores/postDetail.ts` | Import `render` from `@rx-ted/markdown-core` |

### Deleted files

| Path | Reason |
|---|---|
| `apps/web-blog/src/types/markdown-it-container.d.ts` | No longer needed — types come from markdown-core |

---

### Task 1: Scaffold `packages/markdown-core/`

**Files:**
- Create: `packages/markdown-core/package.json`
- Create: `packages/markdown-core/tsconfig.json`
- Create: `packages/markdown-core/tsup.config.ts`
- Create: `packages/markdown-core/src/types.ts`

- [ ] **Step 1: Create package.json**

Write `packages/markdown-core/package.json`:
```json
{
  "name": "@rx-ted/markdown-core",
  "version": "0.1.0",
  "type": "module",
  "description": "Framework-agnostic markdown-it wrapper with plugins: emoji, sub, sup, footnote, deflist, abbr, ins, mark, task-lists, katex, mermaid, containers",
  "main": "./dist/index.cjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "vitest": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "author": "rx-ted",
  "license": "MIT",
  "publishConfig": { "access": "public" },
  "dependencies": {
    "markdown-it": "^14.2.0",
    "markdown-it-emoji": "^3.0.0",
    "markdown-it-sub": "^2.0.0",
    "markdown-it-sup": "^2.0.0",
    "markdown-it-footnote": "^4.0.0",
    "markdown-it-deflist": "^3.0.0",
    "markdown-it-abbr": "^2.0.0",
    "markdown-it-ins": "^4.0.0",
    "markdown-it-mark": "^4.0.0",
    "markdown-it-task-lists": "^4.0.0",
    "markdown-it-container": "^4.0.0",
    "@iktakahiro/markdown-it-katex": "^4.0.1",
    "highlight.js": "^11.11.0",
    "dompurify": "^3.4.0"
  },
  "devDependencies": {
    "@types/markdown-it": "^14.1.2",
    "@types/dompurify": "^3.2.0",
    "tsup": "^8.5.1",
    "typescript": "^6.0.3",
    "vitest": "^4.1.7"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

Write `packages/markdown-core/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": false,
    "sourceMap": false,
    "strict": true,
    "noImplicitAny": false,
    "noImplicitReturns": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "useUnknownInCatchVariables": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "ignoreDeprecations": "6.0"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules", "**/*.test.ts", "**/*.spec.ts"]
}
```

- [ ] **Step 3: Create tsup config**

Write `packages/markdown-core/tsup.config.ts`:
```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: false,
});
```

- [ ] **Step 4: Create types file**

Write `packages/markdown-core/src/types.ts`:
```ts
export interface MarkdownItOptions {
  containers?: boolean;
  katex?: boolean;
  highlight?: boolean;
  sanitize?: boolean;
  linkify?: boolean;
  typographer?: boolean;
}

export interface RenderOptions extends MarkdownItOptions {}

export interface MarkdownCore {
  md: MarkdownIt;
  render(content: string, options?: RenderOptions): string;
}
```

- [ ] **Step 5: Create plugins/containers.ts**

Write `packages/markdown-core/src/plugins/containers.ts`:
```ts
import type MarkdownIt from 'markdown-it';
import container from 'markdown-it-container';

const presetContainers = [
  { type: 'tip', defaultTitle: 'TIP' },
  { type: 'warning', defaultTitle: 'WARNING' },
  { type: 'danger', defaultTitle: 'DANGER' },
  { type: 'info', defaultTitle: 'INFO' },
];

function renderContainer(name: string) {
  return (tokens: any[], idx: number) => {
    const token = tokens[idx];
    const info = token.info.trim().slice(name.length).trim();
    const title = info || presetContainers.find((c) => c.type === name)?.defaultTitle || name.toUpperCase();
    if (token.nesting === 1) {
      return `<div class="md-container md-container-${name}"><p class="md-container-title">${title}</p>\n`;
    }
    return '</div>\n';
  };
}

export function setupContainers(md: MarkdownIt): void {
  presetContainers.forEach(({ type }) => {
    md.use(container, type, { render: renderContainer(type) });
  });
}
```

- [ ] **Step 6: Create plugins/mermaid.ts**

Write `packages/markdown-core/src/plugins/mermaid.ts`:
```ts
import type MarkdownIt from 'markdown-it';

export function setupMermaid(md: MarkdownIt): void {
  const defaultFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const info = token.info ? token.info.trim().split(/\s+/g) : [];
    if (info[0] === 'mermaid') {
      return `<div class="mermaid">${md.utils.escapeHtml(token.content)}</div>`;
    }
    if (defaultFence) {
      return defaultFence(tokens, idx, options, env, self);
    }
    return self.renderToken(tokens, idx, options);
  };
}
```

- [ ] **Step 7: Create core index.ts**

Write `packages/markdown-core/src/index.ts`:
```ts
import MarkdownIt from 'markdown-it';
import { emoji } from 'markdown-it-emoji';
import markdownItSub from 'markdown-it-sub';
import markdownItSup from 'markdown-it-sup';
import markdownItFootnote from 'markdown-it-footnote';
import markdownItDeflist from 'markdown-it-deflist';
import markdownItAbbr from 'markdown-it-abbr';
import markdownItIns from 'markdown-it-ins';
import markdownItMark from 'markdown-it-mark';
import markdownItTaskLists from 'markdown-it-task-lists';
import katex from '@iktakahiro/markdown-it-katex';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import { setupContainers } from './plugins/containers';
import { setupMermaid } from './plugins/mermaid';
import type { MarkdownItOptions, RenderOptions, MarkdownCore } from './types';

export type { MarkdownItOptions, RenderOptions, MarkdownCore };

export function createMarkdownIt(options: MarkdownItOptions = {}): MarkdownIt {
  const {
    containers = true,
    katex: enableKatex = true,
    highlight = true,
    linkify = true,
    typographer = true,
  } = options;

  const md = new MarkdownIt({
    html: true,
    linkify,
    typographer,
    highlight: highlight
      ? (str: string, lang: string) => {
          if (lang && hljs.getLanguage(lang)) {
            try {
              const escaped = md.utils.escapeHtml(str);
              return `<pre><code class="hljs language-${lang}">${
                hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
              }</code></pre>`;
            } catch {
              // fall through
            }
          }
          return `<pre><code class="hljs">${md.utils.escapeHtml(str)}</code></pre>`;
        }
      : undefined,
  });

  md.use(emoji);
  md.use(markdownItSub);
  md.use(markdownItSup);
  md.use(markdownItFootnote);
  md.use(markdownItDeflist);
  md.use(markdownItAbbr);
  md.use(markdownItIns);
  md.use(markdownItMark);
  md.use(markdownItTaskLists, { enabled: true, label: true, labelAfter: true });

  if (enableKatex) {
    md.use(katex, { throwOnError: false, errorColor: 'var(--app-error)' });
  }

  if (containers) {
    setupContainers(md);
  }

  setupMermaid(md);

  return md;
}

const defaultMd = createMarkdownIt();

export function render(content: string, options?: RenderOptions): string {
  const md = options ? createMarkdownIt(options) : defaultMd;
  const html = md.render(content);
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['mermaid'],
    ADD_ATTR: ['data-copy-link'],
  });
}
```

- [ ] **Step 8: Write tests**

Write `packages/markdown-core/src/index.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { render } from './index';

describe('render', () => {
  it('renders basic markdown', () => {
    const html = render('# Hello');
    expect(html).toContain('<h1>Hello</h1>');
  });

  it('sanitizes XSS', () => {
    const html = render('<script>alert("xss")</script>');
    expect(html).not.toContain('<script>');
  });

  it('renders emoji shortcodes', () => {
    const html = render(':smile:');
    expect(html).toContain('😄');
  });

  it('renders subscript', () => {
    const html = render('H~2~O');
    expect(html).toContain('<sub>2</sub>');
  });

  it('renders superscript', () => {
    const html = render('29^th^');
    expect(html).toContain('<sup>th</sup>');
  });

  it('renders footnotes', () => {
    const html = render('Hello[^1]\n\n[^1]: world');
    expect(html).toContain('class="footnote-ref"');
    expect(html).toContain('class="footnote-item"');
  });

  it('renders definition lists', () => {
    const html = render('Term\n: definition');
    expect(html).toContain('<dt>Term</dt>');
    expect(html).toContain('<dd>definition</dd>');
  });

  it('renders abbreviations', () => {
    const html = render('*[HTML]: HyperText Markup Language\n\nHTML');
    expect(html).toContain('<abbr title="HyperText Markup Language">HTML</abbr>');
  });

  it('renders inserted text', () => {
    const html = render('++inserted++');
    expect(html).toContain('<ins>inserted</ins>');
  });

  it('renders marked text', () => {
    const html = render('==marked==');
    expect(html).toContain('<mark>marked</mark>');
  });

  it('renders task lists', () => {
    const html = render('- [x] done\n- [ ] todo');
    expect(html).toContain('type="checkbox" checked');
    expect(html).toContain('type="checkbox"');
  });

  it('renders mermaid as div', () => {
    const html = render('```mermaid\ngraph TD;\nA-->B;\n```');
    expect(html).toContain('<div class="mermaid">');
  });

  it('renders containers (tip/warning/danger/info)', () => {
    const html = render('::: tip\nTip content\n:::');
    expect(html).toContain('md-container-tip');
    expect(html).toContain('md-container-title');
  });
});
```

- [ ] **Step 9: Run tests**

Run: `cd packages/markdown-core && pnpm vitest run`
Expected: all 13 tests pass (might need `pnpm install` in root first)

- [ ] **Step 10: Commit**

```bash
git add packages/markdown-core/
git commit -m "feat: scaffold markdown-core package with all plugins"
```

---

### Task 2: Scaffold `packages/markdown-ui/`

**Files:**
- Create: `packages/markdown-ui/package.json`
- Create: `packages/markdown-ui/tsconfig.json`
- Create: `packages/markdown-ui/tsup.config.ts`
- Create: `packages/markdown-ui/src/index.ts`
- Create: `packages/markdown-ui/src/composables/useMarkdownIt.ts`
- Create: `packages/markdown-ui/src/MarkdownPreview.vue`
- Create: `packages/markdown-ui/src/MarkdownEditor.vue`
- Create: `packages/markdown-ui/src/composables/useMarkdownIt.spec.ts`

- [ ] **Step 1: Create package.json**

Write `packages/markdown-ui/package.json`:
```json
{
  "name": "@rx-ted/markdown-ui",
  "version": "0.1.0",
  "type": "module",
  "description": "Vue 3 markdown editor and preview components powered by @rx-ted/markdown-core",
  "main": "./dist/index.cjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "vitest": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "vue-tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "author": "rx-ted",
  "license": "MIT",
  "publishConfig": { "access": "public" },
  "dependencies": {
    "@rx-ted/markdown-core": "workspace:*",
    "vue": "^3.5.0",
    "codemirror": "^6.0.1",
    "@codemirror/lang-markdown": "^6.3.0",
    "@codemirror/language-data": "^6.5.0",
    "katex": "^0.16.0"
  },
  "devDependencies": {
    "tsup": "^8.5.1",
    "typescript": "^6.0.3",
    "vitest": "^4.1.7",
    "vue-tsc": "^2.2.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

Write `packages/markdown-ui/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": false,
    "sourceMap": false,
    "strict": true,
    "jsx": "preserve",
    "noImplicitAny": false,
    "noImplicitReturns": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "useUnknownInCatchVariables": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "ignoreDeprecations": "6.0"
  },
  "include": ["src/**/*.ts", "src/**/*.vue"],
  "exclude": ["dist", "node_modules", "**/*.test.ts", "**/*.spec.ts"]
}
```

- [ ] **Step 3: Create tsup config**

Write `packages/markdown-ui/tsup.config.ts`:
```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: false,
  external: ['vue'],
});
```

Note: `vue` is external — the host app provides Vue at runtime. Core is bundled (transitive dep).

- [ ] **Step 4: Create composable**

Write `packages/markdown-ui/src/composables/useMarkdownIt.ts`:
```ts
import { createMarkdownIt } from '@rx-ted/markdown-core';
import type { MarkdownIt, RenderOptions } from '@rx-ted/markdown-core';

let sharedMd: MarkdownIt | null = null;

export function useMarkdownIt(options?: RenderOptions) {
  function getRenderer(): MarkdownIt {
    if (options) {
      return createMarkdownIt(options);
    }
    if (!sharedMd) {
      sharedMd = createMarkdownIt();
    }
    return sharedMd;
  }

  function render(content: string): string {
    const md = getRenderer();
    return md.render(content);
  }

  return { render };
}
```

- [ ] **Step 5: Create MarkdownPreview.vue**

Write `packages/markdown-ui/src/MarkdownPreview.vue`:
```vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { render as coreRender } from '@rx-ted/markdown-core';
import type { RenderOptions } from '@rx-ted/markdown-core';

const props = withDefaults(defineProps<{
  content: string;
  options?: RenderOptions;
  theme?: 'light' | 'dark' | 'auto';
}>(), {
  theme: 'auto',
});

const container = ref<HTMLDivElement>();

const html = computed(() => coreRender(props.content, props.options));

function postRender() {
  if (!container.value) return;
  // Load and render KaTeX if katex class elements exist
  const mathElements = container.value.querySelectorAll('.katex');
  if (mathElements.length > 0) {
    import('katex/dist/katex.min.css');
  }
  // Render mermaid if mermaid divs exist
  const mermaidEls = container.value.querySelectorAll('.mermaid');
  if (mermaidEls.length > 0) {
    import('mermaid').then((mermaid) => {
      mermaid.default.run({ nodes: Array.from(mermaidEls) });
    });
  }
}

onMounted(postRender);
watch(html, () => {
  // nextTick ensures DOM updated before post-render
  requestAnimationFrame(postRender);
});
</script>

<template>
  <div ref="container" class="md-preview" v-html="html" />
</template>

<style>
.md-preview {
  line-height: 1.85;
  word-wrap: break-word;
}
</style>
```

- [ ] **Step 6: Create MarkdownEditor.vue**

Write `packages/markdown-ui/src/MarkdownEditor.vue`:
```vue
<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from 'vue';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { render as coreRender } from '@rx-ted/markdown-core';
import MarkdownPreview from './MarkdownPreview.vue';
import type { RenderOptions } from '@rx-ted/markdown-core';

const props = withDefaults(defineProps<{
  modelValue: string;
  mode?: 'split' | 'tab';
  theme?: 'light' | 'dark' | 'auto';
  toolbar?: string[];
  height?: string;
  options?: RenderOptions;
}>(), {
  mode: 'split',
  theme: 'auto',
  height: '480px',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const editorRef = ref<HTMLDivElement>();
const activeTab = ref<'edit' | 'preview'>('edit');
const view = shallowRef<EditorView>();

function createEditor() {
  if (!editorRef.value) return;
  const startState = EditorState.create({
    doc: props.modelValue,
    extensions: [
      basicSetup,
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          emit('update:modelValue', update.state.doc.toString());
        }
      }),
    ],
  });
  view.value = new EditorView({
    state: startState,
    parent: editorRef.value,
  });
}

watch(() => props.modelValue, (val) => {
  if (view.value && val !== view.value.state.doc.toString()) {
    view.value.dispatch({
      changes: { from: 0, to: view.value.state.doc.length, insert: val },
    });
  }
});

onMounted(() => {
  createEditor();
});

onUnmounted(() => {
  view.value?.destroy();
});
</script>

<template>
  <div class="md-editor" :style="{ height }">
    <div class="md-editor-toolbar" v-if="toolbar !== false">
      <slot name="toolbar" />
    </div>
    <div class="md-editor-body" :class="`md-editor-body--${mode}`">
      <div v-show="mode === 'tab' && activeTab === 'edit' || mode === 'split'" class="md-editor-pane md-editor-pane--edit">
        <div ref="editorRef" class="md-editor-cm" />
      </div>
      <div v-show="mode === 'tab' && activeTab === 'preview' || mode === 'split'" class="md-editor-pane md-editor-pane--preview">
        <MarkdownPreview :content="modelValue" :options="options" />
      </div>
    </div>
    <div class="md-editor-statusbar">
      <span>{{ modelValue.length }} chars</span>
      <span v-if="mode === 'tab'" class="md-editor-tabs">
        <button @click="activeTab = 'edit'" :class="{ active: activeTab === 'edit' }">Edit</button>
        <button @click="activeTab = 'preview'" :class="{ active: activeTab === 'preview' }">Preview</button>
      </span>
    </div>
  </div>
</template>

<style>
.md-editor { display: flex; flex-direction: column; border: 1px solid var(--app-border, #e0e0e0); border-radius: 8px; overflow: hidden; }
.md-editor-toolbar { display: flex; flex-wrap: wrap; gap: 2px; padding: 6px 8px; border-bottom: 1px solid var(--app-border, #e0e0e0); background: var(--app-bg-muted, #f5f5f5); }
.md-editor-body { flex: 1; display: flex; overflow: hidden; }
.md-editor-body--tab { flex-direction: column; }
.md-editor-pane { overflow: auto; }
.md-editor-pane--edit { flex: 1; border-right: 1px solid var(--app-border, #e0e0e0); }
.md-editor-pane--preview { flex: 1; padding: 16px 20px; }
.md-editor-body--tab .md-editor-pane { border-right: none; }
.md-editor-cm { height: 100%; }
.md-editor-cm .cm-editor { height: 100%; }
.md-editor-statusbar { display: flex; justify-content: space-between; padding: 4px 12px; border-top: 1px solid var(--app-border, #e0e0e0); font-size: 12px; color: var(--app-text-tertiary, #999); background: var(--app-bg-muted, #f5f5f5); }
.md-editor-tabs button { padding: 2px 10px; border: 1px solid transparent; border-radius: 4px; background: transparent; cursor: pointer; font-size: 12px; }
.md-editor-tabs button.active { background: var(--app-primary, #667eea); color: #fff; border-color: var(--app-primary, #667eea); }
</style>
```

- [ ] **Step 7: Create UI package index.ts**

Write `packages/markdown-ui/src/index.ts`:
```ts
export { default as MarkdownPreview } from './MarkdownPreview.vue';
export { default as MarkdownEditor } from './MarkdownEditor.vue';
export { useMarkdownIt } from './composables/useMarkdownIt';
```

- [ ] **Step 8: Write composable test**

Write `packages/markdown-ui/src/composables/useMarkdownIt.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { useMarkdownIt } from './useMarkdownIt';

describe('useMarkdownIt', () => {
  it('returns a render function', () => {
    const { render } = useMarkdownIt();
    const html = render('# Hello');
    expect(html).toContain('<h1>Hello</h1>');
  });

  it('respects options', () => {
    const { render } = useMarkdownIt({ linkify: false });
    const html = render('https://example.com');
    expect(html).not.toContain('<a href');
  });
});
```

- [ ] **Step 9: Test UI package**

Run: `cd packages/markdown-ui && pnpm vitest run`
Expected: tests pass

- [ ] **Step 10: Commit**

```bash
git add packages/markdown-ui/
git commit -m "feat: scaffold markdown-ui package with MarkdownPreview and MarkdownEditor"
```

---

### Task 3: Update monorepo workspace config

**Files:**
- Modify: `pnpm-workspace.yaml`
- Modify: `turbo.json`

- [ ] **Step 1: Update pnpm-workspace.yaml**

Edit `pnpm-workspace.yaml` — add new packages after the existing packages:
```yaml
  - "packages/markdown-core"
  - "packages/markdown-ui"
```

- [ ] **Step 2: Update turbo.json** — add packages to check task inputs

Edit `turbo.json` — add `packages/markdown-core/**` and `packages/markdown-ui/**` to the `check` task inputs array.

- [ ] **Step 3: Install dependencies**

Run: `pnpm install`
Expected: workspace symlinks created, no errors

- [ ] **Step 4: Verify builds**

Run: `pnpm --filter @rx-ted/markdown-core build && pnpm --filter @rx-ted/markdown-ui build`
Expected: both packages produce `dist/` with ESM + CJS + d.ts

- [ ] **Step 5: Commit**

```bash
git add pnpm-workspace.yaml turbo.json pnpm-lock.yaml
git commit -m "chore: add markdown-core and markdown-ui to workspace"
```

---

### Task 4: Replace existing markdown utility with core package

**Files:**
- Modify: `apps/web-blog/package.json`
- Modify: `apps/web-blog/src/utils/markdown.ts`
- Modify: `apps/web-blog/src/utils/markdown.spec.ts`
- Modify: `apps/web-blog/src/stores/postDetail.ts`
- Modify: `apps/web-blog/src/components/editor/preview/PreviewPanel.vue`
- Delete: `apps/web-blog/src/types/markdown-it-container.d.ts`

- [ ] **Step 1: Add workspace dependency**

Edit `apps/web-blog/package.json` — add to `dependencies`:
```json
"@rx-ted/markdown-core": "workspace:*"
```

- [ ] **Step 2: Replace markdown.ts**

Rewrite `apps/web-blog/src/utils/markdown.ts` to re-export from core:
```ts
export { createMarkdownIt, render as renderMarkdown } from '@rx-ted/markdown-core';
export type { MarkdownItOptions, RenderOptions } from '@rx-ted/markdown-core';
```

- [ ] **Step 3: Update markdown.spec.ts**

Edit `apps/web-blog/src/utils/markdown.spec.ts` — the existing tests should still pass since `render` function signature is the same. Just verify by running tests.

- [ ] **Step 4: Delete markdown-it-container.d.ts**

Delete `apps/web-blog/src/types/markdown-it-container.d.ts` — types now come from markdown-core.

- [ ] **Step 5: Update postDetail.ts**

Edit `apps/web-blog/src/stores/postDetail.ts` — the import `import { renderMarkdown } from '@/utils/markdown'` still works (re-export). No code change needed. Verify the import resolves.

- [ ] **Step 6: Update PreviewPanel.vue**

Edit `apps/web-blog/src/components/editor/preview/PreviewPanel.vue` — optionally replace to use the new `MarkdownPreview` component from markdown-ui. For now, just verify the `renderMarkdown` import still works (it re-exports from core).

- [ ] **Step 7: Run web-blog tests**

Run: `cd apps/web-blog && pnpm vitest run`
Expected: all existing tests pass

- [ ] **Step 8: Run typecheck**

Run: `pnpm --filter @rx-ted/markdown-core typecheck && pnpm --filter @rx-ted/markdown-ui typecheck && pnpm --filter web-blog typecheck`
Expected: no type errors

- [ ] **Step 9: Commit**

```bash
git add apps/web-blog/src/utils/markdown.ts apps/web-blog/src/utils/markdown.spec.ts apps/web-blog/src/types/ apps/web-blog/package.json
git commit -m "refactor: replace local markdown utils with @rx-ted/markdown-core"
```

---

### Task 5: Refactor PostDetailPage layout

**Files:**
- Modify: `apps/web-blog/src/pages/PostDetailPage.vue`

- [ ] **Step 1: Restructure template**

Replace the PostDetailPage template with the new content-first layout:

```vue
<template>
  <SeoHead v-if="item" :title="`${item.title} - rx-ted's Blog`" :description="item.title" :keywords="item.tags"
    type="article" :author="item.author" :published-time="item.createdAt" :modified-time="item.updatedAt"
    :url="`/post/${slug}`" />
  <article class="post-detail">
    <n-spin :show="loading">
      <n-alert v-if="error" type="error" :show-icon="false" class="alert">
        {{ error }}
        <br><br>
        <n-button @click="router.push('/posts')">返回文章列表</n-button>
      </n-alert>

      <template v-else-if="item">

        <!-- Cover image -->
        <div v-if="item.cover" class="post-cover">
          <img :src="item.cover" :alt="item.title" />
        </div>

        <!-- Title -->
        <h1 class="post-title">{{ item.title }}</h1>

        <!-- Author row + tags -->
        <div class="post-meta">
          <div class="post-meta-left">
            <button type="button" class="meta-author" @click="goToAuthor">
              <span class="author-avatar">{{ item.author.charAt(0).toUpperCase() }}</span>
              <div class="author-info">
                <span class="author-name">{{ item.author }}</span>
                <span class="meta-date">{{ formatDate(item.updatedAt) }} · {{ item.readingTime }} min read</span>
              </div>
            </button>
          </div>
          <div class="post-meta-right">
            <span v-for="tag in item.tags" :key="tag" class="tag-chip">{{ tag }}</span>
          </div>
        </div>

        <!-- Content -->
        <div class="post-content">
          <MarkdownPreview v-if="item.contentHtml" :content="item.content" />
          <pre v-else class="content-plain">{{ item.content }}</pre>
        </div>

        <!-- Footer tags -->
        <div v-if="item.tags?.length" class="post-footer-tags">
          <span v-for="tag in item.tags" :key="tag" class="tag-chip-outline">{{ tag }}</span>
        </div>
      </template>
    </n-spin>
  </article>
</template>
```

- [ ] **Step 2: Remove card styles, update layout CSS**

Replace the `<style scoped>` block with the new design:

```scss
.post-detail {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 24px;
}

.alert {
  margin-bottom: 16px;
}

.post-cover {
  margin-bottom: 40px;
  border-radius: 16px;
  overflow: hidden;
}

.post-cover img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 16px;
}

.post-title {
  font-size: 36px;
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 24px;
  letter-spacing: -0.03em;
}

.post-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 28px;
  margin-bottom: 40px;
  border-bottom: 1px solid var(--app-border);
}

.post-meta-left {
  flex-shrink: 0;
}

.meta-author {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: var(--app-text);
}

.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 12%, transparent);
  flex-shrink: 0;
}

.author-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.author-name {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.3;
}

.meta-date {
  font-size: 13px;
  color: var(--app-text-quaternary);
  line-height: 1.3;
}

.post-meta-right {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.tag-chip {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--app-bg-muted);
  color: var(--app-text-tertiary);
  white-space: nowrap;
}

.tag-chip-outline {
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--app-border);
  color: var(--app-text-secondary);
  white-space: nowrap;
}

.post-content {
  font-size: 17px;
  line-height: 1.85;
  color: var(--app-text);
}

.post-footer-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 32px;
  margin-top: 48px;
  border-top: 1px solid var(--app-border);
}

.content-plain {
  white-space: pre-wrap;
  line-height: 1.7;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  padding: 20px;
  border-radius: 12px;
  background: var(--app-bg-muted);
  border: 1px solid var(--app-border);
}

@media (max-width: 768px) {
  .post-detail {
    padding: 0 16px;
  }

  .post-title {
    font-size: 28px;
  }

  .post-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .post-meta-right {
    justify-content: flex-start;
  }

  .post-content {
    font-size: 16px;
  }
}
```

- [ ] **Step 3: Update script section — add MarkdownPreview import**

Add import at top of `<script setup>`:
```ts
import { MarkdownPreview } from '@rx-ted/markdown-ui';
```

- [ ] **Step 4: Run typecheck + tests**

Run: `cd apps/web-blog && pnpm typecheck && pnpm vitest run`
Expected: no errors, all tests pass

- [ ] **Step 5: Manually verify dev server**

Run: `cd apps/web-blog && pnpm dev`
Open browser to a post detail page — verify layout renders correctly, no visual regressions.

- [ ] **Step 6: Commit**

```bash
git add apps/web-blog/src/pages/PostDetailPage.vue
git commit -m "refactor: redesign PostDetailPage content-first layout"
```

---

## Spec Coverage Checklist

| Spec Requirement | Task |
|---|---|
| markdown-core package with all plugins | Task 1 |
| mermaid custom fence renderer | Task 1 Step 6 |
| container presets (tip/warning/danger/info) | Task 1 Step 5 |
| markdown-ui MarkdownPreview component | Task 2 Step 5 |
| markdown-ui MarkdownEditor with CodeMirror 6 | Task 2 Step 6 |
| Split and Tab preview modes | Task 2 Step 6 (mode prop) |
| Monorepo workspace integration | Task 3 |
| Replace existing markdown utility | Task 4 |
| PostDetailPage refactor (no card, content-first) | Task 5 |
| Cover image, tags, author row redesign | Task 5 Step 1 |
