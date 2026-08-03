<script setup lang="ts">
import { ref, watch, onBeforeUnmount, onMounted, nextTick, computed, reactive } from 'vue';
import type { EditorSavePayload } from './BlogEditorSaveDialog.vue';
import { NButton, NSpace, NIcon, NDropdown, NPopover, NModal, NInput } from 'naive-ui';
import type { DropdownOption } from 'naive-ui';
import { Icon } from '@iconify/vue';
import MarkdownRenderer, { type ReadyPayload } from './MarkdownRenderer.vue';
import BlogEditorSaveDialog from './BlogEditorSaveDialog.vue';
import { MarkdownIndex, HeadingTree } from '../core/sourcemap';
import { DomIndex } from '../core/domIndex';
import { SyncEngine, SyncReason } from '../core/syncEngine';
import {
  getEditorTheme,
  applyEditorTheme,
  getPreviewTheme,
  PREVIEW_THEMES,
  CODE_THEMES,
  type EditorTheme,
} from '../core/themes';
import { createI18n, type Locale, type MessageSchema } from '../lang';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    loading?: boolean;
    isEdit?: boolean;
    tagOptions: { label: string; value: number }[];
    categoryOptions: { label: string; value: number }[];
    initialMeta?: Partial<EditorSavePayload>;
    helpHref?: string;
    draftStorageKey?: string;
    autoRestore?: boolean;
    editorTheme?: EditorTheme;
    previewTheme?: string;
    codeTheme?: string;
    locale?: Locale;
    messages?: Partial<MessageSchema>;
    createdAt?: string | number | null;
    updatedAt?: string | number | null;
    uploadImage?: (file: File) => Promise<string>;
    saveMode?: 'file' | 'dialog';
    onBeforeSave?: (content: string) => void | Promise<void>;
  }>(),
  {
    helpHref: undefined,
    draftStorageKey: 'editor:draft',
    autoRestore: false,
    editorTheme: 'light',
    previewTheme: 'github-light',
    codeTheme: undefined,
    locale: 'zh-CN',
    messages: () => ({}),
    createdAt: null,
    updatedAt: null,
    uploadImage: undefined,
    saveMode: 'file',
    onBeforeSave: undefined,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'save', payload: EditorSavePayload): void;
  (e: 'saveFile', content: string): void;
  (e: 'cancel'): void;
  (e: 'update:locale', value: Locale): void;
  (e: 'update:editorTheme', value: EditorTheme): void;
  (e: 'update:previewTheme', value: string): void;
  (e: 'update:codeTheme', value: string | undefined): void;
}>();

const localeRef = ref<Locale>(props.locale);
watch(
  () => props.locale,
  (v) => {
    localeRef.value = v;
  },
);

const t = computed(() => createI18n({ locale: localeRef.value, messages: props.messages }).t);

const editorThemeRef = ref<EditorTheme>(props.editorTheme);
const previewThemeRef = ref<string>(props.previewTheme);
const codeThemeRef = ref<string | undefined>(props.codeTheme);

watch(
  () => props.editorTheme,
  (v) => {
    editorThemeRef.value = v;
  },
);
watch(
  () => props.previewTheme,
  (v) => {
    previewThemeRef.value = v;
  },
);
watch(
  () => props.codeTheme,
  (v) => {
    codeThemeRef.value = v;
  },
);
watch(editorThemeRef, (v) => {
  emit('update:editorTheme', v);
  applyEditorThemeVars();
});
watch(previewThemeRef, (v) => emit('update:previewTheme', v));
watch(codeThemeRef, (v) => emit('update:codeTheme', v));

const editorGridRef = ref<HTMLElement | null>(null);
const showPreview = ref(true);
const previewOnly = ref(false);
const windowFullscreen = ref(false);
const screenFullscreen = ref(false);
const showToc = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const previewScrollRef = ref<HTMLElement | null>(null);

const syncEngine = new SyncEngine();
const headingTree = ref<HeadingTree>();
const markdownIndexRef = ref<MarkdownIndex>();
const domIndexRef = ref<DomIndex>();

let isTyping = false;
let typingTimer: ReturnType<typeof setTimeout> | null = null;

/* ── State ─────────────────────────────────────────── */

const END_THRESHOLD = 30;

function isEditorNearEnd(ta: HTMLTextAreaElement): boolean {
  const totalLines = currentValue.value.split('\n').length;
  const lh = parseFloat(getComputedStyle(ta).lineHeight) || 23.8;
  const currentLine = Math.floor(ta.scrollTop / lh) + 1;
  return totalLines - currentLine <= END_THRESHOLD;
}

/* ── Sync helpers ──────────────────────────────────── */

function onReady(payload: ReadyPayload) {
  const elements = new Map<number, HTMLElement>();
  for (const el of payload.rootEl.querySelectorAll<HTMLElement>('[data-node]')) {
    const id = Number(el.getAttribute('data-node'));
    if (!Number.isNaN(id)) elements.set(id, el);
  }
  const mi = new MarkdownIndex(payload.nodes);
  const di = new DomIndex(elements);
  di.buildPositions(payload.rootEl);
  headingTree.value = new HeadingTree(payload.nodes);
  markdownIndexRef.value = mi;
  domIndexRef.value = di;
  syncToc();

  syncEngine.setConfig({
    textarea: textareaRef.value!,
    previewScroll: previewScrollRef.value!,
    markdownIndex: mi,
    domIndex: di,
    isTyping: () => isTyping,
  });

  syncEngine.reason = SyncReason.Render;
  if (isTyping && textareaRef.value && previewScrollRef.value) {
    if (isEditorNearEnd(textareaRef.value)) {
      previewScrollRef.value.scrollTop = previewScrollRef.value.scrollHeight;
    } else {
      syncEngine.followByOffset(textareaRef.value.selectionStart);
    }
  }
  requestAnimationFrame(() => {
    syncEngine.reason = SyncReason.None;
  });
}

function onEditorScroll() {
  if (syncEngine.isSyncing || isTyping || !textareaRef.value) return;
  const ta = textareaRef.value;
  const lh = parseFloat(getComputedStyle(ta).lineHeight) || 23.8;
  const line = Math.floor(ta.scrollTop / lh);
  syncEngine.editorScroll(line + 1);
}

function onEditorClick() {
  if (syncEngine.isSyncing || !textareaRef.value) return;
  syncEngine.editorClick(textareaRef.value.selectionStart);
  updateActiveToc();
}

function onPreviewScroll() {
  updateActiveToc();
  if (syncEngine.isSyncing || isTyping) return;
  syncEngine.previewScroll();
}

/* ── TOC ───────────────────────────────────────────── */

interface TocItem {
  id: number;
  text: string;
  depth: number;
  startOffset: number;
  startLine: number;
}

const tocItems = ref<TocItem[]>([]);
const activeTocId = ref<number | null>(null);

