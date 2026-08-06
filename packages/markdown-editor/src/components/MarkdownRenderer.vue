<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue';
import { renderMarkdown } from '../core/markdown';
import type { SourceNode } from '../core/sourcemap';
import { DEFAULT_PREVIEW_THEME, getPreviewTheme, type EditorTheme } from '../core/themes';
import { loadPreviewThemeCss } from '../core/themeCss';
import { isTaskChecked, toggleTask } from '../core/tasks';
import type { MarkdownOverflowOptions } from '../core/overflow';

import 'katex/dist/katex.min.css';

const props = withDefaults(
  defineProps<{
    content: string;
    theme?: string;
    codeTheme?: string;
    mode?: EditorTheme;
    interactiveTasks?: boolean;
    headingInsert?: boolean;
    id?: string;
    overflowOptions?: MarkdownOverflowOptions;
  }>(),
  {
    theme: DEFAULT_PREVIEW_THEME,
    codeTheme: undefined,
    mode: 'light',
    interactiveTasks: false,
    headingInsert: false,
    id: undefined,
    overflowOptions: () => ({}),
  },
);

export interface ReadyPayload {
  nodes: SourceNode[];
  rootEl: HTMLElement;
}

const emit = defineEmits<{
  (e: 'ready', payload: ReadyPayload): void;
  (e: 'insertHeading', marker: string): void;
  (e: 'update:content', content: string): void;
}>();

const html = ref('');
const ready = ref(false);
const markdownBodyRef = ref<HTMLElement | null>(null);
const rootRef = ref<HTMLElement | null>(null);
const sourceNodes: SourceNode[] = [];

const previewTheme = computed(() => getPreviewTheme(props.theme));
const codeTheme = computed(() => props.codeTheme ?? previewTheme.value.codeTheme[props.mode]);

async function render() {
  try {
    const result = await renderMarkdown(props.content, {
      codeTheme: codeTheme.value,
      interactiveTasks: props.interactiveTasks,
    });
    html.value = result.html;
    sourceNodes.length = 0;
    sourceNodes.push(...result.nodes);
  } catch (e) {
    console.error('Markdown render error:', e);
    html.value = `<pre style="color:var(--me-error)">${e}</pre>`;
  }
}

onMounted(async () => {
  ready.value = true;
  loadPreviewThemeCss(props.theme);
  render();
});

watch([() => props.content, () => props.theme, () => props.codeTheme, () => props.mode], () => {
  if (ready.value) render();
});

watch(
  () => props.theme,
  (id) => loadPreviewThemeCss(id),
);

