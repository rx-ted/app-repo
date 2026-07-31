<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import { useThemeStore } from '@/stores/theme';
import { remarkSourceMap } from '@/utils/remarkSourceMap';
import type { SourceNode } from '@/utils/sourcemap';
import {
  hastToString,
  remarkCodeLabel,
  rehypeCaptureCodeMeta,
  rehypeLineHighlight,
  rehypeCodeGroup,
  rehypeRestoreCodeBlocks,
  rehypeDiffMark,
  rehypeNotationDiff,
} from '@/utils/rehypeCodeGroup';

import 'katex/dist/katex.min.css';

const props = defineProps<{
  content: string;
}>();

export interface ReadyPayload {
  nodes: SourceNode[];
  rootEl: HTMLElement;
}

const emit = defineEmits<(e: 'ready', payload: ReadyPayload) => void>();

const html = ref('');
const ready = ref(false);
const themeStore = useThemeStore();
const markdownBodyRef = ref<HTMLElement | null>(null);
const sourceNodes: SourceNode[] = [];

// ── Remark plugin: transform ::directive containers ──
function remarkDirectiveHandler() {
  return (tree: any) => {
    visit(tree, (node: any) => {
      if (
        node.type !== 'containerDirective' &&
        node.type !== 'leafDirective' &&
        node.type !== 'textDirective'
      )
        return;
      if (!node.data) node.data = {};
      const data = node.data;
      if (node.name === 'details') {
        let summaryText = node.label || '';
        if (!summaryText && node.children?.length) {
          const labelIdx = node.children.findIndex((c: any) => c.data?.directiveLabel);
          if (labelIdx !== -1) {
            const labelChild = node.children[labelIdx];
            summaryText = toString(labelChild);
            node.children.splice(labelIdx, 1);
          }
        }
        summaryText =
          summaryText ||
          (typeof node.attributes === 'object' && node.attributes
            ? String(node.attributes.label || node.attributes.title || '')
            : '') ||
          (typeof node.attributes === 'string' ? node.attributes : '');
        data.hName = 'details';
        data.hProperties = { className: ['directive', 'directive-details'] };
        if (summaryText) {
          data.hProperties['data-summary'] = summaryText;
        }
      } else if (node.name) {
        data.hName = node.type === 'textDirective' ? 'span' : 'div';
        data.hProperties = { className: ['directive', `directive-${node.name}`] };
      } else {
        data.hName = 'div';
        data.hProperties = { className: ['directive'] };
      }
    });
  };
}

// ── Rehype plugin: convert ```mermaid to <div class="mermaid"> ──
function rehypeMermaid() {
  return (tree: any) => {
    const queue: Array<{ parent: any; index: number; source: string }> = [];
    visit(tree, 'element', (node: any, index: number, parent: any) => {
      if (node.tagName !== 'pre') return;
      const code = node.children?.find((c: any) => c.tagName === 'code');
      if (!code) return;
      if (!code.properties?.className?.includes('language-mermaid')) return;
      const source =
        code.children?.map((c: any) => (c.type === 'text' ? c.value : '')).join('') || '';
      queue.push({ parent, index, source });
    });
    for (const { parent, index, source } of queue) {
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['mermaid'] },
        children: [{ type: 'text', value: source }],
      };
    }
  };
}

// ── Rehype plugin: convert data-summary → <summary> in <details> ──
function rehypeDetailsHeading() {
  return (tree: any) => {
    const queue: Array<{ node: any; text: string }> = [];
    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'details') return;
      const text = node.properties?.dataSummary;
      if (!text) return;
      queue.push({ node, text: String(text) });
    });
    for (const { node, text } of queue) {
      delete node.properties.dataSummary;
      node.children.unshift({
        type: 'element',
        tagName: 'summary',
        properties: {},
        children: [{ type: 'text', value: text }],
      });
    }
  };
}

// ── Rehype plugin: add data-code (raw source) to code blocks ──
function rehypeCodeData() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'pre') return;
      const code = node.children?.find((c: any) => c.tagName === 'code');
      if (!code) return;
      node.properties['data-code'] = hastToString(code);
    });
  };
}

