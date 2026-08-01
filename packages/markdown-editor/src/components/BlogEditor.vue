<script setup lang="ts">
import { ref, watch, onBeforeUnmount, onMounted, nextTick } from 'vue';
import type { EditorSavePayload } from './BlogEditorSaveDialog.vue';
import { NButton, NSpace, NIcon } from 'naive-ui';
import { Icon } from '@iconify/vue';
import MarkdownRenderer, { type ReadyPayload } from './MarkdownRenderer.vue';
import BlogEditorSaveDialog from './BlogEditorSaveDialog.vue';
import { MarkdownIndex, HeadingTree } from '../core/sourcemap';
import { DomIndex } from '../core/domIndex';
import { SyncEngine, SyncReason } from '../core/syncEngine';
import type { EditorTheme } from '../core/themes';
import type { Locale, MessageSchema } from '../lang';

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
    locale?: Locale;
    messages?: Partial<MessageSchema>;
  }>(),
  {
    helpHref: undefined,
    draftStorageKey: 'editor:draft',
    autoRestore: false,
    editorTheme: 'light',
    previewTheme: 'github-light',
    locale: 'zh-CN',
    messages: () => ({}),
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'save', payload: EditorSavePayload): void;
  (e: 'cancel'): void;
}>();

const showPreview = ref(true);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const previewScrollRef = ref<HTMLElement | null>(null);

const syncEngine = new SyncEngine();
const headingTree = ref<HeadingTree>();

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
}

function onPreviewScroll() {
  if (syncEngine.isSyncing || isTyping) return;
  syncEngine.previewScroll();
}

/* ── Event handlers ────────────────────────────────── */

function onInput(v: string) {
  isTyping = true;
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

function emitValue(v: string) {
  currentValue.value = v;
  emit('update:modelValue', v);
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
    code: ['`', '`'],
    link: ['[', '](url)'],
    image: ['![', '](url)'],
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
  } else if (type === 'table') {
    const tbl = '\n| Header | Header |\n| ------ | ------ |\n| Cell | Cell |\n';
    emitValue(text.slice(0, start) + tbl + text.slice(start));
  } else if (type === 'hr') {
    emitValue(`${text.slice(0, start)}\n---\n${text.slice(start)}`);
  }
}

// Save on Ctrl+S / Cmd+S
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
});

function attachScrollListeners() {
  if (textareaRef.value) {
    textareaRef.value.removeEventListener('scroll', onEditorScroll);
    textareaRef.value.addEventListener('scroll', onEditorScroll, { passive: true });
    textareaRef.value.removeEventListener('click', onEditorClick);
    textareaRef.value.addEventListener('click', onEditorClick);
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
  const saved = localStorage.getItem(props.draftStorageKey);
  if (saved && saved !== props.modelValue && !props.isEdit) {
    if (props.autoRestore || window.confirm('检测到未保存的草稿，是否恢复？')) {
      emitValue(saved);
    } else {
      localStorage.removeItem(props.draftStorageKey);
    }
  }
  nextTick(attachScrollListeners);
});

watch(showPreview, () => {
  nextTick(attachScrollListeners);
});

watch(
  () => props.loading,
  (newVal, oldVal) => {
    if (oldVal === true && newVal === false) {
      localStorage.removeItem(props.draftStorageKey);
    }
  },
);

const dialogRef = ref<InstanceType<typeof BlogEditorSaveDialog>>();

function openHelp() {
  if (props.helpHref) {
    window.open(props.helpHref, '_blank');
  }
}

function requestSave() {
  dialogRef.value?.open(currentValue.value, {
    ...props.initialMeta,
  });
}
</script>

