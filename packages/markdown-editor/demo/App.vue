<script setup lang="ts">
import { ref } from 'vue';
import { Icon } from '@iconify/vue';
import {
  MarkdownEditor,
  PREVIEW_THEMES,
  EDITOR_THEMES,
  type EditorSavePayload,
} from '../src/index';

const content = ref(SAMPLE_MARKDOWN);
const editorTheme = ref<'light' | 'dark'>('light');
const previewTheme = ref('github');
const codeTheme = ref<string | undefined>(undefined);
const locale = ref<'zh-CN' | 'en'>('zh-CN');
const wrapCode = ref(false);
const wrapTables = ref(false);
const lastSave = ref('');

function uploadImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function onSave(payload: EditorSavePayload) {
  const filename = `${payload.title.trim() || 'untitled'}.md`.replace(/[/\\:*?"<>|]/g, '-');
  const blob = new Blob([content.value], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  lastSave.value = `saved ${filename}`;
}
</script>

<template>
  <header class="demo-header">
    <h1>
      <Icon icon="mdi:markdown" style="vertical-align: -2px" /> Markdown Editor · Demo
      <span style="color: #9ca3af; font-weight: 400">(packages/markdown-editor, standalone)</span>
    </h1>

    <label>
      Editor theme
      <select v-model="editorTheme">
        <option v-for="t in EDITOR_THEMES" :key="t" :value="t">{{ t }}</option>
      </select>
    </label>

    <label>
      Preview theme
      <select v-model="previewTheme">
        <option v-for="t in PREVIEW_THEMES" :key="t.id" :value="t.id">
          {{ t.label }}
        </option>
      </select>
    </label>

    <label>
      Locale
      <select v-model="locale">
        <option value="zh-CN">zh-CN</option>
        <option value="en">en</option>
      </select>
    </label>

    <label>
      <input type="checkbox" v-model="wrapCode" /> Wrap code
    </label>

    <label>
      <input type="checkbox" v-model="wrapTables" /> Wrap tables
    </label>

    <span class="save-log">last save: {{ lastSave || '—' }}</span>
  </header>

  <main class="demo-main">
    <section class="demo-editor">
      <MarkdownEditor
        v-model="content"
        :is-edit="true"
        :editor-theme="editorTheme"
        :preview-theme="previewTheme"
        :code-theme="codeTheme"
        :locale="locale"
        :upload-image="uploadImage"
        save-mode="dialog"
        draft-storage-key="demo:editor:draft"
        :initial-meta="{ title: 'Demo Post' }"
        :overflow-options="{ wrapCode, wrapTables }"
        @save="onSave"
      />
    </section>
  </main>
</template>

<script lang="ts">
export const SAMPLE_MARKDOWN = `# Markdown Editor Demo

A standalone preview for the **@rx-ted/packages-markdown-editor** package, decoupled from the web-blog app.

## 中文标题 / Mixed heading

支持中文内容，emoji :tada: :rocket: :heart:，~~删除线~~，==高亮==，_斜体_，与 <u>下划线</u>。

> A blockquote with **bold** and a [link](https://example.com).

## Code groups

:::code-group

\`\`\`ts title="highlight.ts"
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

const enabled = true; // [!code ++]
const disabled = false; // [!code --]
\`\`\`

\`\`\`bash title="install"
pnpm add @rx-ted/packages-markdown-editor
\`\`\`

:::

\`\`\`js {2-3}
console.log('line 1');
console.log('highlighted line 2');
console.log('highlighted line 3');
\`\`\`

## Mermaid

\`\`\`mermaid
flowchart LR
  A[Edit] --> B[Parse] --> C[Render]
  C --> D[Preview]
\`\`\`

## Math

Inline $E = mc^2$ and a block:

$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$

## Tables & tasks

| Name | Role |
| --- | --- |
| Alice | Editor |
| Bob | Reviewer |

- [x] Write the demo
- [ ] Ship it
- [ ] Profit

---

<details>
<summary>Expandable details</summary>

Hidden content inside a collapsible block.

</details>

![placeholder](https://picsum.photos/seed/me/320/180 "demo image")

### Footnotes? No — a small heading for the TOC

The table of contents on the left tracks each heading as you scroll.
`;
</script>
