<script setup lang="ts">
import { ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import {
  MarkdownEditor,
  PREVIEW_THEMES,
  EDITOR_THEMES,
  CODE_THEMES,
  type EditorSavePayload,
} from '../src/index';

const SETTINGS_KEY = 'demo:editor:settings';

interface DemoSettings {
  locale: 'zh-CN' | 'en';
  editorTheme: 'light' | 'dark';
  previewTheme: string;
  codeTheme?: string;
  wrapCode: boolean;
  wrapTables: boolean;
}

const DEFAULT_SETTINGS: DemoSettings = {
  locale: 'zh-CN',
  editorTheme: 'light',
  previewTheme: 'github',
  codeTheme: undefined,
  wrapCode: false,
  wrapTables: false,
};

function loadSettings(): DemoSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(patch: Partial<DemoSettings>) {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      locale: locale.value,
      editorTheme: editorTheme.value,
      previewTheme: previewTheme.value,
      codeTheme: codeTheme.value,
      wrapCode: wrapCode.value,
      wrapTables: wrapTables.value,
      ...patch,
    }),
  );
}

const saved = loadSettings();
const locale = ref<'zh-CN' | 'en'>(saved.locale);
const content = ref(locale.value === 'zh-CN' ? SAMPLE_ZH : SAMPLE_EN);
const editorTheme = ref<'light' | 'dark'>(saved.editorTheme);
const previewTheme = ref(saved.previewTheme);
const codeTheme = ref<string | undefined>(saved.codeTheme);
const wrapCode = ref(saved.wrapCode);
const wrapTables = ref(saved.wrapTables);
const lastSave = ref('');

watch(locale, (value) => {
  saveSettings({ locale: value });
  content.value = value === 'zh-CN' ? SAMPLE_ZH : SAMPLE_EN;
});
watch(editorTheme, (value) => saveSettings({ editorTheme: value }));
watch(previewTheme, (value) => saveSettings({ previewTheme: value }));
watch(codeTheme, (value) => saveSettings({ codeTheme: value }));
watch(wrapCode, (value) => saveSettings({ wrapCode: value }));
watch(wrapTables, (value) => saveSettings({ wrapTables: value }));

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
      <Icon icon="mdi:markdown" style="vertical-align: -2px" /> Markdown Editor
      <span style="color: #9ca3af; font-weight: 400">(<a href="https://www.npmjs.com/package/@rx-ted/packages-markdown-editor" target="_blank">@rx-ted/packages-markdown-editor</a>, standalone)</span>
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
      Code theme
      <select v-model="codeTheme">
        <option :value="undefined">auto (follow preview theme)</option>
        <option v-for="t in CODE_THEMES" :key="t" :value="t">{{ t }}</option>
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
        @update:locale="locale = $event"
      />
    </section>
  </main>
</template>

<script lang="ts">
export const SAMPLE_EN = `# Markdown Editor Demo

A standalone preview for the **@rx-ted/packages-markdown-editor** package, rendering the syntax reference from \`docs/guides/markdown-syntax.md\`.

## 1. Headings

# Heading 1

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6

## 2. Text Styles

**bold**, *italic*, ***bold italic***, ~~strikethrough~~, \`inline code\`, <u>underline</u>, <sup>superscript</sup> (E = mc<sup>2</sup>), and <sub>subscript</sub> (H<sub>2</sub>O).

## 3. Lists

### Unordered

- Apple
- Banana
  - Cherry (indented sub-item)

### Ordered

1. First step
2. Second step
3. Third step

### Task List

- [x] Completed task
- [ ] Incomplete task

## 4. Blockquotes

> A blockquote with **formatting** and \`code\`.
>
> > Nested blockquote.

## 5. Links and Images

[Regular link](https://example.com)

[Link with title](https://example.com "Example Site")

Autolink: <https://example.com>

![Alt text](https://picsum.photos/seed/picsum/800/400)

## 6. Code Blocks

### Basic Highlighting

\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // 55
\`\`\`

### Line Highlighting

Syntax: \`{line numbers}\` after the fence, e.g. \`{1,3,5-6}\`.

\`\`\`javascript {1,3,5-6}
function greet(name) {
  const msg = \`Hello, \${name}\`;
  const loud = msg.toUpperCase();
  const words = loud.split(" ");
  const parts = words.slice(0, 2);
  return parts.join("!");
}

console.log(greet("world"));
\`\`\`

### Diff Highlighting

\`\`\`javascript
const count = 1; // [!code --]
const count = 2; // [!code ++]
const enabled = true;
\`\`\`

\`\`\`diff
- const count = 1;
+ const count = 2;
  const enabled = true;
\`\`\`

### Code Groups

:::code-group

\`\`\`ts [typescript]
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

\`\`\`bash [install]
pnpm add @rx-ted/packages-markdown-editor
\`\`\`

:::

### Single-Tab Code Block

\`\`\`rust [Rust example]
fn main() {
    let msg = "Hello, World!";
    println!("{}", msg);
}
\`\`\`

## 7. Tables

| Name   | Price | Stock | Notes        |
| ------ | ----- | ----- | ------------ |
| Apple  | ¥5.0  | 100   | Fresh stock  |
| Banana | ¥3.5  | 50    | On promotion |
| Cherry | ¥15.0 | 20    | Imported     |

Alignment: \`:---\` left, \`:---:\` center, \`---:\` right.

| Left | Center | Right |
| :--- | :----: | ----: |
| left | center | right |
| text |  text  |  text |

## 8. Math Formulas (KaTeX)

Inline: $E = mc^2$, and $\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$.

Block:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}
$$

Piecewise function:

$$
F(n) = \\begin{cases}
0 & n = 0 \\\\
1 & n = 1 \\\\
F(n-1) + F(n-2) & n > 1
\\end{cases}
$$

## 9. Directives

:::tip
This is a tip.
:::

:::warning
This is a warning.
:::

:::danger
This is a danger message.
:::

:::info
This is an info container.
:::

<details>
<summary>Click to expand</summary>

Markdown inside collapsible content, rendered via rehype-raw.

</details>

## 10. Raw HTML

<p style="color: var(--app-primary);">This is a paragraph rendered as HTML.</p>

## 11. Mermaid

\`\`\`mermaid
graph TD
  A[Start] --> B{Validate}
  B -->|Pass| C[Process]
  B -->|Fail| D[Error]
  C --> E[Done]
  D --> E
\`\`\`

## 12. Combined Example

Math combined with code:

\`\`\`javascript
function fib(n) {
  if (n < 2) return n;
  let a = 0,
    b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

// print the first 20 terms
console.log(Array.from({ length: 20 }, (_, i) => fib(i)));
// → [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181]
\`\`\`
`;