function syncToc() {
  const ht = headingTree.value;
  const mi = markdownIndexRef.value;
  if (!ht || !mi) {
    tocItems.value = [];
    return;
  }
  const text = currentValue.value;
  tocItems.value = ht.all.map((h) => {
    const node = mi.nodes.get(h.id);
    const raw = node ? text.slice(node.startOffset, node.endOffset) : '';
    const clean = raw.replace(/^\s*#{1,6}\s*/, '').trim();
    return {
      id: h.id,
      text: clean || '(untitled)',
      depth: h.depth,
      startOffset: node?.startOffset ?? 0,
      startLine: node?.startLine ?? 0,
    };
  });
}

function updateActiveToc() {
  const preview = previewScrollRef.value;
  const di = domIndexRef.value;
  if (!preview || !di) return;
  const scrollTop = preview.scrollTop;
  const containerTop = preview.getBoundingClientRect().top;
  let active: number | null = null;
  for (const item of tocItems.value) {
    const el = di.getElement(item.id);
    if (!el) continue;
    const top = el.getBoundingClientRect().top - containerTop + scrollTop;
    if (top <= scrollTop + 8) active = item.id;
    else break;
  }
  activeTocId.value = active;
}

function onTocClick(item: TocItem) {
  activeTocId.value = item.id;
  syncEngine.navigate(item.id);
  const ta = textareaRef.value;
  if (ta) {
    ta.focus();
    ta.setSelectionRange(item.startOffset, item.startOffset);
    const lh = parseFloat(getComputedStyle(ta).lineHeight) || 23.8;
    ta.scrollTop = Math.max(0, (item.startLine - 1) * lh - 20);
  }
}

/* ── Event handlers ────────────────────────────────── */

function onInput(v: string) {
  isTyping = true;
  dirty.value = true;
  lastModifiedAt.value = Date.now();
  if (typingTimer) clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    isTyping = false;
  }, 500);
  emitValue(v);
}

const currentValue = ref(props.modelValue);

watch(
  () => props.modelValue,
  (v) => {
    currentValue.value = v;
    if (textareaRef.value && textareaRef.value.value !== v) {
      textareaRef.value.value = v;
    }
  },
);

/* ── History (undo / redo) ─────────────────────────── */

const HISTORY_LIMIT = 200;
const historyPast = reactive<string[]>([]);
const historyFuture = reactive<string[]>([]);

const canUndo = computed(() => historyPast.length > 0);
const canRedo = computed(() => historyFuture.length > 0);

function emitValue(v: string) {
  if (v === currentValue.value) return;
  historyPast.push(currentValue.value);
  if (historyPast.length > HISTORY_LIMIT) historyPast.shift();
  historyFuture.length = 0;
  currentValue.value = v;
  emit('update:modelValue', v);
}

function restoreValue(v: string) {
  currentValue.value = v;
  emit('update:modelValue', v);
  nextTick(() => {
    const ta = textareaRef.value;
    if (ta) ta.value = v;
  });
}

function onUndo() {
  const prev = historyPast.pop();
  if (prev === undefined) return;
  historyFuture.push(currentValue.value);
  restoreValue(prev);
}

function onRedo() {
  const next = historyFuture.pop();
  if (next === undefined) return;
  historyPast.push(currentValue.value);
  restoreValue(next);
}

function insertBeforeAfter(before: string, after: string) {
  const ta = textareaRef.value;
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const text = currentValue.value;
  const selected = text.slice(start, end);
  const replaced = before + selected + after;
  emitValue(text.slice(0, start) + replaced + text.slice(end));
  nextTick(() => {
    ta.focus();
    ta.setSelectionRange(start + before.length, start + before.length + selected.length);
  });
}

function insertLinePrefix(prefix: string) {
  const ta = textareaRef.value;
  if (!ta) return;
  const start = ta.selectionStart;
  const text = currentValue.value;
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = text.indexOf('\n', start);
  const line = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
  const replaced = prefix + line;
  emitValue(text.slice(0, lineStart) + replaced + text.slice(lineEnd === -1 ? undefined : lineEnd));
  nextTick(() => {
    ta.focus();
    ta.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length);
  });
}

function wrapSelection(before: string, after: string) {
  insertBeforeAfter(before, after);
}

function insertInline(type: string) {
  const pairs: Record<string, [string, string]> = {
    bold: ['**', '**'],
    italic: ['*', '*'],
    strikethrough: ['~~', '~~'],
    underline: ['<u>', '</u>'],
    code: ['`', '`'],
    link: ['[', '](url)'],
    image: ['![', '](url)'],
    highlight: ['==', '=='],
    superscript: ['<sup>', '</sup>'],
    subscript: ['<sub>', '</sub>'],
  };
  const p = pairs[type];
  if (p) wrapSelection(p[0], p[1]);
}

function insertBlock(type: string) {
  const ta = textareaRef.value;
  if (!ta) return;
  const text = currentValue.value;
  const start = ta.selectionStart;
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const after = text.slice(start);
  const line = text.slice(lineStart, start);

  const blocks: Record<string, string> = {
    h1: '# ',
    h2: '## ',
    h3: '### ',
    h4: '#### ',
    blockquote: '> ',
    ul: '- ',
    ol: '1. ',
    task: '- [ ] ',
  };

  const prefix = blocks[type];
  if (prefix) {
    emitValue(text.slice(0, lineStart) + prefix + line + after);
  } else if (type === 'codeblock') {
    const insertion = '\n```\n\n```\n';
    emitValue(text.slice(0, start) + insertion + text.slice(start));
  } else if (type === 'hr') {
    emitValue(`${text.slice(0, start)}\n---\n${text.slice(start)}`);
  }
}

function insertTable(rows: number, cols: number) {
  const ta = textareaRef.value;
  if (!ta) return;
  const start = ta.selectionStart;
  const text = currentValue.value;
  const header = `| ${Array.from({ length: cols }, () => 'Header').join(' | ')} |\n`;
  const sep = `| ${Array.from({ length: cols }, () => '---').join(' | ')} |\n`;
  const body = Array.from(
    { length: rows - 1 },
    () => `| ${Array.from({ length: cols }, () => 'Cell').join(' | ')} |\n`,
  ).join('');
  const tbl = `\n${header}${sep}${body}\n`;
  emitValue(text.slice(0, start) + tbl + text.slice(start));
  tablePickerOpen.value = false;
  nextTick(() => ta.focus());
}

/* ── Table picker ──────────────────────────────────── */

const TABLE_MAX_ROWS = 8;
const TABLE_MAX_COLS = 8;
const tablePickerOpen = ref(false);
const hoverRows = ref(2);
const hoverCols = ref(2);

function onTableCellHover(i: number) {
  hoverRows.value = Math.floor((i - 1) / TABLE_MAX_COLS) + 1;
  hoverCols.value = ((i - 1) % TABLE_MAX_COLS) + 1;
}

