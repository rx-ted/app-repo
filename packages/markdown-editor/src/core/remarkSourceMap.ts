import { visit } from 'unist-util-visit';
import type { SourceNode, NodeKind } from './sourcemap';

const BLOCK_KINDS = new Map<string, NodeKind>([
  ['paragraph', 'paragraph'],
  ['heading', 'heading'],
  ['code', 'code'],
  ['blockquote', 'blockquote'],
  ['list', 'list'],
  ['listItem', 'listItem'],
  ['table', 'table'],
  ['thematicBreak', 'thematicBreak'],
  ['containerDirective', 'containerDirective'],
  ['leafDirective', 'leafDirective'],
  ['html', 'html'],
  ['math', 'math'],
]);

export function remarkSourceMap(nodes: SourceNode[]) {
  return (tree: any) => {
    nodes.length = 0;
    let nextId = 1;
    const headingStack: number[] = [];

    visit(tree, (node: any) => {
      const kind = BLOCK_KINDS.get(node.type);
      if (!kind) return;
      if (!node.position?.start?.line) return;

      const id = nextId++;

      let parentId: number | undefined;
      let childDepth: number | undefined;

      if (kind === 'heading' && node.depth) {
        const depth = node.depth;
        while (headingStack.length > 0) {
          const lastId = headingStack[headingStack.length - 1];
          const lastNode = nodes.find((n) => n.id === lastId);
          if (lastNode && lastNode.depth != null && lastNode.depth < depth) {
            parentId = lastId;
            break;
          }
          headingStack.pop();
        }
        headingStack.push(id);
        childDepth = depth;
      } else if (headingStack.length > 0) {
        parentId = headingStack[headingStack.length - 1];
      }

      const entry: SourceNode = {
        id,
        kind,
        startLine: node.position.start.line,
        endLine: node.position.end.line,
        startOffset: node.position.start.offset,
        endOffset: node.position.end.offset,
        parentId,
      };
      if (childDepth != null) entry.depth = childDepth;

      const parent =
        typeof parentId === 'number' ? nodes.find((n) => n.id === parentId) : undefined;
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(id);
      }

      nodes.push(entry);

      if (!node.data) node.data = {};
      const data = node.data;
      data.hProperties = {
        ...data.hProperties,
        'data-node': id,
      };
    });
  };
}
