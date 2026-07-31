import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import { toString } from 'mdast-util-to-string';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeRaw from 'rehype-raw';
import { visit } from 'unist-util-visit';

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

function rehypeDetailsHeading() {
  return (tree: any) => {
    const queue: Array<{ node: any; text: string }> = [];
    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'details') return;
      // remark-rehype camelCases hProperties: data-summary → dataSummary
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
    expect(html).not.toContain(':::');
  });

  it('nested via HTML details + inner directive', async () => {
    // remark-directive@4 limitation: consecutive ::: close fences don't nest
    // Workaround: use HTML <details> with rehype-raw, inner ::: directives work
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
