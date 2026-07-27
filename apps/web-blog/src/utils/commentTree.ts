import type { CommentNode, CommentVO } from '@/types/community';

export function buildCommentTree(items: CommentVO[]): CommentNode[] {
  const map = new Map<number, CommentNode>();
  const roots: CommentNode[] = [];

  for (const item of items) {
    map.set(item.id, {
      ...item,
      children: [],
    });
  }

  for (const comment of map.values()) {
    if (comment.parentId && map.has(comment.parentId)) {
      map.get(comment.parentId)?.children.push(comment);
    } else {
      roots.push(comment);
    }
  }

  return roots;
}
