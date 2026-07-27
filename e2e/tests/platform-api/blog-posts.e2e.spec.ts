import { describe, it, expect, vi, beforeEach } from 'vitest';

import BlogController from '@platform-api/modules/blog/blog.controller';
import PostController from '@platform-api/modules/post/post.controller';

describe('E2E: BlogController', () => {
  const mockBlogService = {
    getSummary: vi.fn(),
    getDashboard: vi.fn(),
    getMine: vi.fn(),
    getByUsername: vi.fn(),
  };

  function mockCtx(overrides = {}) {
    return {
      req: { header: vi.fn() },
      json: vi.fn((data: any) => data),
      get: vi.fn(),
      ...overrides,
    } as any;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /blog/summary', () => {
    it('should return blog summary with stats', async () => {
      const controller = new BlogController(mockBlogService as any);
      mockBlogService.getSummary.mockResolvedValue({
        totalPosts: 42,
        totalAuthors: 5,
        totalTags: 20,
        totalViews: 15000,
      });

      const result = await controller.getSummary();
      expect(result.totalPosts).toBe(42);
    });

    it('should return zero stats when blog is empty', async () => {
      const controller = new BlogController(mockBlogService as any);
      mockBlogService.getSummary.mockResolvedValue({
        totalPosts: 0,
        totalAuthors: 0,
        totalTags: 0,
        totalViews: 0,
      });

      const result = await controller.getSummary();
      expect(result.totalPosts).toBe(0);
    });
  });

  describe('GET /blog/dashboard', () => {
    it('should return dashboard data for authenticated user', async () => {
      const controller = new BlogController(mockBlogService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1' });
      mockBlogService.getDashboard.mockResolvedValue({
        recentPosts: [],
        stats: { totalPosts: 10, draftPosts: 3 },
        activity: [],
      });

      const result = await controller.getDashboard(c);
      expect(result.stats.totalPosts).toBe(10);
    });
  });

  describe('GET /blog/authors/:username', () => {
    it('should return author by username', async () => {
      const controller = new BlogController(mockBlogService as any);
      mockBlogService.getByUsername.mockResolvedValue({
        username: 'alice',
        displayName: 'Alice',
        postCount: 15,
      });

      const result = await controller.getAuthorByUsername('alice');
      expect(result.username).toBe('alice');
    });

    it('should throw 404 for non-existent author', async () => {
      const controller = new BlogController(mockBlogService as any);
      mockBlogService.getByUsername.mockRejectedValue(new Error('Author not found'));

      await expect(controller.getAuthorByUsername('nonexistent')).rejects.toThrow(
        'Author not found',
      );
    });
  });

  describe('GET /blog/by-username/:username', () => {
    it('should return blog by username', async () => {
      const controller = new BlogController(mockBlogService as any);
      mockBlogService.getByUsername.mockResolvedValue({
        username: 'alice',
        displayName: 'Alice',
        bio: 'Writer',
      });

      const result = await controller.getByUsername('alice');
      expect(result.displayName).toBe('Alice');
    });
  });
});

describe('E2E: PostController', () => {
  const mockPostService = {
    list: vi.fn(),
    getBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  function mockCtx(overrides = {}) {
    return {
      req: { header: vi.fn(), param: vi.fn() },
      json: vi.fn((data: any) => data),
      get: vi.fn(),
      ...overrides,
    } as any;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /posts', () => {
    it('should return paginated posts', async () => {
      const controller = new PostController(mockPostService as any);
      mockPostService.list.mockResolvedValue({
        items: [{ slug: 'hello-world', title: 'Hello World' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await controller.list();
      expect(result.items).toHaveLength(1);
    });

    it('should return empty list when no posts', async () => {
      const controller = new PostController(mockPostService as any);
      mockPostService.list.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      const result = await controller.list();
      expect(result.items).toHaveLength(0);
    });
  });

  describe('GET /posts/:slug', () => {
    it('should return post by slug', async () => {
      const controller = new PostController(mockPostService as any);
      const c = mockCtx();
      c.req.param = vi.fn().mockReturnValue('hello-world');
      mockPostService.getBySlug.mockResolvedValue({
        slug: 'hello-world',
        title: 'Hello World',
        content: '# Hello',
        author: { username: 'alice' },
      });

      const result = await controller.getBySlug(c);
      expect(result.title).toBe('Hello World');
    });

    it('should throw 404 for non-existent slug', async () => {
      const controller = new PostController(mockPostService as any);
      const c = mockCtx();
      c.req.param = vi.fn().mockReturnValue('non-existent');
      mockPostService.getBySlug.mockRejectedValue(new Error('Post not found'));

      await expect(controller.getBySlug(c)).rejects.toThrow('Post not found');
    });
  });

  describe('POST /posts', () => {
    it('should create a new post', async () => {
      const controller = new PostController(mockPostService as any);
      const user = { userId: 'user-1', username: 'alice' };
      const body = { title: 'New Post', content_md: '# Content', status: 'published' };
      mockPostService.create.mockResolvedValue({ slug: 'new-post', title: 'New Post' });

      const result = await controller.create(body, user);
      expect(result.slug).toBe('new-post');
    });
  });

  describe('PUT /posts/:slug', () => {
    it('should update an existing post', async () => {
      const controller = new PostController(mockPostService as any);
      const user = { userId: 'user-1', username: 'alice' };
      mockPostService.updateBySlug = vi.fn().mockResolvedValue({ affectedRows: 1 });

      const result = await controller.update(
        'hello-world',
        { title: 'Updated', content_md: '# Updated' },
        user,
      );
      expect(result.affectedRows).toBe(1);
    });

    it('should throw 404 when updating non-existent post', async () => {
      const controller = new PostController(mockPostService as any);
      const user = { userId: 'user-1' };
      mockPostService.updateBySlug = vi.fn().mockRejectedValue(new Error('Post not found'));

      await expect(controller.update('non-existent', { title: 'Nope' }, user)).rejects.toThrow(
        'Post not found',
      );
    });
  });
});
