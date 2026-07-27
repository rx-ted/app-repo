import { describe, it, expect, vi, beforeEach } from 'vitest';

import CommentController from '@platform-api/modules/comment/comment.controller';

describe('E2E: CommentController', () => {
  const mockCommentService = {
    page: vi.fn(),
    replyPage: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    toggleLike: vi.fn(),
    getLikedCommentIds: vi.fn(),
    createReport: vi.fn(),
    listReports: vi.fn(),
    resolveReport: vi.fn(),
  };

  function mockCtx(overrides = {}) {
    return {
      req: { header: vi.fn(), param: vi.fn() },
      json: vi.fn((data: any) => data),
      body: vi.fn(),
      get: vi.fn(),
      ...overrides,
    } as any;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /comments/page', () => {
    it('should return paginated top-level comments', async () => {
      const controller = new CommentController(mockCommentService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1' });
      mockCommentService.page.mockResolvedValue({
        items: [{ id: 'c1', content: 'Great post!', author: { username: 'alice' } }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await controller.page({ postId: '1' }, c);
      expect(result.items).toHaveLength(1);
    });

    it('should return empty list when no comments', async () => {
      const controller = new CommentController(mockCommentService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1' });
      mockCommentService.page.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const result = await controller.page({ postId: '1' }, c);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('GET /comments/replyPage', () => {
    it('should return paginated replies', async () => {
      const controller = new CommentController(mockCommentService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1' });
      mockCommentService.replyPage.mockResolvedValue({
        items: [{ id: 'r1', content: 'I agree!', author: { username: 'charlie' } }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await controller.replyPage({ parentId: '1' }, c);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('GET /comments', () => {
    it('should list all comments', async () => {
      const controller = new CommentController(mockCommentService as any);
      mockCommentService.list.mockResolvedValue([{ id: 'c1', content: 'Comment 1' }]);

      const result = await controller.list();
      expect(result).toHaveLength(1);
    });
  });

  describe('POST /comments', () => {
    it('should create a comment', async () => {
      const controller = new CommentController(mockCommentService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1' });
      mockCommentService.create.mockResolvedValue({ id: 'c3', content: 'Nice!' });

      const result = await controller.create({ postId: '1', content: 'Nice!' }, c);
      expect(result.content).toBe('Nice!');
    });

  });

  describe('PUT /comments/:id', () => {
    it('should update own comment', async () => {
      const controller = new CommentController(mockCommentService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1' });
      mockCommentService.update.mockResolvedValue({ id: 'c1', content: 'Updated' });

      const result = await controller.update('c1', { content: 'Updated' }, c);
      expect(result.content).toBe('Updated');
    });

    it('should throw when non-owner tries to update', async () => {
      const controller = new CommentController(mockCommentService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-2' });
      mockCommentService.update.mockRejectedValue(new Error('Forbidden'));

      await expect(controller.update('c1', { content: 'Hacked' }, c)).rejects.toThrow('Forbidden');
    });
  });

  describe('DELETE /comments/:id', () => {
    it('should delete own comment', async () => {
      const controller = new CommentController(mockCommentService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1' });
      mockCommentService.delete.mockResolvedValue({ success: true });

      const result = await controller.delete('c1', c);
      expect(result.success).toBe(true);
    });

    it('should throw when non-owner tries to delete', async () => {
      const controller = new CommentController(mockCommentService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-2' });
      mockCommentService.delete.mockRejectedValue(new Error('Forbidden'));

      await expect(controller.delete('c1', c)).rejects.toThrow('Forbidden');
    });
  });

  describe('POST /comments/:id/like', () => {
    it('should toggle like on a comment', async () => {
      const controller = new CommentController(mockCommentService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1' });
      mockCommentService.toggleLike.mockResolvedValue({ liked: true, likeCount: 5 });

      const result = await controller.toggleLike('1', c);
      expect(result.liked).toBe(true);
    });

    it('should throw for unauthenticated user', async () => {
      const controller = new CommentController(mockCommentService as any);
      const c = mockCtx();
      c.get.mockReturnValue(undefined);

      await expect(controller.toggleLike('1', c)).rejects.toThrow();
    });
  });

  describe('POST /comments/:id/report', () => {
    it('should report a comment', async () => {
      const controller = new CommentController(mockCommentService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1' });
      mockCommentService.createReport.mockResolvedValue({ success: true });

      const result = await controller.report('1', { reason: 'spam' }, c);
      expect(result.success).toBe(true);
    });

    it('should throw for unauthenticated user', async () => {
      const controller = new CommentController(mockCommentService as any);
      const c = mockCtx();
      c.get.mockReturnValue(undefined);

      await expect(controller.report('1', { reason: 'spam' }, c)).rejects.toThrow();
    });
  });
});
