import { unified } from 'unified';
import type { PluggableList } from 'unified';
import type { Options as PrettyCodeOptions, Theme } from 'rehype-pretty-code';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkEmoji from 'remark-emoji';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import type { SourceNode } from './sourcemap';
import { remarkSourceMap } from './remarkSourceMap';
import {
  hastToString,
  rehypeCaptureCodeMeta,
  rehypeCodeGroup,
  rehypeDiffMark,
  rehypeLineHighlight,
  rehypeNotationDiff,
  rehypeRestoreCodeBlocks,
  remarkCodeLabel,
} from './rehypeCodeGroup';

export interface MarkdownPipelineOptions {
  sourceMap?: boolean;
  codeTheme?: string;
  interactiveTasks?: boolean;
}

function headingDepthFromTag(tag: string): number {
  const match = /^h([1-6])$/.exec(tag);
  return match ? Number(match[1]) : 1;
}

// ── Rehype plugin: make GFM task checkboxes clickable (remove `disabled`) ──
export function rehypeInteractiveTasks() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'input') return;
      if (node.properties?.type !== 'checkbox') return;
      delete node.properties.disabled;
      node.properties.className = ['task-checkbox'];
    });
  };
}

// ── Remark plugin: transform ::directive containers ──
export function remarkDirectiveHandler() {
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
export function rehypeMermaid() {
  return (tree: any) => {
    const queue: Array<{ parent: any; index: number | undefined; source: string }> = [];
    visit(tree, 'element', (node: any, index: number | undefined, parent: any) => {
      if (node.tagName !== 'pre') return;
      const code = node.children?.find((c: any) => c.tagName === 'code');
      if (!code) return;
      if (!code.properties?.className?.includes('language-mermaid')) return;
      const source =
        code.children?.map((c: any) => (c.type === 'text' ? c.value : '')).join('') || '';
      queue.push({ parent, index, source });
    });
    for (const { parent, index, source } of queue) {
      if (index == null) continue;
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['mermaid'] },
        children: [{ type: 'text', value: source }],
      };
    }
  };
}

// ── Remark plugin: turn leading YAML front matter into a table (or drop it) ──
export interface RemarkFrontMatterOptions {
  render?: 'hide' | 'table';
}

export function remarkFrontMatter(options: RemarkFrontMatterOptions = {}) {
  const { render = 'table' } = options;
  return (tree: any, file: any) => {
    const source = String(file);
    if (!source.startsWith('---\n')) return;
    const end = source.indexOf('\n---\n', 4);
    if (end === -1) return;
    const yaml = source.slice(4, end);

    const root = tree as any;
    // Drop every node that falls inside the front-matter block by source
    // offset. remark parses YAML into different shapes (setext heading, list,
    // paragraph with blank lines, …), so shape-based removal leaks the raw
    // front matter into the preview next to the rendered table.
    const frontMatterEnd = end + 5;
    root.children = (root.children ?? []).filter(
      (node: any) => (node.position?.start?.offset ?? -1) >= frontMatterEnd,
    );

    if (render !== 'table') return;
    const rows = yaml
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (!rows.length) return;

    const cells = rows
      .filter((row) => row.includes(':'))
      .map((row) => {
        const colon = row.indexOf(':');
        if (colon === -1) return { key: row, value: '' };
        return { key: row.slice(0, colon).trim(), value: row.slice(colon + 1).trim() };
      });

    const tableHtml =
      `<table class="front-matter-table"><tbody>` +
      cells
        .map(
          ({ key, value }) => `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`,
        )
        .join('') +
      `</tbody></table>`;

    root.children.unshift({ type: 'html', value: tableHtml });
  };
}

// ── Remark plugin: convert ==text== spans into <mark> ──
const MARK_PATTERN = /==([^=\n]+?)==/g;

export function remarkHighlight() {
  return (tree: any) => {
    visit(tree, 'text', (node: any, index: number | undefined, parent: any) => {
      if (!parent || !node.value?.includes('==')) return;
      if (parent.type === 'inlineCode' || parent.type === 'code') return;
      const parts: any[] = [];
      let last = 0;
      const matches = [...node.value.matchAll(MARK_PATTERN)];
      for (const match of matches) {
        if (match.index > last) {
          parts.push({ type: 'text', value: node.value.slice(last, match.index) });
        }
        parts.push({
          type: 'html',
          value: `<mark>${escapeHtml(match[1])}</mark>`,
        });
        last = match.index + match[0].length;
      }
      if (last < node.value.length) parts.push({ type: 'text', value: node.value.slice(last) });
      if (parts.length && index != null && parent.children) {
        parent.children.splice(index, 1, ...parts);
      }
    });
  };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Rehype plugin: convert data-summary → <summary> in <details> ──
export function rehypeDetailsHeading() {
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
export function rehypeCodeData() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'pre') return;
      const code = node.children?.find((c: any) => c.tagName === 'code');
      if (!code) return;
      node.properties['data-code'] = hastToString(code);
    });
  };
}

// ── Build rehype-pretty-code options for a given shiki code theme ──
export function getPrettyCodeOptions(codeTheme: string): PrettyCodeOptions {
  return {
    theme: codeTheme as Theme,
    keepBackground: true,
    defaultLang: 'plaintext',
    filterMetaString(meta: string) {
      return meta
        .replace(/\b(group|tab)=\S+/g, '')
        .replace(/\[([^\]]+)\]/g, '')
        .trim();
    },
  };
}

// ── Build the shared remark→rehype pipeline ──
export function buildMarkdownPipeline(options: MarkdownPipelineOptions = {}) {
  const { sourceMap = true, codeTheme = 'github-light', interactiveTasks = false } = options;
  const sourceNodes: SourceNode[] = [];

  const sourceMapPlugins: PluggableList = sourceMap ? [[remarkSourceMap, sourceNodes]] : [];
  const interactivePlugins: PluggableList = interactiveTasks ? [[rehypeInteractiveTasks, {}]] : [];

  return {
    pipeline: unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkDirectiveHandler)
      .use(remarkFrontMatter)
      .use(remarkCodeLabel)
      .use(sourceMapPlugins)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkEmoji)
      .use(remarkHighlight)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeCaptureCodeMeta)
      .use(rehypeRaw)
      .use(rehypeDetailsHeading)
      .use(rehypeMermaid)
      .use(rehypePrettyCode, getPrettyCodeOptions(codeTheme))
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
        content: (node: any) => ({
          type: 'text',
          value: '#'.repeat(headingDepthFromTag(node.tagName)),
        }),
      })
      .use(interactivePlugins)
      .use(rehypeStringify),
    sourceNodes,
  };
}

export interface MarkdownRenderResult {
  html: string;
  nodes: SourceNode[];
}

export async function renderMarkdown(
  md: string,
  options: MarkdownPipelineOptions = {},
): Promise<MarkdownRenderResult> {
  const { pipeline, sourceNodes } = buildMarkdownPipeline(options);
  const result = await pipeline.process(md);
  return { html: String(result), nodes: sourceNodes };
}
