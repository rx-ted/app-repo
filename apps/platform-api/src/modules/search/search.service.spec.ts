import { describe, it, expect, vi, beforeEach } from 'vitest';
import SearchService from '@/modules/search/search.service';

const mockDb = {
  select: vi.fn(),
};

const mockCache = {
  get: vi.fn(),
  set: vi.fn(),
};

function createService() {
  return new SearchService(mockDb as any, mockCache as any);
}

function mockChain(resolvedValue: any) {
  const thenable = {
    then: (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject),
  };

  const offsetResult = { ...thenable };
  const limitResult = { ...thenable, offset: vi.fn(() => offsetResult) };
  const orderByResult = { ...thenable, limit: vi.fn(() => limitResult) };
  const terminalWhere = {
    ...thenable,
    orderBy: vi.fn(() => orderByResult),
    limit: vi.fn(() => limitResult),
  };

  const chain: Record<string, any> = {};
  chain.from = vi.fn(() => chain);
  chain.leftJoin = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.where = vi.fn(() => terminalWhere);
  chain.orderBy = vi.fn(() => orderByResult);
  chain.limit = vi.fn(() => limitResult);
  chain.offset = vi.fn(() => offsetResult);

  return { from: chain.from };
}

function makePostRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    postCore: {
      id: i + 1,
      slug: `post-${i + 1}`,
      title: `Post ${i + 1}`,
      coverImage: null,
      isPinned: false,
      featuredWeight: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: new Date(),
      userId: 1,
    },
    users: { username: 'author1' },
    postContent: { contentMd: `this is post ${i + 1} content with keyword` },
    postStats: { viewCount: 10, likeCount: 5, commentCount: 2 },
  }));
}

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createService();
  });

  it('should use cache if available', async () => {
    const cachedResult = {
      posts: { list: [{ id: '1', title: 'Cached' }], total: 1 },
      tags: { list: [], total: 0 },
      categories: { list: [], total: 0 },
      author: { list: [], total: 0 },
    };
    mockCache.get.mockResolvedValue(cachedResult);

    const result = await service.search({ q: 'test' });

    expect(mockCache.get).toHaveBeenCalledWith('search:test:posts:10:0');
    expect(mockDb.select).not.toHaveBeenCalled();
    expect(mockCache.set).not.toHaveBeenCalled();
    expect(result).toEqual(cachedResult);
  });

  it('should query repos when not cached', async () => {
    mockCache.get.mockResolvedValue(null);
    mockDb.select.mockReturnValueOnce(mockChain([{ total: 0 }])).mockReturnValueOnce(mockChain([]));

    const result = await service.search({ q: 'test' });

    expect(mockCache.get).toHaveBeenCalled();
    expect(mockDb.select).toHaveBeenCalled();
    expect(mockCache.set).toHaveBeenCalledWith(
      expect.stringContaining('search:test:posts:10:0'),
      expect.any(Object),
      60,
    );
    expect(result.posts).toEqual({ list: [], total: 0 });
  });

  it('should handle empty results', async () => {
    mockCache.get.mockResolvedValue(null);
    mockDb.select.mockReturnValueOnce(mockChain([{ total: 0 }])).mockReturnValueOnce(mockChain([]));

    const result = await service.search({ q: 'nothing' });

    expect(result).toEqual({
      posts: { list: [], total: 0 },
      tags: { list: [], total: 0 },
      categories: { list: [], total: 0 },
      author: { list: [], total: 0 },
    });
  });

  it('should filter by types parameter', async () => {
    mockCache.get.mockResolvedValue(null);
    mockDb.select.mockReturnValueOnce(mockChain([{ total: 2 }])).mockReturnValueOnce(
      mockChain([
        { id: 1, name: 'javascript', slug: 'javascript', usageCount: 10 },
        { id: 2, name: 'typescript', slug: 'typescript', usageCount: 5 },
      ]),
    );

    const result = await service.search({ q: 'script', types: ['tags'] });

    expect(result.posts).toEqual({ list: [], total: 0 });
    expect(result.categories).toEqual({ list: [], total: 0 });
    expect(result.author).toEqual({ list: [], total: 0 });
    expect(result.tags.list).toHaveLength(2);
    expect(result.tags.list[0].name).toBe('javascript');
    expect(result.tags.total).toBe(2);
  });

  it('should pass pagination limit and offset to queries', async () => {
    mockCache.get.mockResolvedValue(null);
    mockDb.select
      .mockReturnValueOnce(mockChain([{ total: 20 }]))
      .mockReturnValueOnce(mockChain(makePostRows(5)))
      .mockReturnValueOnce(mockChain([]))
      .mockReturnValueOnce(mockChain([]));

    await service.search({ q: 'test', limit: 5, offset: 10 });

    expect(mockCache.get).toHaveBeenCalledWith('search:test:posts:5:10');
  });

  it('should generate excerpt using DEFAULTS constants', async () => {
    mockCache.get.mockResolvedValue(null);

    const contentMd = `${'A'.repeat(50)}needle${'B'.repeat(200)}`;
    const rows = [
      {
        postCore: {
          id: 1,
          slug: 'test',
          title: 'Test Post',
          coverImage: null,
          isPinned: false,
          featuredWeight: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: new Date(),
          userId: 1,
        },
        users: { username: 'author1' },
        postContent: { contentMd },
        postStats: { viewCount: 10, likeCount: 5, commentCount: 2 },
      },
    ];

    mockDb.select
      .mockReturnValueOnce(mockChain([{ total: 1 }]))
      .mockReturnValueOnce(mockChain(rows))
      .mockReturnValueOnce(mockChain([]))
      .mockReturnValueOnce(mockChain([]));

    const result = await service.search({ q: 'needle' });

    const excerpt = result.posts.list[0].excerpt;
    expect(excerpt).toContain('needle');
    expect(excerpt).toMatch(/^…/);
    expect(excerpt).toMatch(/…$/);
  });
});
