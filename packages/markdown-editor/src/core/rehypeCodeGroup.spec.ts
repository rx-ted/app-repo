import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeRaw from 'rehype-raw';
import rehypePrettyCode from 'rehype-pretty-code';
import { visit } from 'unist-util-visit';
import {
  remarkCodeLabel,
  parseLineRanges,
  rehypeCaptureCodeMeta,
  rehypeLineHighlight,
  rehypeCodeGroup,
  rehypeRestoreCodeBlocks,
  rehypeDiffMark,
  rehypeNotationDiff,
} from './rehypeCodeGroup';

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
      if (node.name) {
        node.data.hName = node.type === 'textDirective' ? 'span' : 'div';
        node.data.hProperties = { className: ['directive', `directive-${node.name}`] };
      } else {
        node.data.hName = 'div';
        node.data.hProperties = { className: ['directive'] };
      }
    });
  };
}

function render(md: string) {
  return unified()
    .use(remarkParse)
    .use(remarkDirective)
    .use(remarkDirectiveHandler)
    .use(remarkCodeLabel)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeCaptureCodeMeta)
    .use(rehypeRaw)
    .use(rehypePrettyCode, {
      theme: 'github-light',
      keepBackground: false,
      defaultLang: 'plaintext',
    })
    .use(rehypeLineHighlight)
    .use(rehypeCodeGroup)
    .use(rehypeRestoreCodeBlocks)
    .use(rehypeDiffMark)
    .use(rehypeNotationDiff)
    .use(rehypeStringify)
    .process(md);
}

describe('rehypeCodeGroup', () => {
  it('groups labeled blocks inside :::code-group', async () => {
    const md = `\
:::code-group

\`\`\`sh [pnpm]
pnpm add hono
\`\`\`

\`\`\`sh [npm]
npm install hono
\`\`\`

:::
`;
    const result = await render(md);
    const html = String(result);

    expect(html).toContain('class="code-group"');
    expect(html).toContain('code-group-tab');
    expect(html).toContain('>pnpm<');
    expect(html).toContain('>npm<');
    expect(html).toContain('data-tab-index="0"');
    expect(html).toContain('data-tab-index="1"');
    expect(html).not.toContain('directive-code-group');
    expect(html).not.toContain(':::');
  });

  it('does NOT merge consecutive labeled blocks without a container', async () => {
    const md = `\
\`\`\`js [one]
const a = 1;
\`\`\`

\`\`\`js [two]
const b = 2;
\`\`\`
`;
    const result = await render(md);
    const html = String(result);

    expect(html).not.toContain('code-group');
    expect(html).toContain('data-rehype-pretty-code-title');
    expect(html).toContain('>one<');
    expect(html).toContain('>two<');
    expect(html).toContain('<figcaption');
  });

  it('restores a title on a standalone labeled block', async () => {
    const md = `\
\`\`\`rust [Rust 示例]
fn main() {}
\`\`\`
`;
    const result = await render(md);
    const html = String(result);

    expect(html).toContain('data-rehype-pretty-code-title');
    expect(html).toContain('Rust 示例');
    expect(html).not.toContain('code-group');
  });

  it('marks diff +/- lines and moves the marker to the gutter', async () => {
    const md = `\
\`\`\`diff
- const a = 1;
+ const a = 2;
  const b = 3;
\`\`\`
`;
    const result = await render(md);
    const html = String(result);
    const plain = html.replace(/<[^>]+>/g, '');

    expect(html).toContain('data-diff-remove');
    expect(html).toContain('data-diff-add');
    expect((html.match(/code-diff-mark/g) || []).length).toBe(3);
    expect(plain).not.toContain('+ const');
    expect(plain).not.toContain('- const');
    expect(plain).toContain('const a = 1;');
    expect(plain).toContain('const a = 2;');
    expect(plain).toContain('const b = 3;');
  });

  it('strips // [!code ++] / // [!code --] markers and marks lines', async () => {
    const md = `\
\`\`\`js
const count = 1; // [!code --]
const count = 2; // [!code ++]
const enabled = true;
\`\`\`
`;
    const result = await render(md);
    const html = String(result);
    const plain = html.replace(/<[^>]+>/g, '');

    expect(html).toContain('data-diff-add');
    expect(html).toContain('data-diff-remove');
    expect(html).toContain('code-diff-mark');
    expect(html).not.toContain('!code');
    expect(plain).toContain('const count = 1;');
    expect(plain).toContain('const count = 2;');
  });

  it('supports # and HTML comment notation markers', async () => {
    const md = `\
\`\`\`bash
echo "old" # [!code --]
echo "new" # [!code ++]
\`\`\`

\`\`\`html
<p>old</p> <!-- [!code --] -->
<p>new</p> <!-- [!code ++] -->
\`\`\`
`;
    const result = await render(md);
    const html = String(result);

    expect((html.match(/data-diff-add/g) || []).length).toBe(2);
    expect((html.match(/data-diff-remove/g) || []).length).toBe(2);
    expect((html.match(/code-diff-mark/g) || []).length).toBe(4);
    expect(html).not.toContain('!code');
  });

  it('does NOT touch inline code markers', async () => {
    const md = `\
行内代码 \`// [!code ++]\` 不应被处理。
`;
    const result = await render(md);
    const html = String(result);

    expect(html).not.toContain('data-diff-add');
    expect(html).toContain('// [!code ++]');
  });

  it('parses {1,6,10-20} into line numbers', () => {
    const lines = parseLineRanges('{1,6,10-12}');
    expect([...lines].sort((a, b) => a - b)).toEqual([1, 6, 10, 11, 12]);
    expect(parseLineRanges('{2}').has(2)).toBe(true);
    expect(parseLineRanges('nope').size).toBe(0);
  });

  it('highlights {1,3-4} lines in a standalone block', async () => {
    const md = `\
\`\`\`js {1,3-4}
const a = 1;
const b = 2;
const c = 3;
const d = 4;
\`\`\`
`;
    const result = await render(md);
    const html = String(result);

    expect(html).toContain('data-highlighted-line');
    expect((html.match(/data-highlighted-line/g) || []).length).toBe(3);
    expect(html).not.toContain('code-group');
  });

  it('keeps line highlights inside :::code-group', async () => {
    const md = `\
:::code-group

\`\`\`js [one] {1,3}
const a = 1;
const b = 2;
const c = 3;
\`\`\`

\`\`\`js [two] {2}
const x = 1;
const y = 2;
const z = 3;
\`\`\`

:::
`;
    const result = await render(md);
    const html = String(result);

    expect(html).toContain('class="code-group"');
    expect(html).toContain('data-highlighted-line');
    expect((html.match(/data-highlighted-line/g) || []).length).toBe(3);
  });
});