function onTableCellClick(i: number) {
  insertTable(Math.floor((i - 1) / TABLE_MAX_COLS) + 1, ((i - 1) % TABLE_MAX_COLS) + 1);
}

/* ── Emoji ─────────────────────────────────────────── */

const EMOJIS: { shortcode: string; glyph: string }[] = [
  { shortcode: 'joy', glyph: '😂' },
  { shortcode: 'smile', glyph: '😄' },
  { shortcode: 'laughing', glyph: '😆' },
  { shortcode: 'wink', glyph: '😉' },
  { shortcode: 'blush', glyph: '😊' },
  { shortcode: 'thinking', glyph: '🤔' },
  { shortcode: 'eyes', glyph: '👀' },
  { shortcode: 'heart', glyph: '❤️' },
  { shortcode: 'broken_heart', glyph: '💔' },
  { shortcode: 'fire', glyph: '🔥' },
  { shortcode: 'rocket', glyph: '🚀' },
  { shortcode: 'tada', glyph: '🎉' },
  { shortcode: 'sparkles', glyph: '✨' },
  { shortcode: 'star', glyph: '⭐' },
  { shortcode: 'star2', glyph: '🌟' },
  { shortcode: 'sunny', glyph: '☀️' },
  { shortcode: 'moon', glyph: '🌙' },
  { shortcode: 'cloud', glyph: '☁️' },
  { shortcode: 'rainbow', glyph: '🌈' },
  { shortcode: 'zap', glyph: '⚡' },
  { shortcode: 'boom', glyph: '💥' },
  { shortcode: 'bulb', glyph: '💡' },
  { shortcode: 'warning', glyph: '⚠️' },
  { shortcode: 'question', glyph: '❓' },
  { shortcode: 'exclamation', glyph: '❗' },
  { shortcode: 'white_check_mark', glyph: '✅' },
  { shortcode: 'x', glyph: '❌' },
  { shortcode: '100', glyph: '💯' },
  { shortcode: 'clap', glyph: '👏' },
  { shortcode: '+1', glyph: '👍' },
  { shortcode: '-1', glyph: '👎' },
  { shortcode: 'muscle', glyph: '💪' },
  { shortcode: 'pray', glyph: '🙏' },
  { shortcode: 'point_up', glyph: '☝️' },
  { shortcode: 'writing_hand', glyph: '✍️' },
  { shortcode: 'memo', glyph: '📝' },
  { shortcode: 'pushpin', glyph: '📌' },
  { shortcode: 'bookmark', glyph: '🔖' },
  { shortcode: 'calendar', glyph: '📅' },
  { shortcode: 'clock', glyph: '🕐' },
  { shortcode: 'hourglass', glyph: '⏳' },
  { shortcode: 'computer', glyph: '💻' },
  { shortcode: 'phone', glyph: '📱' },
  { shortcode: 'camera', glyph: '📷' },
  { shortcode: 'briefcase', glyph: '💼' },
  { shortcode: 'link', glyph: '🔗' },
  { shortcode: 'speech_balloon', glyph: '💬' },
  { shortcode: 'thought_balloon', glyph: '💭' },
  { shortcode: 'trophy', glyph: '🏆' },
  { shortcode: 'chart_with_upwards_trend', glyph: '📈' },
  { shortcode: 'bug', glyph: '🐛' },
  { shortcode: 'key', glyph: '🔑' },
  { shortcode: 'lock', glyph: '🔒' },
  { shortcode: 'shield', glyph: '🛡️' },
  { shortcode: 'gear', glyph: '⚙️' },
];

const emojiOpen = ref(false);

function onEmojiSelect(shortcode: string) {
  insertBeforeAfter(`:${shortcode}:`, '');
  emojiOpen.value = false;
}

/* ── Mermaid ───────────────────────────────────────── */

const MERMAID_TEMPLATES: Record<string, string> = {
  flowchart:
    'flowchart TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Do it]\n    B -->|No| D[Wait]',
  sequenceDiagram:
    'sequenceDiagram\n    participant A as Alice\n    participant B as Bob\n    A->>B: Hello Bob\n    B-->>A: Hi Alice',
  classDiagram:
    'classDiagram\n    Animal <|-- Duck\n    Animal : +int age\n    Animal : +isMammal()\n    Duck : +quack()',
  stateDiagram:
    'stateDiagram-v2\n    [*] --> Still\n    Still --> [*]\n    Still --> Moving\n    Moving --> [*]',
  erDiagram: 'erDiagram\n    CUSTOMER ||--o{ ORDER : places\n    ORDER ||--|{ LINE-ITEM : contains',
  gantt:
    'gantt\n    title Project\n    dateFormat  YYYY-MM-DD\n    section Design\n    Task A: 2024-01-01, 7d',
  pie: 'pie title Pets\n    "Dogs" : 42\n    "Cats" : 35\n    "Fish" : 23',
  journey:
    'journey\n    title My day\n    section Morning\n      Wake up: 5: Me\n      Walk: 4: Me',
  gitGraph: 'gitGraph\n    commit\n    branch feature\n    commit\n    checkout main\n    commit',
  mindmap: 'mindmap\n  root((Idea))\n    Sub 1\n    Sub 2',
  timeline: 'timeline\n    title Timeline\n    2023: A\n    2024: B',
};

const MERMAID_TEMPLATE_KEYS = [
  'flowchart',
  'sequenceDiagram',
  'classDiagram',
  'stateDiagram',
  'erDiagram',
  'gantt',
  'pie',
  'journey',
  'gitGraph',
  'mindmap',
  'timeline',
] as const;

const mermaidOptions = computed<DropdownOption[]>(() =>
  MERMAID_TEMPLATE_KEYS.map((key) => ({ label: t.value(`editor.toolbar.mermaid.${key}`), key })),
);

function onMermaidSelect(key: string | number) {
  const template = MERMAID_TEMPLATES[String(key)];
  if (!template) return;
  const ta = textareaRef.value;
  if (!ta) return;
  const start = ta.selectionStart;
  const text = currentValue.value;
  const code = `\`\`\`mermaid\n${template}\n\`\`\`\n`;
  emitValue(text.slice(0, start) + code + text.slice(start));
  nextTick(() => ta.focus());
}

/* ── Toolbar dropdown options ──────────────────────── */

const headingOptions = computed<DropdownOption[]>(() => [
  { label: t.value('editor.toolbar.h1'), key: 'h1' },
  { label: t.value('editor.toolbar.h2'), key: 'h2' },
  { label: t.value('editor.toolbar.h3'), key: 'h3' },
  { label: t.value('editor.toolbar.h4'), key: 'h4' },
  { label: t.value('editor.toolbar.h5'), key: 'h5' },
  { label: t.value('editor.toolbar.h6'), key: 'h6' },
]);

function onHeadingSelect(key: string | number) {
  const level = String(key);
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(level)) insertBlock(level);
}

