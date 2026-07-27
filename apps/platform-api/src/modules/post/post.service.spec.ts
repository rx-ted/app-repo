import { describe, it, expect, vi, beforeEach } from 'vitest';
import PostService from '@/modules/post/post.service';

vi.mock('@/modules/post/mappers/post.mapper', () => ({
  PostMapper: {
    toCardResponse: vi.fn((post) => ({ id: post.id, title: post.title })),
    toDetailResponse: vi.fn((post) => ({
      id: post.id,
      title: post.title,
      contentHtml: post.contentHtml,
    })),
    toMutationResponse: vi.fn((affectedCount) => ({ affectedRows: affectedCount })),
  },
}));

const mockDb = {
  select: vi.fn(),
};

const mockPostRepo = {
  list: vi.fn(),
  findBySlug: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

function createService() {
  return new PostService(mockPostRepo as any, mockDb as any);
}

describe('PostService', () => {
  let service: PostService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createService();
  });

  describe('list', () => {
    it('should call postRepo.list with page and pageSize defaults', async () => {
      mockPostRepo.list.mockResolvedValue({ list: [], total: 0 });

      await service.list();

      expect(mockPostRepo.list).toHaveBeenCalledWith(1, 10, undefined);
    });

    it('should map results through PostMapper.toCardResponse', async () => {
      const fakePosts = [
        { id: '1', title: 'Post 1' },
        { id: '2', title: 'Post 2' },
      ];
      mockPostRepo.list.mockResolvedValue({ list: fakePosts, total: 2 });

      const result = await service.list(1, 10);

      expect(result.list).toHaveLength(2);
      expect(result.list[0]).toEqual({ id: '1', title: 'Post 1' });
      expect(result.list[1]).toEqual({ id: '2', title: 'Post 2' });
    });

    it('should return { list, total }', async () => {
      mockPostRepo.list.mockResolvedValue({ list: [], total: 0 });

      const result = await service.list();

      expect(result).toEqual({ list: [], total: 0 });
    });
  });

  describe('getBySlug', () => {
    it('should return null when post not found', async () => {
      mockPostRepo.findBySlug.mockResolvedValue(null);

      const result = await service.getBySlug('non-existent');

      expect(result).toBeNull();
    });

    it('should return mapped detail response when found', async () => {
      const fakePost = { id: '1', title: 'Test Post', contentHtml: '<p>hello</p>' };
      mockPostRepo.findBySlug.mockResolvedValue(fakePost);

      const result = await service.getBySlug('test-post');

      expect(result).toEqual({ id: '1', title: 'Test Post', contentHtml: '<p>hello</p>' });
    });
  });

  describe('create', () => {
    const baseInput = {
      title: 'Hello World',
      contentMd: 'a'.repeat(2500),
      authorId: 'author-1',
      authorName: 'Author',
      authorUsername: 'author',
      createdBy: 'user-1',
      updatedBy: 'user-1',
    };

    it('should generate slug from title (lowercase + replacing special chars)', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
        }),
      });
      mockPostRepo.create.mockResolvedValue({ id: 1 });

      await service.create({ ...baseInput, title: 'Hello World! How Are You?' });

      expect(mockPostRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'hello-world-how-are-you' }),
      );
    });

    it('should handle duplicate slug by appending timestamp', async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([{ id: 'existing' }]);
      mockDb.select.mockReturnValue({ from: mockFrom, where: mockWhere, limit: mockLimit });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ limit: mockLimit });
      mockPostRepo.create.mockResolvedValue({ id: 1 });

      const before = Date.now();
      await service.create(baseInput);
      const after = Date.now();

      expect(mockPostRepo.create).toHaveBeenCalled();
      const callArgs = mockPostRepo.create.mock.calls[0][0];
      expect(callArgs.slug).toMatch(/^hello-world-\d{13}$/);
      const ts = parseInt(callArgs.slug.replace('hello-world-', ''), 10);
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it('should call postRepo.create with correct shape', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
        }),
      });
      mockPostRepo.create.mockResolvedValue({ id: 1 });

      await service.create(baseInput);

      expect(mockPostRepo.create).toHaveBeenCalledWith({
        title: 'Hello World',
        slug: 'hello-world',
        contentMd: 'a'.repeat(2500),
        authorId: 'author-1',
        authorName: 'Author',
        authorUsername: 'author',
        contentHtml: null,
        coverImage: null,
        isPinned: false,
        featuredWeight: 0,
        status: 'draft',
        visibility: 'public',
        allowComment: true,
        readingTime: 3,
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        publishedAt: null,
        createdBy: 'user-1',
        updatedBy: 'user-1',
      });
    });

    it('should compute readingTime as Math.max(1, ceil(contentMd.length / 1000))', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
        }),
      });
      mockPostRepo.create.mockResolvedValue({ id: 1 });

      await service.create({ ...baseInput, contentMd: 'a'.repeat(500) });

      const callArgs = mockPostRepo.create.mock.calls[0][0];
      expect(callArgs.readingTime).toBe(1);
    });

    it('should set publishedAt for published status', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
        }),
      });
      mockPostRepo.create.mockResolvedValue({ id: 1 });

      await service.create({ ...baseInput, status: 'published' });

      const callArgs = mockPostRepo.create.mock.calls[0][0];
      expect(callArgs.publishedAt).toEqual(expect.any(String));
      expect(new Date(callArgs.publishedAt).toISOString()).toBe(callArgs.publishedAt);
    });
  });

  describe('updateBySlug', () => {
    it('should call postRepo.update and return mapped response', async () => {
      mockPostRepo.update.mockResolvedValue({ slug: 'test-post' });

      const result = await service.updateBySlug('test-post', { title: 'Updated' });

      expect(mockPostRepo.update).toHaveBeenCalledWith('test-post', { title: 'Updated' });
      expect(result).toEqual({ affectedRows: 1 });
    });

    it('should return null when post not found', async () => {
      mockPostRepo.update.mockResolvedValue(null);

      const result = await service.updateBySlug('non-existent', { title: 'Updated' });

      expect(result).toBeNull();
    });
  });
});