// ── Build rehype-pretty-code options based on current theme ──
function getPrettyCodeOptions() {
  return {
    theme: themeStore.isDark ? 'github-dark' : 'github-light',
    keepBackground: false,
    defaultLang: 'plaintext',
    filterMetaString(meta: string) {
      return meta
        .replace(/\b(group|tab)=\S+/g, '')
        .replace(/\[([^\]]+)\]/g, '')
        .trim();
    },
  };
}

async function render() {
  try {
    const result = await unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkDirectiveHandler)
      .use(remarkCodeLabel)
      .use(remarkSourceMap, sourceNodes)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeCaptureCodeMeta)
      .use(rehypeRaw)
      .use(rehypeDetailsHeading)
      .use(rehypeMermaid)
      .use(rehypePrettyCode, getPrettyCodeOptions())
      .use(rehypeCodeData)
      .use(rehypeLineHighlight)
      .use(rehypeCodeGroup)
      .use(rehypeRestoreCodeBlocks)
      .use(rehypeDiffMark)
      .use(rehypeNotationDiff)
      .use(rehypeKatex)
      .use(rehypeSlug)
      .use(rehypeAutolinkHeadings, {
        behavior: 'prepend',
        properties: { className: ['heading-anchor'] },
        content: { type: 'text', value: '#' },
      })
      .use(rehypeStringify)
      .process(props.content);
    html.value = String(result);
  } catch (e) {
    console.error('Markdown render error:', e);
    html.value = `<pre style="color:var(--app-error)">${e}</pre>`;
  }
}

onMounted(async () => {
  ready.value = true;
  render();
});

watch(
  () => props.content,
  () => {
    if (ready.value) render();
  },
);

watch(
  () => themeStore.isDark,
  () => {
    if (ready.value) render();
  },
);

