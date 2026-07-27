import type { CommentThreadVO } from '@/types/commentThread';

export function resolveCommentThreadStatusMessage(
  thread: CommentThreadVO | null,
  t: (key: string) => string,
) {
  if (!thread) return '';
  if (thread.last_error === 'Post author has not bound GitHub') {
    return t('comment.thread.authorNotBound');
  }
  if (thread.status === 'closed') return t('comment.thread.closed');
  if (thread.sync_status === 'error' && thread.last_error) {
    return thread.last_error;
  }
  if (thread.status === 'pending') return t('comment.thread.pending');
  return '';
}
