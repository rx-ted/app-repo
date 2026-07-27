import { describe, expect, it } from 'vitest';
import type { CommentThreadVO } from '@/types/commentThread';
import { resolveCommentThreadStatusMessage } from './commentThreadState';

const t = (key: string) =>
  ({
    'comment.thread.authorNotBound': 'author-not-bound',
    'comment.thread.closed': 'closed',
    'comment.thread.pending': 'pending',
  })[key] ?? key;

function createThread(overrides: Partial<CommentThreadVO> = {}): CommentThreadVO {
  return {
    id: 1,
    post_id: 1,
    provider: 'giscus',
    status: 'active',
    sync_status: 'idle',
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
    github_binding_required: false,
    github_connected: false,
    ...overrides,
  };
}

describe('resolveCommentThreadStatusMessage', () => {
  it('should return author-not-bound copy for missing GitHub binding', () => {
    expect(
      resolveCommentThreadStatusMessage(
        createThread({
          last_error: 'Post author has not bound GitHub',
        }),
        t,
      ),
    ).toBe('author-not-bound');
  });

  it('should return closed copy when discussion is closed', () => {
    expect(
      resolveCommentThreadStatusMessage(
        createThread({
          status: 'closed',
        }),
        t,
      ),
    ).toBe('closed');
  });

  it('should surface sync errors directly', () => {
    expect(
      resolveCommentThreadStatusMessage(
        createThread({
          sync_status: 'error',
          last_error: 'GitHub rate limit',
        }),
        t,
      ),
    ).toBe('GitHub rate limit');
  });

  it('should return pending copy while the thread is initializing', () => {
    expect(
      resolveCommentThreadStatusMessage(
        createThread({
          status: 'pending',
        }),
        t,
      ),
    ).toBe('pending');
  });

  it('should return empty string for active ready threads', () => {
    expect(resolveCommentThreadStatusMessage(createThread(), t)).toBe('');
  });
});