export const SAMPLE_ZH = `# Markdown 编辑器示例

**@rx-ted/packages-markdown-editor** 的独立预览，渲染自语法参考文档 \`docs/guides/markdown-syntax.zh.md\`。

## 1. 标题

# 一级标题

## 二级标题

### 三级标题

#### 四级标题

##### 五级标题

###### 六级标题

## 2. 文本样式

**加粗**，*斜体*，***粗斜体***，~~删除线~~，\`行内代码\`，<u>下划线</u>，<sup>上标</sup>（E = mc<sup>2</sup>）和 <sub>下标</sub>（H<sub>2</sub>O）。

## 3. 列表

### 无序列表

- 苹果
- 香蕉
  - 樱桃（缩进的子项）

### 有序列表

1. 第一步
2. 第二步
3. 第三步

### 任务列表

- [x] 已完成任务
- [ ] 未完成任务

## 4. 引用

> 包含 **格式** 和 \`代码\` 的引用。
>
> > 嵌套引用。

## 5. 链接与图片

[普通链接](https://example.com)

[带标题的链接](https://example.com "示例站点")

自动链接：<https://example.com>

![替代文本](https://picsum.photos/seed/picsum/800/400)

## 6. 代码块

### 基础高亮

\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // 55
\`\`\`

### 行号高亮

语法：围栏后写 \`{行号}\`，例如 \`{1,3,5-6}\`。

\`\`\`javascript {1,3,5-6}
function greet(name) {
  const msg = \`Hello, \${name}\`;
  const loud = msg.toUpperCase();
  const words = loud.split(" ");
  const parts = words.slice(0, 2);
  return parts.join("!");
}

console.log(greet("world"));
\`\`\`

### Diff 高亮

\`\`\`javascript
const count = 1; // [!code --]
const count = 2; // [!code ++]
const enabled = true;
\`\`\`

\`\`\`diff
- const count = 1;
+ const count = 2;
  const enabled = true;
\`\`\`

### 代码组

:::code-group

\`\`\`ts [typescript]
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

\`\`\`bash [install]
pnpm add @rx-ted/packages-markdown-editor
\`\`\`

:::

### 单标签代码块

\`\`\`rust [Rust 示例]
fn main() {
    let msg = "Hello, World!";
    println!("{}", msg);
}
\`\`\`

## 7. 表格

| 名称   | 价格  | 库存 | 备注       |
| ------ | ----- | ---- | ---------- |
| 苹果   | ¥5.0  | 100  | 新鲜到货   |
| 香蕉   | ¥3.5  | 50   | 促销中     |
| 樱桃   | ¥15.0 | 20   | 进口       |

对齐方式：\`:---\` 左对齐，\`:---:\` 居中，\`---:\` 右对齐。

| 左对齐 | 居中 | 右对齐 |
| :----- | :--: | -----: |
| 左     | 中   | 右     |
| 文本   | 文本 | 文本   |

## 8. 数学公式（KaTeX）

行内：$E = mc^2$，以及 $\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$。

块级：

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}
$$

分段函数：

$$
F(n) = \\begin{cases}
0 & n = 0 \\\\
1 & n = 1 \\\\
F(n-1) + F(n-2) & n > 1
\\end{cases}
$$

## 9. 提示容器（directives）

:::tip
这是一条提示。
:::

:::warning
这是一条警告。
:::

:::danger
这是危险信息。
:::

:::info
这是一个信息容器。
:::

<details>
<summary>点击展开</summary>

可折叠内容中的 Markdown，通过 rehype-raw 渲染。

</details>

## 10. 原始 HTML

<p style="color: var(--app-primary);">这是一个以 HTML 渲染的段落。</p>

## 11. Mermaid 图表

\`\`\`mermaid
graph TD
  A[开始] --> B{校验}
  B -->|通过| C[处理]
  B -->|失败| D[报错]
  C --> E[完成]
  D --> E
\`\`\`

## 12. 综合示例

数学与代码结合：

\`\`\`javascript
function fib(n) {
  if (n < 2) return n;
  let a = 0,
    b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

// 输出前 20 项
console.log(Array.from({ length: 20 }, (_, i) => fib(i)));
// → [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181]
\`\`\`
`;
</script>