// ── Client-side interactions ──
function addCodeInteractions() {
  const root = markdownBodyRef.value;
  if (!root) return;

  root.querySelectorAll('pre[data-theme]').forEach((pre) => {
    const el = pre as HTMLElement;
    if (el.querySelector('.code-copy-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    el.appendChild(btn);
  });

  root.querySelectorAll('pre[data-theme]').forEach((pre) => {
    const el = pre as HTMLElement;
    if (el.querySelector('.code-ln-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'code-ln-btn';
    btn.textContent = '¶';
    btn.setAttribute('data-active', '');
    el.appendChild(btn);
  });

  root.querySelectorAll('pre[data-theme]').forEach((pre) => {
    const el = pre as HTMLElement;
    if (el.classList.contains('code-collapsible')) return;
    if (el.scrollHeight <= 400) return;
    el.classList.add('code-collapsible');
    const btn = document.createElement('button');
    btn.className = 'code-fold-btn';
    btn.textContent = '−';
    el.appendChild(btn);
  });
}

async function initMermaid() {
  const root = markdownBodyRef.value;
  if (!root) return;
  const els: HTMLElement[] = [...root.querySelectorAll<HTMLElement>(':scope > .mermaid')];
  if (!els.length) return;
  try {
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({
      startOnLoad: false,
      theme: previewTheme.value.mermaidTheme[props.mode],
      fontFamily:
        "'trebuchet ms', verdana, arial, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Hiragino Sans GB', sans-serif",
    });
    await mermaid.run({ nodes: els });
  } catch (e) {
    console.error('Mermaid render error:', e);
  }
}

watch(html, async () => {
  await nextTick();
  addCodeInteractions();
  await initMermaid();
  if (sourceNodes.length && markdownBodyRef.value) {
    emit('ready', { nodes: [...sourceNodes], rootEl: markdownBodyRef.value });
  }
});

onMounted(() => {
  const root = rootRef.value;
  if (!root) return;

  root.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;

    // Heading marker → insert into the editor (when embedded) or copy to clipboard
    const headingAnchor = target.closest('a.heading-anchor') as HTMLElement | null;
    if (headingAnchor) {
      e.preventDefault();
      const marker = headingAnchor.textContent?.trim() ?? '';
      if (!marker) return;
      const original = headingAnchor.textContent;
      headingAnchor.textContent = '✓';
      setTimeout(() => {
        headingAnchor.textContent = original;
      }, 1500);
      if (props.headingInsert) {
        emit('insertHeading', marker);
      } else {
        navigator.clipboard.writeText(`${marker} `).catch(() => {});
      }
      return;
    }

    // Interactive task checkbox → toggle the source markdown.
    // Note: in a `click` handler the browser has already flipped `input.checked`,
    // so the next state must be derived from the source marker, not the DOM.
    const checkbox = target.closest('input[type="checkbox"]') as HTMLInputElement | null;
    if (checkbox) {
      if (!props.interactiveTasks) return;
      e.preventDefault();
      const li = checkbox.closest('li[data-node]') as HTMLElement | null;
      const id = li ? Number(li.getAttribute('data-node')) : NaN;
      const node = sourceNodes.find((n) => n.id === id);
      if (!Number.isNaN(id) && node) {
        const current = isTaskChecked(props.content, node.startOffset);
        if (current === null) return;
        const next = !current;
        checkbox.checked = next;
        emit('update:content', toggleTask(props.content, node.startOffset, next));
      }
      return;
    }

    // Copy
    const copyBtn = target.closest('.code-copy-btn') as HTMLElement | null;
    if (copyBtn) {
      const pre = copyBtn.closest('pre') as HTMLElement | null;
      if (!pre) return;
      const text = pre.dataset.code || pre.querySelector('code')?.textContent || '';
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.innerHTML = '<span class="code-copy-ok">✓</span>';
        setTimeout(() => {
          copyBtn.innerHTML =
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        }, 1500);
      });
      return;
    }

    // Line number toggle (global)
    const lnBtn = target.closest('.code-ln-btn') as HTMLElement | null;
    if (lnBtn) {
      const rootEl = markdownBodyRef.value;
      if (!rootEl) return;
      const currentPre = lnBtn.closest('pre') as HTMLElement | null;
      const hidden = currentPre ? currentPre.hasAttribute('data-ln-hidden') : false;
      rootEl.querySelectorAll('pre[data-theme]').forEach((pre) => {
        const el = pre as HTMLElement;
        if (hidden) {
          el.removeAttribute('data-ln-hidden');
        } else {
          el.setAttribute('data-ln-hidden', '');
        }
      });
      rootEl.querySelectorAll('.code-ln-btn').forEach((btn) => {
        if (hidden) {
          btn.setAttribute('data-active', '');
        } else {
          btn.removeAttribute('data-active');
        }
      });
      return;
    }

    // Tab switch
    const tab = target.closest('.code-group-tab') as HTMLElement | null;
    if (tab) {
      const bar = tab.closest('.code-group-bar');
      const group = bar?.closest('.code-group');
      if (!group) return;
      const idx = Number(tab.dataset.tabIndex);
      group.querySelectorAll('.code-group-tab').forEach((b) => b.removeAttribute('data-active'));
      tab.setAttribute('data-active', '');
      group.querySelectorAll('pre').forEach((pre) => {
        pre.removeAttribute('data-active');
        if (Number(pre.dataset.tabIndex) === idx) {
          pre.setAttribute('data-active', '');
        }
      });
      return;
    }

    // Fold toggle
    const foldBtn = target.closest('.code-fold-btn') as HTMLElement | null;
    if (foldBtn) {
      const pre = foldBtn.closest('pre') as HTMLElement | null;
      if (!pre) return;
      pre.classList.toggle('code-folded');
      foldBtn.textContent = pre.classList.contains('code-folded') ? '···' : '−';
      return;
    }
  });
});
</script>

