import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeRaw from 'rehype-raw';
import {
  buildMarkdownPipeline,
  renderMarkdown,
  remarkDirectiveHandler,
  rehypeDetailsHeading,
} from './markdown';

describe('directives', () => {
  it('parses :::details with summary label', async () => {
    const md = `:::details[详情]\n内容\n:::`;
    const result = await unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkDirectiveHandler)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeDetailsHeading)
      .use(rehypeStringify)
      .process(md);

    const html = String(result);
    expect(html).toContain('<details');
    expect(html).toContain('<summary>');
    expect(html).toContain('详情');
    expect(html).toContain('内容');
    expect(html).toContain('</details>');
  });

  it('parses :::details with attributes label', async () => {
    const md = `:::details{label="More info"}\n内容\n:::`;
    const result = await unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkDirectiveHandler)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeDetailsHeading)
      .use(rehypeStringify)
      .process(md);

    const html = String(result);
    expect(html).toContain('<summary>');
    expect(html).toContain('More info');
    expect(html).toContain('内容');
  });

  it('nested via HTML details + inner directive', async () => {
    const md =
      '<details class="directive directive-details">\n<summary>详情</summary>\n\n内容1\n\n:::warning\n警告内容\n:::\n</details>';
    const result = await unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkDirectiveHandler)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeDetailsHeading)
      .use(rehypeStringify)
      .process(md);

    const html = String(result);
    expect(html).toContain('<details');
    expect(html).toContain('<summary>');
    expect(html).toContain('directive-warning');
    expect(html).toContain('警告内容');
    expect(html).not.toContain(':::');
  });

  it('parses :::tip container', async () => {
    const md = `\
:::tip
提示内容
:::
`;
    const result = await unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkDirectiveHandler)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeDetailsHeading)
      .use(rehypeStringify)
      .process(md);

    const html = String(result);
    expect(html).toContain('directive-tip');
    expect(html).toContain('提示内容');
    expect(html).not.toContain(':::');
  });

  it('parses multiple adjacent directives', async () => {
    const md = `\
:::tip
提示一
:::

:::warning
警告一
:::

:::danger
危险一
:::
`;
    const result = await unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkDirectiveHandler)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeDetailsHeading)
      .use(rehypeStringify)
      .process(md);

    const html = String(result);
    expect(html).toContain('directive-tip');
    expect(html).toContain('directive-warning');
    expect(html).toContain('directive-danger');
    expect(html).toContain('提示一');
    expect(html).toContain('警告一');
    expect(html).toContain('危险一');
    expect(html).not.toContain(':::');
  });
});

describe('markdown pipeline', () => {
  it('renderMarkdown returns html and source nodes', async () => {
    const md = '# Title\n\nSome paragraph with **bold**.\n\n```ts\nconst a = 1;\n```\n';
    const { html, nodes } = await renderMarkdown(md, { codeTheme: 'github-light' });
    expect(html).toContain('<h1');
    expect(html).toContain('<strong>');
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.some((n) => n.kind === 'heading')).toBe(true);
    expect(nodes.some((n) => n.kind === 'code')).toBe(true);
  });

  it('buildMarkdownPipeline can be used standalone and re-renders into the same nodes array', async () => {
    const md = 'one\n\ntwo\n';
    const { pipeline, sourceNodes } = buildMarkdownPipeline({ sourceMap: true });
    await pipeline.process(md);
    const first = sourceNodes.length;
    expect(first).toBeGreaterThan(0);
    await pipeline.process('# another\n');
    expect(sourceNodes.length).toBeGreaterThan(0);
    expect(sourceNodes[0].startLine).toBe(1);
  });

  it('buildMarkdownPipeline with sourceMap disabled produces no nodes', async () => {
    const md = '# Title\n';
    const { pipeline, sourceNodes } = buildMarkdownPipeline({ sourceMap: false });
    await pipeline.process(md);
    expect(sourceNodes.length).toBe(0);
  });
});