const languageOptions = computed<DropdownOption[]>(() => [
  { label: t.value('editor.toolbar.language.zhCN'), key: 'zh-CN' },
  { label: t.value('editor.toolbar.language.en'), key: 'en' },
]);

function onLocaleSelect(key: string | number) {
  const value = key as Locale;
  localeRef.value = value;
  emit('update:locale', value);
}

/* ── Theme picker modal ────────────────────────────── */

const THEME_SAMPLE = `# Theme Preview

A paragraph with **bold**, *italic* and \`inline code\`.

\`\`\`ts
const themes = ['light', 'dark'];
console.log(themes.length);
\`\`\`

> Blockquote line.

- list item
- [x] done task

| Name | Value |
| --- | --- |
| Theme | Preview |

### Math

$$E = mc^2$$
`;

const themeModalOpen = ref(false);
const themeDraft = reactive<{ editor: EditorTheme; preview: string; code: string | undefined }>({
  editor: 'light',
  preview: 'github-light',
  code: undefined,
});
const codeThemeSearch = ref('');

const editorThemeVarsStyle = computed(() => getEditorTheme(themeDraft.editor).vars);

// Picking a dark/light editor theme switches the preview sample to match.
watch(
  () => themeDraft.editor,
  (v) => {
    const target =
      v === 'dark'
        ? PREVIEW_THEMES.find((t) => t.id === 'github-dark')
        : PREVIEW_THEMES.find((t) => t.id === 'github-light');
    if (target) themeDraft.preview = target.id;
  },
);

const filteredCodeThemes = computed(() => {
  const q = codeThemeSearch.value.trim().toLowerCase();
  return q ? CODE_THEMES.filter((id) => id.toLowerCase().includes(q)) : CODE_THEMES;
});

function openThemeModal() {
  themeDraft.editor = editorThemeRef.value;
  themeDraft.preview = previewThemeRef.value;
  themeDraft.code = codeThemeRef.value;
  codeThemeSearch.value = '';
  themeModalOpen.value = true;
}

function applyThemeDraft() {
  editorThemeRef.value = themeDraft.editor;
  previewThemeRef.value = themeDraft.preview;
  codeThemeRef.value = themeDraft.code;
  themeModalOpen.value = false;
}

/* ── Image ─────────────────────────────────────────── */

const imageFileRef = ref<HTMLInputElement | null>(null);
const uploading = ref(false);

const imageOptions = computed<DropdownOption[]>(() => [
  { label: t.value('editor.toolbar.insertImage'), key: 'insert' },
  {
    label: uploading.value
      ? t.value('editor.imageUploading')
      : t.value('editor.toolbar.uploadImage'),
    key: 'upload',
    disabled: !props.uploadImage || uploading.value,
  },
]);

function onImageSelect(key: string | number) {
  if (key === 'insert') {
    insertInline('image');
  } else if (key === 'upload') {
    imageFileRef.value?.click();
  }
}

async function onImageFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || !props.uploadImage) return;
  uploading.value = true;
  try {
    const url = await props.uploadImage(file);
    const alt = file.name.replace(/\.[^.]+$/, '');
    insertBeforeAfter(`![${alt}](${url})`, '');
  } catch (err) {
    console.error('Image upload failed:', err);
  } finally {
    uploading.value = false;
  }
}

/* ── Front matter ──────────────────────────────────── */

const frontMatterOpen = ref(false);
const frontMatterRaw = ref('');

function parseFrontMatter(md: string): { content: string; start: number; end: number } | null {
  if (!md.startsWith('---\n')) return null;
  const endIdx = md.indexOf('\n---\n', 4);
  if (endIdx === -1) return null;
  return { content: md.slice(4, endIdx), start: 0, end: endIdx + 5 };
}

function openFrontMatter() {
  const existing = parseFrontMatter(currentValue.value);
  frontMatterRaw.value = existing
    ? existing.content
    : 'title: \ncover: \ntags: []\nstatus: draft\n';
  frontMatterOpen.value = true;
}

function applyFrontMatter() {
  const md = currentValue.value;
  const block = `---\n${frontMatterRaw.value.trimEnd()}\n---\n`;
  const existing = parseFrontMatter(md);
  emitValue(existing ? md.slice(0, existing.start) + block + md.slice(existing.end) : block + md);
  frontMatterOpen.value = false;
}

function removeFrontMatter() {
  const existing = parseFrontMatter(currentValue.value);
  if (existing) emitValue(currentValue.value.slice(existing.end));
  frontMatterOpen.value = false;
}

/* ── Fullscreen ────────────────────────────────────── */

// Overlays (dropdowns/popovers/modals) are teleported into the editor grid so
// they stay visible inside screen fullscreen, where body-level teleports are
// rendered behind the :fullscreen top layer.
const overlayTarget = computed<HTMLElement>(() => editorGridRef.value ?? document.body);

function toggleWindowFullscreen() {
  windowFullscreen.value = !windowFullscreen.value;
}

async function toggleScreenFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else if (editorGridRef.value?.requestFullscreen) {
    await editorGridRef.value.requestFullscreen();
  }
}

function onFullscreenChange() {
  screenFullscreen.value = Boolean(document.fullscreenElement);
}

function togglePreviewOnly() {
  previewOnly.value = !previewOnly.value;
  if (previewOnly.value) showPreview.value = true;
  nextTick(attachScrollListeners);
}

function toggleShowPreview() {
  if (previewOnly.value) return;
  showPreview.value = !showPreview.value;
}

function toggleToc() {
  showToc.value = !showToc.value;
}

/* ── Status bar ────────────────────────────────────── */

const dirty = ref(false);
const lastModifiedAt = ref<number | null>(null);
const cursor = reactive({ row: 1, col: 1 });

const stats = computed(() => {
  const text = currentValue.value;
  return {
    chars: text.length,
    words: (text.match(/\S+/g) || []).length,
    lines: text ? text.split('\n').length : 0,
  };
});

function onTextareaCursor() {
  const ta = textareaRef.value;
  if (!ta) return;
  const pos = ta.selectionStart;
  const upTo = currentValue.value.slice(0, pos);
  const lineIdx = upTo.lastIndexOf('\n');
  cursor.col = pos - lineIdx;
  cursor.row = upTo.split('\n').length;
}

function formatTime(value: string | number): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

/* ── Save on Ctrl+S / Cmd+S ────────────────────────── */

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    requestSave();
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

watch(currentValue, () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(props.draftStorageKey, currentValue.value);
  }, 2000);
});

function saveBeforeUnload() {
  localStorage.setItem(props.draftStorageKey, currentValue.value);
}

onBeforeUnmount(() => {
  saveBeforeUnload();
  if (saveTimer) clearTimeout(saveTimer);
  document.removeEventListener('fullscreenchange', onFullscreenChange);
});