<template>
  <div
    ref="rootRef"
    class="markdown-body-root"
    :id="props.id || undefined"
    :data-me-preview-theme="props.theme"
    :data-me-mode="props.mode"
    :data-wrap-code="props.overflowOptions.wrapCode || undefined"
    :data-wrap-tables="props.overflowOptions.wrapTables || undefined"
  >
    <div v-if="!ready" class="markdown-loading">Loading...</div>
    <div v-else ref="markdownBodyRef" class="markdown-body" v-html="html" />
  </div>
</template>

<style scoped>
.markdown-body-root {
  position: relative;
  background: var(--me-bg, transparent);
}

.markdown-loading {
  color: var(--me-text-secondary);
  font-size: 14px;
  padding: 20px 0;
}

.markdown-body {
  font-family: var(--me-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
  font-size: var(--me-font-size, 17px);
  line-height: var(--me-line-height, 1.85);
  color: var(--me-text);
  word-wrap: break-word;
  max-width: var(--me-content-max-width, 100%);
  margin: 0 auto;
  padding: var(--me-content-padding, 24px);
}

/* ── Headings ── */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  color: var(--me-text);
  font-weight: 700;
  line-height: 1.3;
  margin-top: 1.8em;
  margin-bottom: 0.6em;
}

.markdown-body :deep(h1) { font-size: 2em; border-bottom: 1px solid var(--me-border); padding-bottom: 0.3em; }
.markdown-body :deep(h2) { font-size: 1.5em; border-bottom: 1px solid var(--me-border); padding-bottom: 0.25em; }
.markdown-body :deep(h3) { font-size: 1.25em; }
.markdown-body :deep(h4) { font-size: 1.1em; }
.markdown-body :deep(h5) { font-size: 1em; }
.markdown-body :deep(h6) { font-size: 0.9em; color: var(--me-text-secondary); }

/* ── Heading anchors ── */
.markdown-body :deep(.heading-anchor) {
  color: var(--me-primary);
  text-decoration: none;
  opacity: 0;
  transition: opacity 0.15s;
  margin-left: 4px;
  font-size: 0.85em;
  user-select: none;
}

.markdown-body :deep(h1:hover .heading-anchor),
.markdown-body :deep(h2:hover .heading-anchor),
.markdown-body :deep(h3:hover .heading-anchor),
.markdown-body :deep(h4:hover .heading-anchor),
.markdown-body :deep(h5:hover .heading-anchor),
.markdown-body :deep(h6:hover .heading-anchor) {
  opacity: 1;
}

