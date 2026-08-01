import { visit } from 'unist-util-visit';

export function hastToString(node: any): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element' && node.children) return node.children.map(hastToString).join('');
  return '';
}

// ── Remark plugin: convert [label] to title="" for rehype-pretty-code ──
export function remarkCodeLabel() {
  return (tree: any) => {
    visit(tree, 'code', (node: any) => {
      if (!node.meta) return;
      node.meta = node.meta.replace(/\[([^\]]+)\]/g, 'title="$1"');
    });
  };
}

export function parseLineRanges(spec: string): Set<number> {
  const result = new Set<number>();
  for (const group of spec.match(/\{([0-9,\-\s]+)\}/g) || []) {
    for (const part of group.replace(/[{}]/g, '').split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const range = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) {
        const start = Number(range[1]);
        const end = Number(range[2]);
        for (let i = start; i <= end; i++) result.add(i);
      } else if (/^\d+$/.test(trimmed)) {
        result.add(Number(trimmed));
      }
    }
  }
  return result;
}

export function getCodeLabelProp(node: any): string | undefined {
  return node.properties?.['data-code-label'] ?? node.properties?.dataCodeLabel;
}

export function getCodeLinesProp(node: any): string | undefined {
  return node.properties?.['data-code-lines'] ?? node.properties?.dataCodeLines;
}

// ── Rehype plugin: capture code meta (label + line ranges) before rehypeRaw ──
// rehypeRaw strips code.data, so anything we need later (labels, {1,3} line
// highlights) must be copied onto the wrapper <div> before it runs.
export function rehypeCaptureCodeMeta() {
  return (tree: any) => {
    const queue: Array<{ parent: any; index: number | undefined; wrapper: any }> = [];
    visit(tree, 'element', (node: any, index: number | undefined, parent: any) => {
      if (node.tagName !== 'pre') return;
      const code = node.children?.find((c: any) => c.tagName === 'code');
      if (!code) return;
      const meta: string = code.properties?.meta || code.data?.meta || '';
      const labelMatch = meta.match(/title="([^"]+)"/);
      const linesMatch = meta.match(/\{([0-9,\-\s]+)\}/);
      if (!labelMatch && !linesMatch) return;
      if (!parent) return;
      queue.push({
        parent,
        index,
        wrapper: {
          type: 'element',
          tagName: 'div',
          properties: {
            ...(labelMatch ? { 'data-code-label': labelMatch[1] } : {}),
            ...(linesMatch ? { 'data-code-lines': linesMatch[0] } : {}),
          },
          children: [node],
        },
      });
    });
    for (const { parent, index, wrapper } of queue) {
      if (index == null) continue;
      parent.children[index] = wrapper;
    }
  };
}

export function getLabel(node: any): string | null {
  if (node.type === 'element' && node.tagName === 'div') {
    const label = getCodeLabelProp(node);
    if (label !== undefined) return String(label);
  }
  const title = node.children?.find(
    (c: any) => c.properties?.['data-rehype-pretty-code-title'] !== undefined,
  );
  return title ? hastToString(title) : null;
}

export function getPre(node: any): any {
  const isWrapped =
    node.tagName === 'div' &&
    (getCodeLabelProp(node) !== undefined || getCodeLinesProp(node) !== undefined);
  if (isWrapped) {
    const figure = node.children?.find((c: any) => c.tagName === 'figure');
    if (figure) return figure.children?.find((c: any) => c.tagName === 'pre');
    return node.children?.find((c: any) => c.tagName === 'pre');
  }
  return node.children?.find((c: any) => c.tagName === 'pre');
}

export function buildCodeGroup(tabs: Array<{ label: string; index: number; pre: any }>) {
  return {
    type: 'element',
    tagName: 'div',
    properties: { className: ['code-group'] },
    children: [
      {
        type: 'element',
        tagName: 'div',
        properties: { className: ['code-group-bar'] },
        children: tabs.map((t) => ({
          type: 'element',
          tagName: 'button',
          properties: {
            className: ['code-group-tab'],
            'data-tab-index': String(t.index),
            ...(t.index === 0 ? { 'data-active': '' } : {}),
          },
          children: [{ type: 'text', value: t.label }],
        })),
      },
      ...tabs.map((t) => {
        const pre = { ...t.pre };
        pre.properties = {
          ...pre.properties,
          'data-tab-index': String(t.index),
          ...(t.index === 0 ? { 'data-active': '' } : {}),
        };
        return pre;
      }),
    ],
  };
}