function attachScrollListeners() {
  if (textareaRef.value) {
    textareaRef.value.removeEventListener('scroll', onEditorScroll);
    textareaRef.value.addEventListener('scroll', onEditorScroll, { passive: true });
  }
  if (previewScrollRef.value) {
    previewScrollRef.value.removeEventListener('scroll', onPreviewScroll);
    previewScrollRef.value.addEventListener('scroll', onPreviewScroll, { passive: true });
  }
}

onMounted(() => {
  if (textareaRef.value && textareaRef.value.value !== currentValue.value) {
    textareaRef.value.value = currentValue.value;
  }
  applyEditorThemeVars();
  const saved = localStorage.getItem(props.draftStorageKey);
  if (saved && saved !== props.modelValue && !props.isEdit) {
    if (props.autoRestore || window.confirm(t.value('editor.restoreDraft'))) {
      emitValue(saved);
    } else {
      localStorage.removeItem(props.draftStorageKey);
    }
  }
  nextTick(attachScrollListeners);
  document.addEventListener('fullscreenchange', onFullscreenChange);
});

function applyEditorThemeVars() {
  if (!editorGridRef.value) return;
  applyEditorTheme(editorGridRef.value, getEditorTheme(editorThemeRef.value));
  editorGridRef.value.style.colorScheme = editorThemeRef.value;
}

watch(showPreview, () => {
  nextTick(attachScrollListeners);
});

watch(
  () => props.loading,
  (newVal, oldVal) => {
    if (oldVal === true && newVal === false) {
      localStorage.removeItem(props.draftStorageKey);
      dirty.value = false;
    }
  },
);

const dialogRef = ref<InstanceType<typeof BlogEditorSaveDialog>>();

function openHelp() {
  if (props.helpHref) {
    window.open(props.helpHref, '_blank');
  }
}

async function requestSave() {
  try {
    await props.onBeforeSave?.(currentValue.value);
  } catch (cause) {
    console.error('[BlogEditor] onBeforeSave aborted save', cause);
    return;
  }
  if (props.saveMode === 'dialog') {
    dialogRef.value?.open(currentValue.value, {
      ...props.initialMeta,
    });
    return;
  }
  emit('saveFile', currentValue.value);
}

function onInsertHeading(marker: string) {
  insertBeforeAfter(`${marker} `, '');
}

function onPreviewContent(content: string) {
  emitValue(content);
}

defineExpose({
  openSave: requestSave,
  requestSave,
  getContent: () => currentValue.value,
  setContent: (v: string) => emitValue(v),
  isDirty: () => dirty.value,
});
</script>