/* ── Paragraphs & Lists ── */
.markdown-body :deep(p) { margin: 0 0 1em; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { margin: 0 0 1em; padding-left: 2em; }
.markdown-body :deep(li) { margin: 0.25em 0; }
.markdown-body :deep(li > p) { margin: 0.25em 0; }

/* ── Task list: remove bullet from items with checkbox ── */
.markdown-body :deep(li:has(input[type="checkbox"])) {
  list-style: none;
  margin-left: -1.5em;
}

.markdown-body :deep(input[type='checkbox']) { margin-right: 6px; }

.markdown-body :deep(input[type='checkbox'].task-checkbox) {
  cursor: pointer;
  accent-color: var(--me-primary);
}

/* ── Inline code ── */
.markdown-body :deep(:where(code:not(figure[data-rehype-pretty-code-figure] code))) {
  background-color: var(--me-bg-code, #f0f0f0);
  color: var(--me-text);
  font-size: 0.85em;
  padding: 0.15em 0.35em;
  border-radius: 4px;
  font-family: 'Space Mono', 'Fira Code', Menlo, Monaco, 'Courier New', Courier, monospace;
  border: 1px solid var(--me-border, #e0e0e0);
}

/* ── ==highlight== marker ── */
.markdown-body :deep(mark) {
  background-color: var(--me-bg-warning, #fff8c5);
  color: var(--me-text, #1f2328);
  padding: 0.1em 0.3em;
  border-radius: 4px;
}

/* ── Front matter metadata table ── */
.markdown-body :deep(table.front-matter-table) {
  width: auto;
  min-width: 40%;
  max-width: 100%;
  font-size: 14px;
  margin-bottom: 1.5em;
}

.markdown-body :deep(table.front-matter-table th) {
  width: 34%;
  background-color: var(--me-bg-soft);
  white-space: nowrap;
}

.markdown-body :deep(table.front-matter-table th),
.markdown-body :deep(table.front-matter-table td) {
  padding: 4px 12px;
}

/* ── Code figure wrapper ── */
/* The shiki code theme owns the block background (keepBackground), so the
   wrapper stays transparent and the <pre> inline background shows through. */
.markdown-body :deep(figure[data-rehype-pretty-code-figure]) {
  margin: 0 0 1em;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--me-border, #e0e0e0);
  background: transparent;
}

/* ── Code blocks ── */
.markdown-body :deep(pre[data-theme]) {
  font-size: 15px;
  line-height: 1.6;
  margin: 0;
  position: relative;
  overflow-x: auto;
  padding-top: 28px;
}

.markdown-body :deep(pre[data-theme] code) {
  display: block;
  padding: 16px 20px;
  overflow-x: auto;
  background: transparent;
  font-size: inherit;
  border-radius: 0;
  background-color: transparent;
}

/* ── Line numbers ── */
.markdown-body :deep(pre[data-theme]) {
  counter-reset: line;
}

.markdown-body :deep(pre[data-theme] [data-line]) {
  display: block;
}

.markdown-body :deep(pre[data-theme] [data-line]::before) {
  content: counter(line);
  counter-increment: line;
  display: inline-block;
  width: 2.2em;
  text-align: right;
  padding-right: 1em;
  color: var(--me-text-muted, #999);
  opacity: 0.5;
  user-select: none;
}

/* ── Hide line numbers when toggled off ── */
.markdown-body :deep(pre[data-ln-hidden] [data-line]::before) {
  display: none;
}

/* ── Language badge ── */
.markdown-body :deep(pre[data-theme][data-language]:not([data-language="plaintext"])::before) {
  content: attr(data-language);
  position: absolute;
  top: 0;
  left: 12px;
  font-size: 11px;
  font-weight: 700;
  color: var(--me-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 28px;
  pointer-events: none;
  user-select: none;
}

/* ── Code title (figcaption) ── */
.markdown-body :deep(figcaption[data-rehype-pretty-code-title]) {
  font-size: 13px;
  font-weight: 600;
  padding: 6px 16px;
  background: var(--me-bg-soft);
  border-bottom: 1px solid var(--me-border);
  color: var(--me-text-secondary);
}

/* ── Line highlight ── */
.markdown-body :deep(pre[data-theme] [data-line][data-highlighted-line]) {
  background-color: var(--me-bg-highlight, rgba(59, 130, 246, 0.15));
  box-shadow: inset 2px 0 0 var(--me-primary);
}

/* ── Diff gutter markers ── */
.markdown-body :deep(pre[data-theme] [data-line] .code-diff-mark) {
  display: inline-block;
  width: 1.3em;
  text-align: center;
  font-weight: 700;
  user-select: none;
}

.markdown-body :deep(pre[data-theme] [data-line] .code-diff-mark[data-diff-mark='add']) {
  color: var(--me-success);
}

.markdown-body :deep(pre[data-theme] [data-line] .code-diff-mark[data-diff-mark='remove']) {
  color: var(--me-danger);
}

/* ── Diff highlight ── */
.markdown-body :deep(pre[data-theme] [data-line][data-diff-add]) {
  background: rgba(34, 197, 94, 0.18);
}

.markdown-body :deep(pre[data-theme] [data-line][data-diff-remove]) {
  background: rgba(239, 68, 68, 0.18);
}

/* ── Code copy button ── */
.markdown-body :deep(.code-copy-btn) {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--me-text-secondary);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
  z-index: 2;
}

.markdown-body :deep(pre:hover .code-copy-btn) {
  opacity: 1;
}

.markdown-body :deep(.code-copy-btn:hover) {
  background: var(--me-border);
  color: var(--me-text);
}

.markdown-body :deep(.code-copy-ok) {
  color: var(--me-success);
  font-weight: 700;
  font-size: 14px;
}

/* ── Line number toggle button ── */
.markdown-body :deep(.code-ln-btn) {
  position: absolute;
  top: 6px;
  right: 38px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--me-text-secondary);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
  z-index: 2;
  font-size: 14px;
  font-weight: 700;
  font-family: serif;
}

.markdown-body :deep(pre:hover .code-ln-btn) {
  opacity: 1;
}

.markdown-body :deep(.code-ln-btn:hover) {
  background: var(--me-border);
  color: var(--me-text);
}

.markdown-body :deep(.code-ln-btn[data-active]) {
  color: var(--me-primary);
  opacity: 1;
}

/* ── Code fold ── */
.markdown-body :deep(.code-fold-btn) {
  position: absolute;
  bottom: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: var(--me-bg-soft);
  color: var(--me-text-secondary);
  cursor: pointer;
  font-size: 14px;
  z-index: 2;
}

.markdown-body :deep(.code-collapsible.code-folded) {
  max-height: 100px;
  overflow: hidden;
  mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
}

/* ── Code group tabs ── */
.markdown-body :deep(.code-group) {
  margin: 0 0 1em;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--me-border);
  background: transparent;
}

.markdown-body :deep(.code-group-bar) {
  display: flex;
  gap: 0;
  background: var(--me-bg-soft);
  border-bottom: 1px solid var(--me-border);
  padding: 0 12px;
  overflow-x: auto;
}

.markdown-body :deep(.code-group-tab) {
  padding: 8px 14px;
  border: none;
  background: transparent;
  color: var(--me-text-secondary);
  font-size: 13px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  white-space: nowrap;
}

.markdown-body :deep(.code-group-tab:hover) {
  color: var(--me-text);
}

.markdown-body :deep(.code-group-tab[data-active]) {
  color: var(--me-primary);
  border-bottom-color: var(--me-primary);
}

.markdown-body :deep(.code-group > pre) {
  border-radius: 0;
  margin: 0;
  border: none;
}

.markdown-body :deep(.code-group > pre:not([data-active])) {
  display: none;
}

/* ── Directives ── */
.markdown-body :deep(.directive) {
  border-radius: 8px;
  padding: 12px 16px;
  margin: 0 0 1em;
  border-left: 4px solid var(--me-border);
  background: var(--me-bg-soft);
}

.markdown-body :deep(.directive-tip) {
  background-color: var(--me-bg-success, #f0fdf4);
  border-color: var(--me-success, #22c55e);
}

.markdown-body :deep(.directive-warning) {
  background-color: var(--me-bg-warning, #fefce8);
  border-color: var(--me-warning, #eab308);
}

.markdown-body :deep(.directive-danger) {
  background-color: var(--me-bg-danger, #fef2f2);
  border-color: var(--me-danger, #ef4444);
}

.markdown-body :deep(.directive-info) {
  background-color: var(--me-bg-info, #eff6ff);
  border-color: var(--me-info, #3b82f6);
}

.markdown-body :deep(details.directive) {
  border-radius: 8px;
  margin: 0 0 1em;
  border: 1px solid var(--me-border);
  overflow: hidden;
  background: var(--me-bg-soft);
}

.markdown-body :deep(details.directive summary) {
  padding: 8px 16px;
  font-weight: 600;
  cursor: pointer;
  background: var(--me-bg-soft);
  border-bottom: 1px solid var(--me-border);
  user-select: none;
}

.markdown-body :deep(details.directive[open] summary) {
  border-bottom: 1px solid var(--me-border);
}

.markdown-body :deep(details.directive > :not(summary)) {
  padding: 12px 16px;
}

/* ── Mermaid ── */
.markdown-body :deep(.mermaid) {
  margin: 0 0 1em;
  text-align: center;
  padding: 16px;
  background: var(--me-bg);
  border-radius: 8px;
  border: 1px solid var(--me-border);
  overflow-x: auto;
}

/* ── Blockquotes ── */
.markdown-body :deep(blockquote) {
  border-left: 4px solid var(--me-primary);
  background-color: var(--me-bg-soft);
  color: var(--me-text-secondary);
  margin: 0 0 1em;
  padding: 12px 20px;
  border-radius: 0 8px 8px 0;
}

.markdown-body :deep(blockquote p:last-child) { margin-bottom: 0; }

/* ── Links ── */
.markdown-body :deep(a) {
  color: var(--me-link);
  text-decoration: none;
}

.markdown-body :deep(a:hover) { text-decoration: underline; }

/* ── Images ── */
.markdown-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  display: block;
  margin: 1em auto;
}

/* ── Tables ── */
.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 1em;
}

.markdown-body :deep(th), .markdown-body :deep(td) {
  border: 1px solid var(--me-border);
  padding: 8px 12px;
  text-align: left;
}

.markdown-body :deep(th) {
  background-color: var(--me-bg-soft);
  font-weight: 600;
}

.markdown-body :deep(tr:nth-child(2n)) {
  background-color: var(--me-bg-soft);
}

/* ── Horizontal rule ── */
.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--me-border);
  margin: 2em 0;
}

/* ── KaTeX ── */
.markdown-body :deep(.katex) { font-size: 1.05em; }

/* ── Overflow options ──
   Opt-in wrapping so wide content fits the container instead of overflowing.
   Disabled by default (code keeps its horizontal scroll, tables keep their
   natural width); consumers opt in via the `overflowOptions` prop. */
.markdown-body-root[data-wrap-code] :deep(pre[data-theme]),
.markdown-body-root[data-wrap-code] :deep(pre[data-theme] code) {
  overflow-x: visible;
}

.markdown-body-root[data-wrap-code] :deep(pre[data-theme] code) {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-all;
}

.markdown-body-root[data-wrap-tables] :deep(table:not(.front-matter-table)) {
  width: 100%;
  table-layout: fixed;
}

.markdown-body-root[data-wrap-tables] :deep(table:not(.front-matter-table) th),
.markdown-body-root[data-wrap-tables] :deep(table:not(.front-matter-table) td) {
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

@media (max-width: 768px) {
  .markdown-body { font-size: 16px; }
}

@media print {
  .markdown-body {
    max-width: none !important;
    padding: 0;
  }
  :deep(pre),
  :deep(table),
  :deep(blockquote),
  :deep(details),
  :deep(.mermaid),
  :deep(figure[data-rehype-pretty-code-figure]) {
    break-inside: avoid;
  }
}

</style>
