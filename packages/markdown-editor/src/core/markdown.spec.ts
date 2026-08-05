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
  remarkFrontMatter,
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

  it('keeps the shiki background on the pre so the code theme owns the block background', async () => {
    const { pipeline } = buildMarkdownPipeline({ codeTheme: 'github-light' });
    const { value } = await pipeline.process('```js\nconst a = 1;\n```');
    const pre = String(value).match(/<pre[^>]*>/)?.[0] ?? '';
    expect(pre).toContain('background-color');
    expect(pre).toContain('data-theme="github-light"');
  });
});

describe('heading anchors', () => {
  it('renders a level-appropriate # marker for every heading', async () => {
    const md = '# h1\n\n## h2\n\n### h3\n\n###### h6\n';
    const { html } = await renderMarkdown(md, { codeTheme: 'github-light' });
    expect(html).toContain('<a class="heading-anchor" href="#h1">#</a>h1');
    expect(html).toContain('<a class="heading-anchor" href="#h2">##</a>h2');
    expect(html).toContain('<a class="heading-anchor" href="#h3">###</a>h3');
    expect(html).toContain('<a class="heading-anchor" href="#h6">######</a>h6');
  });
});

describe('emoji', () => {
  it('renders gemoji shortcodes into emoji glyphs', async () => {
    const md = ':joy: and :rocket:';
    const { html } = await renderMarkdown(md, { codeTheme: 'github-light' });
    expect(html).toContain('😂');
    expect(html).toContain('🚀');
  });
});

describe('front matter', () => {
  it('renders leading YAML front matter as a table by default', async () => {
    const md = `---
title: Hello World
tags: [a, b]
---

# Real Title

Body.
`;
    const { html, nodes } = await renderMarkdown(md, { codeTheme: 'github-light' });
    expect(html).toContain('front-matter-table');
    expect(html).toContain('<th>title</th>');
    expect(html).toContain('<td>Hello World</td>');
    expect(html).toContain('<h1');
    expect(html).toContain('Real Title');
    expect(html).not.toContain('title: Hello World');
    expect(nodes.some((n) => n.kind === 'heading')).toBe(true);
  });
  it('hides front matter when render is hide', async () => {
    const md = `---
title: Hidden
---

# Real
`;
    const result = await unified()
      .use(remarkParse)
      .use(remarkFrontMatter, { render: 'hide' })
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeStringify)
      .process(md);
    const html = String(result);
    expect(html).not.toContain('Hidden');
    expect(html).toContain('Real');
  });

  it('does not treat a standalone hr as front matter', async () => {
    const md = '---\n\n# Not front matter\n';
    const { html } = await renderMarkdown(md, { codeTheme: 'github-light' });
    expect(html).not.toContain('front-matter-table');
  });

  it('does not create a TOC heading from front-matter fields', async () => {
    const md = `---
title: Not A Heading
---

# Actual Heading
`;
    const { nodes } = await renderMarkdown(md, { codeTheme: 'github-light' });
    const headingTexts = nodes.filter((n) => n.kind === 'heading');
    expect(headingTexts).toHaveLength(1);
  });

  it('does not leak front matter into the preview when YAML has blank lines', async () => {
    const md = `---
title: X

tags: a
---
# Real
`;
    const { html } = await renderMarkdown(md, { codeTheme: 'github-light' });
    expect(html).toContain('front-matter-table');
    expect(html).not.toContain('title: X');
    expect(html).not.toContain('tags: a');
    expect(html).toContain('Real');
  });

  it('does not leak list-style front matter into the preview', async () => {
    const md = `---
title: Y
cover: /a.jpg
tags:
  - alpha
  - beta
---
# Real
`;
    const { html } = await renderMarkdown(md, { codeTheme: 'github-light' });
    expect(html).toContain('front-matter-table');
    expect(html).not.toContain('cover: /a.jpg');
    expect(html).not.toContain('alpha');
    expect(html).toContain('Real');
  });
});

describe('==highlight==', () => {
  it('wraps ==text== in a mark element', async () => {
    const md = 'Some ==important== text and normal text.';
    const { html } = await renderMarkdown(md, { codeTheme: 'github-light' });
    expect(html).toContain('<mark>important</mark>');
    expect(html).toContain('Some <mark>important</mark> text');
  });

  it('does not highlight inside inline code or code blocks', async () => {
    const md = '`==keep==`\n\n```ts\nconst x = "==also keep==";\n```\n';
    const { html } = await renderMarkdown(md, { codeTheme: 'github-light' });
    expect(html).toContain('==keep==');
    expect(html).toContain('==also keep==');
    expect(html).not.toContain('<mark>');
  });

  it('escapes html in the highlighted span', async () => {
    const md = '==a < b & c>==';
    const { html } = await renderMarkdown(md, { codeTheme: 'github-light' });
    expect(html).toContain('<mark>a ');
    expect(html).not.toContain('<mark>a <');
  });
});

describe('interactive task lists', () => {
  it('keeps checkboxes disabled by default', async () => {
    const md = '- [ ] todo\n- [x] done\n';
    const { html } = await renderMarkdown(md, { codeTheme: 'github-light' });
    expect(html).toContain('<input type="checkbox" disabled>');
  });

  it('removes disabled when interactiveTasks is enabled', async () => {
    const md = '- [ ] todo\n- [x] done\n';
    const { html } = await renderMarkdown(md, {
      codeTheme: 'github-light',
      interactiveTasks: true,
    });
    expect(html).not.toContain('disabled');
    expect(html).toContain('class="task-checkbox"');
    expect(html).toContain('<input type="checkbox" checked');
  });
});