<template>
  <div class="editor-grid" :data-me-editor-theme="props.editorTheme">
    <section class="editor-main">
      <div class="editor-topbar">
        <div>
          <h1>写作页面</h1>
        </div>
        <NSpace>
          <NButton quaternary size="small" @click="showPreview = !showPreview">
            <template #icon>
              <NIcon><Icon :icon="showPreview ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" width="16" /></NIcon>
            </template>
            {{ showPreview ? '隐藏预览' : '显示预览' }}
          </NButton>
          <NButton v-if="props.helpHref" @click="openHelp">
            <template #icon>
              <Icon icon="mdi:help-circle-outline" width="16" />
            </template>
            帮助
          </NButton>
          <NButton type="primary" :loading="props.loading" @click="requestSave"> 保存 </NButton>
        </NSpace>
      </div>

      <div class="editor-body" :class="{ 'with-preview': showPreview }">
        <div class="editor-pane">
          <div class="toolbar">
            <button class="tb-btn" title="粗体" @click="insertInline('bold')"><Icon icon="mdi:format-bold" width="16" /></button>
            <button class="tb-btn" title="斜体" @click="insertInline('italic')"><Icon icon="mdi:format-italic" width="16" /></button>
            <button class="tb-btn" title="删除线" @click="insertInline('strikethrough')"><Icon icon="mdi:format-strikethrough" width="16" /></button>
            <button class="tb-btn" title="行内代码" @click="insertInline('code')"><Icon icon="mdi:code-tags" width="16" /></button>
            <span class="tb-sep"></span>
            <button class="tb-btn" title="标题1" @click="insertBlock('h1')"><Icon icon="mdi:format-header-1" width="16" /></button>
            <button class="tb-btn" title="标题2" @click="insertBlock('h2')"><Icon icon="mdi:format-header-2" width="16" /></button>
            <button class="tb-btn" title="标题3" @click="insertBlock('h3')"><Icon icon="mdi:format-header-3" width="16" /></button>
            <span class="tb-sep"></span>
            <button class="tb-btn" title="无序列表" @click="insertBlock('ul')"><Icon icon="mdi:format-list-bulleted" width="16" /></button>
            <button class="tb-btn" title="有序列表" @click="insertBlock('ol')"><Icon icon="mdi:format-list-numbered" width="16" /></button>
            <button class="tb-btn" title="任务列表" @click="insertBlock('task')"><Icon icon="mdi:check-box-outline" width="16" /></button>
            <span class="tb-sep"></span>
            <button class="tb-btn" title="引用" @click="insertBlock('blockquote')"><Icon icon="mdi:format-quote-close" width="16" /></button>
            <button class="tb-btn" title="代码块" @click="insertBlock('codeblock')"><Icon icon="mdi:code-braces" width="16" /></button>
            <button class="tb-btn" title="表格" @click="insertBlock('table')"><Icon icon="mdi:table" width="16" /></button>
            <button class="tb-btn" title="分割线" @click="insertBlock('hr')"><Icon icon="mdi:minus" width="16" /></button>
            <span class="tb-sep"></span>
            <button class="tb-btn" title="链接" @click="insertInline('link')"><Icon icon="mdi:link-variant" width="16" /></button>
            <button class="tb-btn" title="图片" @click="insertInline('image')"><Icon icon="mdi:image-outline" width="16" /></button>
          </div>
          <textarea
            ref="textareaRef"
            class="editor-textarea"
            @input="onInput(($event.target as HTMLTextAreaElement).value)"
            @keydown="onKeydown"
            placeholder="开始写作..."
            spellcheck="true"
            wrap="off"
          />
        </div>
        <div v-if="showPreview" class="preview-pane">
          <div class="preview-header">预览</div>
          <div ref="previewScrollRef" class="preview-scroll">
            <MarkdownRenderer
              :content="currentValue"
              :theme="props.previewTheme"
              :interactive-tasks="false"
              @ready="onReady"
            />
          </div>
        </div>
      </div>
    </section>

    <BlogEditorSaveDialog
      ref="dialogRef"
      :tag-options="props.tagOptions"
      :category-options="props.categoryOptions"
      :locale="props.locale"
      :messages="props.messages"
      @confirm="emit('save', $event)"
    />
  </div>
</template>

<style scoped>
.editor-grid {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
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
  border: 1px solid var(--me-border);
  border-radius: 8px;
  overflow: hidden;
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
  background-color: var(--me-bg-soft);
  border-bottom: 1px solid var(--me-border);
  flex-shrink: 0;
}

.tb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--me-text-secondary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.1s;
  font-size: 16px;
}

.tb-btn:hover {
  background-color: var(--me-border);
  color: var(--me-text);
}

.tb-sep {
  width: 1px;
  height: 20px;
  background-color: var(--me-border);
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
  color: var(--me-text);
  background: var(--me-bg);
  tab-size: 2;
}

.editor-textarea::placeholder {
  color: var(--me-text-secondary);
  opacity: 0.6;
}

.preview-pane {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--me-border);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-header {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--me-text-secondary);
  background-color: var(--me-bg-soft);
  border-bottom: 1px solid var(--me-border);
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