// ── Client-side interactions ──
function addCodeInteractions() {
  const root = document.querySelector('.markdown-body');
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
  const root = document.querySelector('.markdown-body');
  if (!root) return;
  const els: Element[] = [...root.querySelectorAll(':scope > .mermaid')];
  if (!els.length) return;
  try {
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({
      startOnLoad: false,
      theme: themeStore.isDark ? 'dark' : 'default',
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
  const root = document.querySelector('.markdown-body-root');
  if (!root) return;

  root.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;

    // Heading anchor → copy permalink + update address bar hash
    const headingAnchor = target.closest('a.heading-anchor') as HTMLElement | null;
    if (headingAnchor) {
      const href = headingAnchor.getAttribute('href');
      if (href?.startsWith('#')) {
        const url = new URL(href, window.location.href).href;
        history.pushState(null, '', href);
        navigator.clipboard
          .writeText(url)
          .then(() => {
            const original = headingAnchor.textContent;
            headingAnchor.textContent = '✓';
            setTimeout(() => {
              headingAnchor.textContent = original;
            }, 1500);
          })
          .catch(() => {});
      }
      e.preventDefault();
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
      const rootEl = document.querySelector('.markdown-body');
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
  <div class="markdown-body-root">
    <div v-if="!ready" class="markdown-loading">Loading...</div>
    <div v-else ref="markdownBodyRef" class="markdown-body" v-html="html" />
  </div>
</template>

<style lang="scss" scoped>
.markdown-body-root {
  position: relative;
}

.markdown-loading {
  color: var(--app-text-secondary);
  font-size: 14px;
  padding: 20px 0;
}

.markdown-body {
  font-size: 17px;
  line-height: 1.85;
  color: var(--app-text);
  word-wrap: break-word;
}

// ── Headings ──
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  color: var(--app-text);
  font-weight: 700;
  line-height: 1.3;
  margin-top: 1.8em;
  margin-bottom: 0.6em;
}

.markdown-body :deep(h1) { font-size: 2em; border-bottom: 1px solid var(--app-border); padding-bottom: 0.3em; }
.markdown-body :deep(h2) { font-size: 1.5em; border-bottom: 1px solid var(--app-border); padding-bottom: 0.25em; }
.markdown-body :deep(h3) { font-size: 1.25em; }
.markdown-body :deep(h4) { font-size: 1.1em; }
.markdown-body :deep(h5) { font-size: 1em; }
.markdown-body :deep(h6) { font-size: 0.9em; color: var(--app-text-secondary); }

// ── Heading anchors ──
.markdown-body :deep(.heading-anchor) {
  color: var(--app-primary);
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

// ── Paragraphs & Lists ──
.markdown-body :deep(p) { margin: 0 0 1em; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { margin: 0 0 1em; padding-left: 2em; }
.markdown-body :deep(li) { margin: 0.25em 0; }
.markdown-body :deep(li > p) { margin: 0.25em 0; }

// ── Task list: remove bullet from items with checkbox ──
.markdown-body :deep(li:has(input[type="checkbox"])) {
  list-style: none;
  margin-left: -1.5em;
}

.markdown-body :deep(input[type='checkbox']) { margin-right: 6px; }

// ── Inline code ──
.markdown-body :deep(code:not(figure[data-rehype-pretty-code-figure] code)) {
  background-color: var(--app-bg-code, #f0f0f0);
  color: var(--app-text);
  font-size: 0.85em;
  padding: 0.15em 0.35em;
  border-radius: 4px;
  font-family: 'Space Mono', 'Fira Code', Menlo, Monaco, 'Courier New', Courier, monospace;
  border: 1px solid var(--app-border, #e0e0e0);
}

// ── Code figure wrapper ──
.markdown-body :deep(figure[data-rehype-pretty-code-figure]) {
  margin: 0 0 1em;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--app-border, #e0e0e0);
  background: var(--app-bg-code);
}

// ── Code blocks ──
.markdown-body :deep(pre[data-theme]) {
  font-size: 14px;
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

// ── Line numbers ──
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
  color: var(--app-text-muted, #999);
  opacity: 0.5;
  user-select: none;
}

// ── Hide line numbers when toggled off ──
.markdown-body :deep(pre[data-ln-hidden] [data-line]::before) {
  display: none;
}

// ── Language badge ──
.markdown-body :deep(pre[data-theme][data-language]:not([data-language="plaintext"])::before) {
  content: attr(data-language);
  position: absolute;
  top: 0;
  left: 12px;
  font-size: 11px;
  font-weight: 700;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 28px;
  pointer-events: none;
  user-select: none;
}

// ── Code title (figcaption) ──
.markdown-body :deep(figcaption[data-rehype-pretty-code-title]) {
  font-size: 13px;
  font-weight: 600;
  padding: 6px 16px;
  background: var(--app-bg-soft);
  border-bottom: 1px solid var(--app-border);
  color: var(--app-text-secondary);
}

// ── Line highlight ──
.markdown-body :deep(pre[data-theme] [data-line][data-highlighted-line]) {
  background-color: var(--app-bg-highlight, rgba(59, 130, 246, 0.15));
  box-shadow: inset 2px 0 0 var(--app-primary);
}

// ── Diff gutter markers ──
.markdown-body :deep(pre[data-theme] [data-line] .code-diff-mark) {
  display: inline-block;
  width: 1.3em;
  text-align: center;
  font-weight: 700;
  user-select: none;
}

.markdown-body :deep(pre[data-theme] [data-line] .code-diff-mark[data-diff-mark='add']) {
  color: var(--app-success);
}

.markdown-body :deep(pre[data-theme] [data-line] .code-diff-mark[data-diff-mark='remove']) {
  color: var(--app-danger);
}

// ── Diff highlight ──
.markdown-body :deep(pre[data-theme] [data-line][data-diff-add]) {
  background: rgba(34, 197, 94, 0.18);
}

.markdown-body :deep(pre[data-theme] [data-line][data-diff-remove]) {
  background: rgba(239, 68, 68, 0.18);
}

// ── Code copy button ──
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
  color: var(--app-text-secondary);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
  z-index: 2;
}

.markdown-body :deep(pre:hover .code-copy-btn) {
  opacity: 1;
}

.markdown-body :deep(.code-copy-btn:hover) {
  background: var(--app-border);
  color: var(--app-text);
}

.markdown-body :deep(.code-copy-ok) {
  color: var(--app-success);
  font-weight: 700;
  font-size: 14px;
}

// ── Line number toggle button ──
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
  color: var(--app-text-secondary);
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
  background: var(--app-border);
  color: var(--app-text);
}

.markdown-body :deep(.code-ln-btn[data-active]) {
  color: var(--app-primary);
  opacity: 1;
}

// ── Code fold ──
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
  background: var(--app-bg-soft);
  color: var(--app-text-secondary);
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

// ── Code group tabs ──
.markdown-body :deep(.code-group) {
  margin: 0 0 1em;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--app-border);
  background: var(--app-bg-code);
}

.markdown-body :deep(.code-group-bar) {
  display: flex;
  gap: 0;
  background: var(--app-bg-soft);
  border-bottom: 1px solid var(--app-border);
  padding: 0 12px;
  overflow-x: auto;
}

.markdown-body :deep(.code-group-tab) {
  padding: 8px 14px;
  border: none;
  background: transparent;
  color: var(--app-text-secondary);
  font-size: 13px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  white-space: nowrap;
}

.markdown-body :deep(.code-group-tab:hover) {
  color: var(--app-text);
}

.markdown-body :deep(.code-group-tab[data-active]) {
  color: var(--app-primary);
  border-bottom-color: var(--app-primary);
}

.markdown-body :deep(.code-group > pre) {
  border-radius: 0;
  margin: 0;
  border: none;
}

.markdown-body :deep(.code-group > pre:not([data-active])) {
  display: none;
}

// ── Directives ──
.markdown-body :deep(.directive) {
  border-radius: 8px;
  padding: 12px 16px;
  margin: 0 0 1em;
  border-left: 4px solid var(--app-border);
  background: var(--app-bg-soft);
}

.markdown-body :deep(.directive-tip) {
  background-color: var(--app-bg-success, #f0fdf4);
  border-color: var(--app-success, #22c55e);
}

.markdown-body :deep(.directive-warning) {
  background-color: var(--app-bg-warning, #fefce8);
  border-color: var(--app-warning, #eab308);
}

.markdown-body :deep(.directive-danger) {
  background-color: var(--app-bg-danger, #fef2f2);
  border-color: var(--app-danger, #ef4444);
}

.markdown-body :deep(.directive-info) {
  background-color: var(--app-bg-info, #eff6ff);
  border-color: var(--app-info, #3b82f6);
}

.markdown-body :deep(details.directive) {
  border-radius: 8px;
  margin: 0 0 1em;
  border: 1px solid var(--app-border);
  overflow: hidden;
  background: var(--app-bg-soft);
}

.markdown-body :deep(details.directive summary) {
  padding: 8px 16px;
  font-weight: 600;
  cursor: pointer;
  background: var(--app-bg-soft);
  border-bottom: 1px solid var(--app-border);
  user-select: none;
}

.markdown-body :deep(details.directive[open] summary) {
  border-bottom: 1px solid var(--app-border);
}

.markdown-body :deep(details.directive > :not(summary)) {
  padding: 12px 16px;
}

// ── Mermaid ──
.markdown-body :deep(.mermaid) {
  margin: 0 0 1em;
  text-align: center;
  padding: 16px;
  background: var(--app-bg);
  border-radius: 8px;
  border: 1px solid var(--app-border);
  overflow-x: auto;
}

// ── Blockquotes ──
.markdown-body :deep(blockquote) {
  border-left: 4px solid var(--app-primary);
  background-color: var(--app-bg-soft);
  color: var(--app-text-secondary);
  margin: 0 0 1em;
  padding: 12px 20px;
  border-radius: 0 8px 8px 0;
}

.markdown-body :deep(blockquote p:last-child) { margin-bottom: 0; }

// ── Links ──
.markdown-body :deep(a) {
  color: var(--app-link);
  text-decoration: none;
}

.markdown-body :deep(a:hover) { text-decoration: underline; }

// ── Images ──
.markdown-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  display: block;
  margin: 1em auto;
}

// ── Tables ──
.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 1em;
}

.markdown-body :deep(th), .markdown-body :deep(td) {
  border: 1px solid var(--app-border);
  padding: 8px 12px;
  text-align: left;
}

.markdown-body :deep(th) {
  background-color: var(--app-bg-soft);
  font-weight: 600;
}

.markdown-body :deep(tr:nth-child(2n)) {
  background-color: var(--app-bg-soft);
}

// ── Horizontal rule ──
.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--app-border);
  margin: 2em 0;
}

// ── KaTeX ──
.markdown-body :deep(.katex) { font-size: 1.05em; }

@media (max-width: 768px) {
  .markdown-body { font-size: 16px; }
}
</style>