// ── Rehype plugin: highlight {1,6,10-20} lines after pretty-code ──
// Runs before rehypeCodeGroup so grouped blocks keep their highlighted lines.
export function rehypeLineHighlight() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'div') return;
      const spec = getCodeLinesProp(node);
      if (spec === undefined) return;
      const lines = parseLineRanges(String(spec));
      if (!lines.size) return;
      const pre = getPre(node);
      if (!pre) return;
      const code = pre.children?.find((c: any) => c.tagName === 'code');
      if (!code) return;
      let num = 0;
      for (const child of code.children || []) {
        if (child.type !== 'element' || child.properties?.['data-line'] === undefined) continue;
        num++;
        if (lines.has(num)) child.properties['data-highlighted-line'] = '';
      }
    });
  };
}

// ── Rehype plugin: group labeled code blocks inside :::code-group directive ──
// Only explicit :::code-group containers group blocks. Consecutive labeled
// blocks without a container are NOT merged.
export function rehypeCodeGroup() {
  return (tree: any) => {
    const queue: Array<{ parent: any; index: number | undefined; group: any }> = [];

    function isLabeled(node: any): boolean {
      return (
        (node.type === 'element' &&
          node.tagName === 'figure' &&
          node.properties?.['data-rehype-pretty-code-figure'] !== undefined) ||
        (node.type === 'element' && node.tagName === 'div' && getCodeLabelProp(node) !== undefined)
      );
    }

    visit(tree, 'element', (node: any, index: number | undefined, parent: any) => {
      const isCodeGroupDir =
        node.type === 'element' &&
        node.tagName === 'div' &&
        Array.isArray(node.properties?.className) &&
        node.properties.className.includes('directive-code-group');

      if (!isCodeGroupDir || !parent) return;

      const codeBlocks = (node.children || []).filter(isLabeled);
      if (codeBlocks.length > 0) {
        const tabs = codeBlocks.map((fig: any, j: number) => ({
          label: getLabel(fig) || 'Code',
          index: j,
          pre: getPre(fig),
        }));
        queue.push({ parent, index, group: buildCodeGroup(tabs) });
      }
    });

    for (const { parent, index, group } of queue) {
      if (index == null) continue;
      parent.children[index] = group;
    }
  };
}

// ── Rehype plugin: unwrap standalone labeled / line-highlighted code blocks ──
// rehypeRaw strips the meta before rehype-pretty-code can emit a figcaption,
// so restore the title on labeled blocks that were not consumed by a code-group.
// Also unwraps blocks that only carried a {1,3} line-range spec.
export function rehypeRestoreCodeBlocks() {
  return (tree: any) => {
    const queue: Array<{ parent: any; index: number | undefined; figure: any }> = [];

    visit(tree, 'element', (node: any, index: number | undefined, parent: any) => {
      if (node.tagName !== 'div') return;
      const label = getCodeLabelProp(node);
      const lines = getCodeLinesProp(node);
      if (label === undefined && lines === undefined) return;

      const figure = node.children?.find((c: any) => c.tagName === 'figure');
      const pre = node.children?.find((c: any) => c.tagName === 'pre');
      const target = figure || pre;
      if (!target || !parent) return;

      if (figure) {
        const hasCaption = figure.children?.some(
          (c: any) => c.properties?.['data-rehype-pretty-code-title'] !== undefined,
        );
        if (!hasCaption && label !== undefined) {
          figure.children.unshift({
            type: 'element',
            tagName: 'figcaption',
            properties: { 'data-rehype-pretty-code-title': '' },
            children: [{ type: 'text', value: String(label) }],
          });
        }
      }
      queue.push({ parent, index, figure: target });
    });

    for (const { parent, index, figure } of queue) {
      if (index == null) continue;
      parent.children[index] = figure;
    }
  };
}

