export type NodeKind =
  | 'heading'
  | 'paragraph'
  | 'code'
  | 'blockquote'
  | 'list'
  | 'listItem'
  | 'table'
  | 'thematicBreak'
  | 'containerDirective'
  | 'leafDirective'
  | 'html'
  | 'math';

export interface SourceNode {
  id: number;
  kind: NodeKind;
  startLine: number;
  endLine: number;
  startOffset: number;
  endOffset: number;
  depth?: number;
  parentId?: number;
  children?: number[];
}

function binarySearch<T>(arr: T[], value: number, getKey: (item: T) => number): number {
  let lo = 0,
    hi = arr.length - 1,
    idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (getKey(arr[mid]) <= value) {
      idx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return idx;
}

function narrowest<T>(
  arr: T[],
  fromIdx: number,
  line: number,
  getStart: (x: T) => number,
  getEnd: (x: T) => number,
): T | undefined {
  for (let i = fromIdx; i >= 0; i--) {
    if (getEnd(arr[i]) >= line) return arr[i];
  }
  return undefined;
}

export class MarkdownIndex {
  readonly nodes = new Map<number, SourceNode>();
  readonly lines: SourceNode[];
  readonly offsets: SourceNode[];

  constructor(sourceNodes: SourceNode[]) {
    for (const n of sourceNodes) {
      this.nodes.set(n.id, n);
    }
    this.lines = [...sourceNodes].sort((a, b) => {
      const d = a.startLine - b.startLine;
      if (d !== 0) return d;
      return a.endLine - a.startLine - (b.endLine - b.startLine);
    });
    this.offsets = [...sourceNodes].sort((a, b) => {
      const d = a.startOffset - b.startOffset;
      if (d !== 0) return d;
      return a.endOffset - a.startOffset - (b.endOffset - b.startOffset);
    });
  }

  findByLine(line: number): SourceNode | undefined {
    const idx = binarySearch(this.lines, line, (x) => x.startLine);
    if (idx === -1) return undefined;
    return narrowest(
      this.lines,
      idx,
      line,
      (x) => x.startLine,
      (x) => x.endLine,
    );
  }

  findByOffset(offset: number): SourceNode | undefined {
    const idx = binarySearch(this.offsets, offset, (x) => x.startOffset);
    if (idx === -1) return undefined;
    return narrowest(
      this.offsets,
      idx,
      offset,
      (x) => x.startOffset,
      (x) => x.endOffset,
    );
  }

  findByNodeId(id: number): SourceNode | undefined {
    return this.nodes.get(id);
  }
}

export interface HeadingNode {
  id: number;
  depth: number;
  parentId?: number;
  children: number[];
}

export class HeadingTree {
  readonly byId = new Map<number, HeadingNode>();
  readonly roots: HeadingNode[] = [];
  readonly all: HeadingNode[] = [];

  constructor(nodes: SourceNode[]) {
    const headings = nodes
      .filter((n) => n.kind === 'heading' && n.depth != null)
      .sort((a, b) => a.startLine - b.startLine);

    const stack: HeadingNode[] = [];
    for (const h of headings) {
      const hn: HeadingNode = { id: h.id, depth: h.depth!, children: [] };
      while (stack.length > 0 && stack[stack.length - 1].depth >= hn.depth) {
        stack.pop();
      }
      if (stack.length > 0) {
        hn.parentId = stack[stack.length - 1].id;
        stack[stack.length - 1].children.push(hn.id);
      } else {
        this.roots.push(hn);
      }
      stack.push(hn);
      this.byId.set(hn.id, hn);
      this.all.push(hn);
    }
  }

  getById(id: number): HeadingNode | undefined {
    return this.byId.get(id);
  }

  getPath(id: number): HeadingNode[] {
    const path: HeadingNode[] = [];
    let current = this.byId.get(id);
    while (current) {
      path.unshift(current);
      current = current.parentId ? this.byId.get(current.parentId) : undefined;
    }
    return path;
  }
}