<template>
  <div
    ref="editorGridRef"
    class="editor-grid"
    :class="{ 'is-window-fullscreen': windowFullscreen }"
    :data-me-editor-theme="editorThemeRef"
  >
    <section class="editor-main">
      <div class="editor-topbar">
        <div>
          <h1>{{ t('editor.title') }}</h1>
        </div>
        <NSpace>
          <NButton v-if="props.helpHref" @click="openHelp">
            <template #icon>
              <Icon icon="mdi:help-circle-outline" width="16" />
            </template>
            {{ t('editor.help') }}
          </NButton>
          <slot name="save" :content="currentValue" :request-save="requestSave">
            <NButton type="primary" :loading="props.loading" @click="requestSave"> {{ t('editor.save') }} </NButton>
          </slot>
        </NSpace>
      </div>

      <div class="editor-body" :class="{ 'with-preview': showPreview }">
        <div class="editor-pane">
          <div class="toolbar">
            <button class="tb-btn" :title="t('editor.toolbar.undo')" :disabled="!canUndo" @click="onUndo"><Icon icon="mdi:undo" width="16" /></button>
            <button class="tb-btn" :title="t('editor.toolbar.redo')" :disabled="!canRedo" @click="onRedo"><Icon icon="mdi:redo" width="16" /></button>

            <span class="tb-sep"></span>
            <button class="tb-btn" :title="t('editor.toolbar.bold')" @click="insertInline('bold')"><Icon icon="mdi:format-bold" width="16" /></button>
            <button class="tb-btn" :title="t('editor.toolbar.italic')" @click="insertInline('italic')"><Icon icon="mdi:format-italic" width="16" /></button>
            <button class="tb-btn" :title="t('editor.toolbar.strikethrough')" @click="insertInline('strikethrough')"><Icon icon="mdi:format-strikethrough" width="16" /></button>
            <button class="tb-btn" :title="t('editor.toolbar.underline')" @click="insertInline('underline')"><Icon icon="mdi:format-underline" width="16" /></button>
            <button class="tb-btn" :title="t('editor.toolbar.inlineCode')" @click="insertInline('code')"><Icon icon="mdi:code-tags" width="16" /></button>
            <button class="tb-btn" :title="t('editor.toolbar.highlight')" @click="insertInline('highlight')"><Icon icon="mdi:marker" width="16" /></button>
            <button class="tb-btn" :title="t('editor.toolbar.superscript')" @click="insertInline('superscript')"><Icon icon="mdi:format-superscript" width="16" /></button>
            <button class="tb-btn" :title="t('editor.toolbar.subscript')" @click="insertInline('subscript')"><Icon icon="mdi:format-subscript" width="16" /></button>

            <span class="tb-sep"></span>
            <n-dropdown trigger="hover" :options="headingOptions" :to="overlayTarget" @select="onHeadingSelect">
              <button class="tb-btn tb-btn-drop" :title="t('editor.toolbar.heading')">
                H <Icon icon="mdi:chevron-down" width="12" />
              </button>
            </n-dropdown>
            <button class="tb-btn" :title="t('editor.toolbar.unorderedList')" @click="insertBlock('ul')"><Icon icon="mdi:format-list-bulleted" width="16" /></button>
            <button class="tb-btn" :title="t('editor.toolbar.orderedList')" @click="insertBlock('ol')"><Icon icon="mdi:format-list-numbered" width="16" /></button>
            <button class="tb-btn" :title="t('editor.toolbar.taskList')" @click="insertBlock('task')"><Icon icon="mdi:check-box-outline" width="16" /></button>

            <span class="tb-sep"></span>
            <button class="tb-btn" :title="t('editor.toolbar.blockquote')" @click="insertBlock('blockquote')"><Icon icon="mdi:format-quote-close" width="16" /></button>
            <button class="tb-btn" :title="t('editor.toolbar.codeBlock')" @click="insertBlock('codeblock')"><Icon icon="mdi:code-braces" width="16" /></button>
            <n-dropdown trigger="hover" :options="mermaidOptions" :to="overlayTarget" @select="onMermaidSelect">
              <button class="tb-btn tb-btn-drop" :title="t('editor.toolbar.mermaid')">
                <Icon icon="mdi:sitemap-outline" width="16" />
                <Icon icon="mdi:chevron-down" width="12" />
              </button>
            </n-dropdown>
            <n-popover trigger="hover" v-model:show="tablePickerOpen" :to="overlayTarget">
              <template #trigger>
                <button class="tb-btn" :title="t('editor.toolbar.table')" :class="{ active: tablePickerOpen }"><Icon icon="mdi:table" width="16" /></button>
              </template>
              <div class="table-picker" @mouseleave="hoverRows = 2; hoverCols = 2">
                <div class="table-picker-grid">
                  <button
                    v-for="i in TABLE_MAX_ROWS * TABLE_MAX_COLS"
                    :key="i"
                    class="table-picker-cell"
                    :class="{
                      active: (i - 1) % TABLE_MAX_COLS < hoverCols && Math.floor((i - 1) / TABLE_MAX_COLS) < hoverRows,
                    }"
                    @mouseenter="onTableCellHover(i)"
                    @click="onTableCellClick(i)"
                  ></button>
                </div>
                <div class="table-picker-label">
                  {{ hoverRows }} × {{ hoverCols }} · {{ t('editor.table.insert') }}
                </div>
              </div>
            </n-popover>
            <button class="tb-btn" :title="t('editor.toolbar.hr')" @click="insertBlock('hr')"><Icon icon="mdi:minus" width="16" /></button>

            <span class="tb-sep"></span>
            <button class="tb-btn" :title="t('editor.toolbar.link')" @click="insertInline('link')"><Icon icon="mdi:link-variant" width="16" /></button>
            <n-dropdown trigger="hover" :options="imageOptions" :to="overlayTarget" @select="onImageSelect">
              <button class="tb-btn" :title="t('editor.toolbar.image')"><Icon icon="mdi:image-outline" width="16" /></button>
            </n-dropdown>
            <n-popover trigger="hover" v-model:show="emojiOpen" :to="overlayTarget">
              <template #trigger>
                <button class="tb-btn" :title="t('editor.toolbar.emoji')" :class="{ active: emojiOpen }"><Icon icon="mdi:emoticon-outline" width="16" /></button>
              </template>
              <div class="emoji-grid">
                <button
                  v-for="e in EMOJIS"
                  :key="e.shortcode"
                  class="emoji-cell"
                  :title="`:${e.shortcode}:`"
                  @click="onEmojiSelect(e.shortcode)"
                >
                  {{ e.glyph }}
                </button>
              </div>
            </n-popover>
            <button class="tb-btn" :title="t('editor.toolbar.frontMatter')" @click="openFrontMatter"><Icon icon="mdi:file-code-outline" width="16" /></button>

            <span class="tb-sep"></span>
            <button class="tb-btn" :title="t('editor.toolbar.toc')" :class="{ active: showToc }" @click="toggleToc"><Icon icon="mdi:toc" width="16" /></button>
            <button
              class="tb-btn"
              :title="t('editor.toolbar.windowFullscreen')"
              :class="{ active: windowFullscreen }"
              @click="toggleWindowFullscreen"
            >
              <Icon :icon="windowFullscreen ? 'mdi:window-restore' : 'mdi:window-maximize'" width="16" />
            </button>
            <button
              class="tb-btn"
              :title="t('editor.toolbar.screenFullscreen')"
              :class="{ active: screenFullscreen }"
              @click="toggleScreenFullscreen"
            >
              <Icon :icon="screenFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'" width="16" />
            </button>

            <span class="tb-sep"></span>
            <button
              class="tb-btn tb-btn-wide"
              :title="previewOnly ? t('editor.toolbar.previewOnly') : t(showPreview ? 'editor.hidePreview' : 'editor.showPreview')"
              :disabled="previewOnly"
              @click="toggleShowPreview"
            >
              <Icon :icon="showPreview ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" width="16" />
              {{ t(showPreview ? 'editor.hidePreview' : 'editor.showPreview') }}
            </button>
            <button
              class="tb-btn tb-btn-wide preview-only-btn"
              :title="previewOnly ? t('editor.toolbar.exitPreviewOnly') : t('editor.toolbar.previewOnly')"
              :class="{ 'preview-only-active': previewOnly }"
              @click="togglePreviewOnly"
            >
              <Icon :icon="previewOnly ? 'mdi:monitor-eye' : 'mdi:read'" width="16" />
              {{ t(previewOnly ? 'editor.toolbar.exitPreviewOnly' : 'editor.toolbar.previewOnly') }}
            </button>

            <span class="tb-sep"></span>
            <button class="tb-btn" :title="t('editor.save')" @click="requestSave"><Icon icon="mdi:content-save-outline" width="16" /></button>
            <button class="tb-btn tb-btn-drop tb-btn-wide" :title="getPreviewTheme(previewThemeRef).label" :class="{ active: themeModalOpen }" @click="openThemeModal">
              <Icon icon="mdi:palette-outline" width="16" />
              {{ getPreviewTheme(previewThemeRef).label }}
            </button>
            <n-dropdown trigger="hover" :options="languageOptions" :to="overlayTarget" @select="onLocaleSelect">
              <button class="tb-btn tb-btn-drop" :title="t('editor.toolbar.language')">
                <Icon icon="mdi:translate" width="16" />
                {{ localeRef === 'zh-CN' ? '中' : 'EN' }}
              </button>
            </n-dropdown>
          </div>

          <div v-show="!previewOnly" class="editor-pane-body">
            <textarea
              ref="textareaRef"
              class="editor-textarea"
              @input="onInput(($event.target as HTMLTextAreaElement).value)"
              @keydown="onKeydown"
              @click="onEditorClick(); onTextareaCursor()"
              @keyup="onTextareaCursor()"
              @select="onTextareaCursor()"
              :placeholder="t('editor.placeholder')"
              spellcheck="true"
              wrap="off"
            />

            <div class="editor-statusbar">
              <span class="status-save-state" :class="{ dirty }">{{ dirty ? t('editor.statusbar.unsaved') : t('editor.statusbar.saved') }}</span>
              <span class="status-spacer"></span>
              <span v-if="props.createdAt" class="status-item">{{ t('editor.statusbar.createdAt') }} {{ formatTime(props.createdAt) }}</span>
              <span v-if="props.updatedAt" class="status-item">{{ t('editor.statusbar.updatedAt') }} {{ formatTime(props.updatedAt) }}</span>
              <span v-if="lastModifiedAt" class="status-item">{{ t('editor.statusbar.lastModifiedAt') }} {{ formatTime(lastModifiedAt) }}</span>
              <span class="status-item">{{ stats.chars }} {{ t('editor.statusbar.chars') }}</span>
              <span class="status-item">{{ stats.words }} {{ t('editor.statusbar.words') }}</span>
              <span class="status-item">{{ stats.lines }} {{ t('editor.statusbar.lines') }}</span>
              <span class="status-item">Ln {{ cursor.row }}, Col {{ cursor.col }}</span>
            </div>
          </div>
        </div>

        <div v-if="showPreview" class="preview-pane">
          <div class="preview-header">{{ t('editor.preview') }}</div>
          <div ref="previewScrollRef" class="preview-scroll">
            <MarkdownRenderer
              :content="currentValue"
              :theme="previewThemeRef"
              :code-theme="codeThemeRef"
              :interactive-tasks="true"
              :heading-insert="true"
              @ready="onReady"
              @insert-heading="onInsertHeading"
              @update:content="onPreviewContent"
            />
          </div>
          <div v-if="showToc" class="toc-float">
            <div class="toc-float-header">{{ t('editor.toolbar.toc') }}</div>
            <nav v-if="tocItems.length" class="toc-nav">
              <button
                v-for="item in tocItems"
                :key="item.id"
                class="toc-item"
                :class="[{ active: activeTocId === item.id }, `toc-level-${item.depth}`]"
                :title="item.text"
                @click="onTocClick(item)"
              >
                {{ item.text }}
              </button>
            </nav>
            <div v-else class="toc-empty">{{ t('editor.toolbar.toc') }}…</div>
          </div>
        </div>
      </div>
    </section>

    <input ref="imageFileRef" type="file" accept="image/*" class="image-file-input" @change="onImageFileChange" />

    <BlogEditorSaveDialog
      :key="localeRef"
      ref="dialogRef"
      :tag-options="props.tagOptions"
      :category-options="props.categoryOptions"
      :locale="localeRef"
      :messages="props.messages"
      :to="overlayTarget"
      @confirm="emit('save', $event)"
    />

    <n-modal
      v-model:show="frontMatterOpen"
      preset="card"
      :title="t('editor.frontMatter.title')"
      :to="overlayTarget"
      style="width:50vw;max-width:640px;min-width:400px"
    >
      <div class="fm-hint">{{ t('editor.frontMatter.content') }}</div>
      <n-input v-model:value="frontMatterRaw" type="textarea" :rows="12" spellcheck="false" class="fm-textarea" />
      <template #footer>
        <n-space justify="end">
          <n-button @click="frontMatterOpen = false">{{ t('cancel') }}</n-button>
          <n-button @click="removeFrontMatter">{{ t('editor.frontMatter.remove') }}</n-button>
          <n-button type="primary" @click="applyFrontMatter">{{ t('editor.frontMatter.insert') }}</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="themeModalOpen"
      preset="card"
      :title="t('editor.toolbar.theme')"
      :to="overlayTarget"
      style="width:80vw;max-width:980px;min-width:680px"
    >
      <div class="theme-modal" :style="editorThemeVarsStyle">
        <div class="theme-side">
          <div class="theme-section">
            <label class="theme-label">{{ t('editor.toolbar.editorTheme') }}</label>
            <div class="theme-segment">
              <button
                class="theme-seg"
                :class="{ active: themeDraft.editor === 'light' }"
                @click="themeDraft.editor = 'light'"
              >
                {{ t('editor.theme.light') }}
              </button>
              <button
                class="theme-seg"
                :class="{ active: themeDraft.editor === 'dark' }"
                @click="themeDraft.editor = 'dark'"
              >
                {{ t('editor.theme.dark') }}
              </button>
            </div>
          </div>

          <div class="theme-section">
            <label class="theme-label">{{ t('editor.toolbar.previewTheme') }}</label>
            <div class="theme-list">
              <button
                v-for="p in PREVIEW_THEMES"
                :key="p.id"
                class="theme-opt"
                :class="{ active: themeDraft.preview === p.id }"
                @click="themeDraft.preview = p.id"
              >
                {{ p.label }}
              </button>
            </div>
          </div>

          <div class="theme-section grow">
            <label class="theme-label">{{ t('editor.toolbar.codeTheme') }}</label>
            <button
              class="theme-opt theme-opt-auto"
              :class="{ active: themeDraft.code == null }"
              @click="themeDraft.code = undefined"
            >
              {{ t('editor.theme.auto') }}
            </button>
            <n-input v-model:value="codeThemeSearch" size="small" :placeholder="t('editor.theme.search')" clearable class="theme-search" />
            <div class="theme-list theme-list-code">
              <button
                v-for="id in filteredCodeThemes"
                :key="id"
                class="theme-opt"
                :class="{ active: themeDraft.code === id }"
                @click="themeDraft.code = id"
              >
                {{ id }}
              </button>
            </div>
          </div>
        </div>

        <div class="theme-preview">
          <div class="theme-preview-head">
            <span>{{ getPreviewTheme(themeDraft.preview).label }}</span>
            <span class="theme-preview-code">{{ themeDraft.code ?? t('editor.theme.auto') }}</span>
          </div>
          <div class="theme-preview-body">
            <MarkdownRenderer :content="THEME_SAMPLE" :theme="themeDraft.preview" :code-theme="themeDraft.code" />
          </div>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="themeModalOpen = false">{{ t('cancel') }}</n-button>
          <n-button type="primary" @click="applyThemeDraft">{{ t('editor.theme.apply') }}</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.editor-grid {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.editor-grid.is-window-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: var(--me-bg, #ffffff);
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--me-border, #d0d7de);
}

.editor-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 8px;
}