// ── VitePress-style trailing markers: // [!code ++] / // [!code --] ──
// The markers live in the code content (not meta), so they survive rehypeRaw.
// They are stripped from the output and the line gets data-diff-add/remove.
const NOTATION_MARKERS: Array<{ pattern: RegExp; type: 'add' | 'remove' }> = [
  { pattern: /\/\/ \[!code --\]\s*$/, type: 'remove' },
  { pattern: /\/\/ \[!code \+\+\]\s*$/, type: 'add' },
  { pattern: /# \[!code --\]\s*$/, type: 'remove' },
  { pattern: /# \[!code \+\+\]\s*$/, type: 'add' },
  { pattern: /\/\* \[!code --\] \*\/\s*$/, type: 'remove' },
  { pattern: /\/\* \[!code \+\+\] \*\/\s*$/, type: 'add' },
  { pattern: /<!-- \[!code --\] -->\s*$/, type: 'remove' },
  { pattern: /<!-- \[!code \+\+\] -->\s*$/, type: 'add' },
];

function collectTextNodes(node: any): any[] {
  const nodes: any[] = [];
  const walk = (el: any) => {
    for (const child of el.children || []) {
      if (child.type === 'text') nodes.push(child);
      else if (child.type === 'element') walk(child);
    }
  };
  walk(node);
  return nodes;
}

function stripTrailing(node: any, length: number) {
  const nodes = collectTextNodes(node);
  let remaining = length;
  for (let i = nodes.length - 1; i >= 0 && remaining > 0; i--) {
    const n = nodes[i];
    const take = Math.min(n.value.length, remaining);
    n.value = n.value.slice(0, n.value.length - take);
    remaining -= take;
  }
}

function stripLeading(node: any, length: number) {
  const nodes = collectTextNodes(node);
  let remaining = length;
  for (let i = 0; i < nodes.length && remaining > 0; i++) {
    const n = nodes[i];
    const take = Math.min(n.value.length, remaining);
    n.value = n.value.slice(take);
    remaining -= take;
  }
}

// A fixed-width gutter column injected on EVERY line of a diff/notation block,
// so the code column stays aligned vertically across marked and context lines.
function markerSpan(type: 'add' | 'remove' | 'context') {
  return {
    type: 'element',
    tagName: 'span',
    properties: {
      className: ['code-diff-mark'],
      ...(type !== 'context' ? { 'data-diff-mark': type } : {}),
    },
    children: type !== 'context' ? [{ type: 'text', value: type === 'add' ? '+' : '-' }] : [],
  };
}

// Mark a diff line: add data-diff-add/remove and inject a +/- gutter marker
// that sits between the line number and the code.
function markDiffLine(line: any, type: 'add' | 'remove') {
  line.properties[type === 'add' ? 'data-diff-add' : 'data-diff-remove'] = '';
  line.children.unshift(markerSpan(type));
}

function markContextLine(line: any) {
  line.children.unshift(markerSpan('context'));
}

// ── Rehype plugin: mark diff +/- lines for gutter + background highlighting ──
// The +/- prefix is stripped from the code text; the marker is re-added in the
// gutter via markDiffLine(). Every line gets a gutter column so code aligns.
export function rehypeDiffMark() {
  return (tree: any) => {
    visit(tree, 'element', (node: any, _index: number | undefined, parent: any) => {
      if (node.tagName !== 'code') return;
      if (parent?.tagName !== 'pre') return;
      const lang = node.properties?.['data-language'] ?? node.properties?.dataLanguage;
      if (lang !== 'diff') return;

      (node.children || []).forEach((line: any) => {
        if (line.type !== 'element' || line.properties?.['data-line'] === undefined) return;
        const text = hastToString(line);
        if (text.startsWith('+') || text.startsWith('-')) {
          const marker = text.startsWith('+') ? 'add' : 'remove';
          stripLeading(line, text.length > 1 && text[1] === ' ' ? 2 : 1);
          markDiffLine(line, marker);
        } else {
          if (text.startsWith(' ')) stripLeading(line, 1);
          markContextLine(line);
        }
      });
    });
  };
}

export function rehypeNotationDiff() {
  return (tree: any) => {
    visit(tree, 'element', (node: any, _index: number | undefined, parent: any) => {
      if (node.tagName !== 'code') return;
      if (parent?.tagName !== 'pre') return;

      (node.children || []).forEach((line: any) => {
        if (line.type !== 'element' || line.properties?.['data-line'] === undefined) return;
        const hasMarker = (line.children || []).some(
          (child: any) =>
            child.type === 'element' && child.properties?.className?.includes('code-diff-mark'),
        );
        if (hasMarker) return;
        const text = hastToString(line);
        let matched = false;
        for (const { pattern, type } of NOTATION_MARKERS) {
          const match = text.match(pattern);
          if (match) {
            stripTrailing(line, match[0].length);
            markDiffLine(line, type);
            matched = true;
            break;
          }
        }
        if (!matched) markContextLine(line);
      });
    });
  };
}