.editor-topbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-end;
  flex-shrink: 0;
}

.editor-topbar h1 {
  margin: 6px 0 0;
}

.editor-body {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 12px;
}

.editor-pane {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  border: 1px solid var(--me-border, #d0d7de);
  border-radius: 8px;
  overflow: hidden;
}

.editor-pane-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.with-preview .editor-pane {
  max-width: 50%;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  background-color: var(--me-bg-soft, #f6f8fa);
  border-bottom: 1px solid var(--me-border, #d0d7de);
  flex-shrink: 0;
}

.tb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 30px;
  height: 28px;
  padding: 0 6px;
  border: none;
  background: transparent;
  color: var(--me-text-secondary, #57606a);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.1s;
  font-size: 16px;
}

.tb-btn:hover {
  background-color: var(--me-border, #d0d7de);
  color: var(--me-text, #1f2328);
}

.tb-btn.active {
  background-color: var(--me-bg-highlight, rgba(59, 130, 246, 0.15));
  color: var(--me-primary, #0969da);
}

.tb-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tb-btn:disabled:hover {
  background-color: transparent;
  color: var(--me-text-secondary, #57606a);
}

.tb-btn:active {
  transform: translateY(1px);
}

.tb-btn:focus-visible {
  outline: 2px solid var(--me-primary, #0969da);
  outline-offset: -2px;
}

.tb-btn-drop {
  font-size: 12px;
  font-weight: 700;
}

.tb-btn-wide {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tb-sep {
  width: 1px;
  height: 20px;
  background-color: var(--me-border, #d0d7de);
  margin: 0 4px;
  flex-shrink: 0;
}

.editor-textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  padding: 16px;
  font-family: 'Space Mono', 'Fira Code', Menlo, Monaco, 'Courier New', Courier, monospace;
  font-size: 14px;
  line-height: 1.7;
  color: var(--me-text, #1f2328);
  background: var(--me-bg, #ffffff);
  tab-size: 2;
}

.editor-textarea::placeholder {
  color: var(--me-text-secondary, #57606a);
  opacity: 0.6;
}

.editor-textarea::selection {
  background: var(--me-bg-highlight, rgba(59, 130, 246, 0.15));
}

/* ── Status bar ── */
.editor-statusbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 4px 12px;
  font-size: 12px;
  color: var(--me-text-secondary, #57606a);
  background-color: var(--me-bg-soft, #f6f8fa);
  border-top: 1px solid var(--me-border, #d0d7de);
  flex-shrink: 0;
}

.status-spacer {
  flex: 1;
}

.status-save-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.status-save-state::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--me-success, #1a7f37);
}

.status-save-state.dirty::before {
  background-color: var(--me-warning, #9a6700);
}

/* ── Table picker ── */
.table-picker {
  padding: 4px;
}

/* ── Emoji grid ── */
.emoji-grid {
  display: grid;
  grid-template-columns: repeat(10, 30px);
  gap: 3px;
  padding: 6px;
  max-height: 264px;
  overflow-y: auto;
}

.emoji-cell {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 19px;
  line-height: 1;
  padding: 0;
}

.emoji-cell:hover {
  background: var(--me-bg-highlight, rgba(59, 130, 246, 0.15));
  transform: scale(1.12);
}

.table-picker-grid {
  display: grid;
  grid-template-columns: repeat(8, 18px);
  grid-template-rows: repeat(8, 18px);
  gap: 3px;
  margin-bottom: 8px;
}

.table-picker-cell {
  width: 18px;
  height: 18px;
  border: 1px solid #c0c4cc;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  padding: 0;
}

.table-picker-cell.active {
  background: var(--me-primary, #0969da);
  border-color: var(--me-primary, #0969da);
}

.table-picker-label {
  font-size: 12px;
  color: var(--me-text-secondary, #57606a);
  text-align: center;
}

/* ── TOC floating panel ── */
.toc-float {
  position: absolute;
  top: 44px;
  right: 12px;
  width: 280px;
  max-height: calc(100% - 60px);
  display: flex;
  flex-direction: column;
  background: var(--me-bg, #ffffff);
  border: 1px solid var(--me-border, #d0d7de);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  z-index: 6;
}

.toc-float-header {
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--me-text-secondary, #57606a);
  background-color: var(--me-bg-soft, #f6f8fa);
  border-bottom: 1px solid var(--me-border, #d0d7de);
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.toc-nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.toc-item {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--me-text-secondary, #57606a);
  font-size: 14px;
  line-height: 1.5;
  padding: 4px 8px;
  border-left: 2px solid transparent;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toc-item:hover {
  color: var(--me-text, #1f2328);
}

.toc-item.active {
  color: var(--me-primary, #0969da);
  border-left-color: var(--me-primary, #0969da);
  background-color: var(--me-bg-highlight, rgba(59, 130, 246, 0.15));
}

.toc-level-1 { padding-left: 8px; }
.toc-level-2 { padding-left: 8px; }
.toc-level-3 { padding-left: 20px; }
.toc-level-4 { padding-left: 32px; }
.toc-level-5 { padding-left: 44px; }
.toc-level-6 { padding-left: 56px; }

.toc-empty {
  padding: 16px;
  font-size: 13px;
  color: var(--me-text-muted, #8c959f);
}

/* ── Front matter dialog ── */
.fm-hint {
  font-size: 12px;
  color: var(--me-text-secondary, #57606a);
  margin-bottom: 8px;
}

.fm-textarea :deep(textarea) {
  font-family: 'Space Mono', Menlo, Monaco, monospace;
  font-size: 13px;
}

/* ── Theme picker modal ── */
.theme-modal {
  display: flex;
  gap: 16px;
  height: 520px;
}

.theme-side {
  flex: 0 0 300px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.theme-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
}

.theme-section.grow {
  flex: 1;
}

.theme-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--me-text-secondary, #57606a);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.theme-segment {
  display: flex;
  gap: 6px;
}

.theme-seg {
  flex: 1;
  height: 32px;
  border: 1px solid var(--me-border, #d0d7de);
  border-radius: 6px;
  background: transparent;
  color: var(--me-text-secondary, #57606a);
  cursor: pointer;
  font-size: 14px;
}

.theme-seg.active {
  background: var(--me-bg-highlight, rgba(59, 130, 246, 0.15));
  color: var(--me-primary, #0969da);
  border-color: var(--me-primary, #0969da);
}

.theme-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  max-height: 160px;
  padding-right: 4px;
}

.theme-list-code {
  flex: 1;
  max-height: none;
}

.theme-opt {
  text-align: left;
  border: none;
  background: transparent;
  color: var(--me-text, #1f2328);
  font-size: 14px;
  padding: 5px 8px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theme-opt:hover {
  background: var(--me-bg-soft, #f6f8fa);
}

.theme-opt.active {
  background: var(--me-bg-highlight, rgba(59, 130, 246, 0.15));
  color: var(--me-primary, #0969da);
  font-weight: 600;
}

.theme-search {
  margin-bottom: 4px;
}

.theme-preview {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--me-border, #d0d7de);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.theme-preview-head {
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--me-text-secondary, #57606a);
  background-color: var(--me-bg-soft, #f6f8fa);
  border-bottom: 1px solid var(--me-border, #d0d7de);
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.theme-preview-code {
  font-family: 'Space Mono', Menlo, Monaco, monospace;
  font-size: 12px;
  font-weight: 500;
  color: var(--me-text-muted, #8c959f);
  background: var(--me-border, #d0d7de);
  border-radius: 4px;
  padding: 1px 8px;
  text-transform: none;
  letter-spacing: 0;
}

.theme-preview-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  background: var(--me-bg, #ffffff);
}

.theme-preview-body :deep(.markdown-body-root) {
  min-height: 100%;
  border-radius: 8px;
  padding: 8px;
}

.image-file-input {
  display: none;
}

.preview-only-active {
  color: var(--me-primary, #0969da);
}

/* ── Override default control styles ── */
.editor-grid :deep(button:focus-visible),
.editor-grid :deep(a:focus-visible),
.editor-grid :deep(input:focus-visible),
.editor-grid :deep(select:focus-visible) {
  outline: 2px solid var(--me-primary, #0969da);
  outline-offset: 2px;
}

.editor-grid :deep(input[type='checkbox']) {
  accent-color: var(--me-primary, #0969da);
}

.preview-scroll::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.preview-scroll::-webkit-scrollbar-thumb {
  background: var(--me-border, #d0d7de);
  border-radius: 5px;
}

.preview-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--me-text-muted, #8c959f);
}

.preview-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.preview-pane {
  position: relative;
  flex: 1;
  min-width: 0;
  border: 1px solid var(--me-border, #d0d7de);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-header {
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--me-text-secondary, #57606a);
  background-color: var(--me-bg-soft, #f6f8fa);
  border-bottom: 1px solid var(--me-border, #d0d7de);
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.preview-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

@media (max-width: 1080px) {
  .editor-topbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
