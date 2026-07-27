import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostRepository } from '@/modules/post/repositories/post.repository';
import { DEFAULTS } from '@/constants/defaults';

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

const mockCache = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  deleteByPattern: vi.fn().mockResolvedValue(0),
};

const mockCacheInvalidator = {
  invalidatePostRelated: vi.fn().mockResolvedValue(undefined),
  invalidatePostLists: vi.fn().mockResolvedValue(0),
  invalidatePostSlug: vi.fn().mockResolvedValue(true),
  invalidatePostId: vi.fn().mockResolvedValue(true),
  invalidatePostSlugs: vi.fn().mockResolvedValue(0),
  invalidatePostIds: vi.fn().mockResolvedValue(0),
};

vi.mock('@rx-ted/packages-honest', () => {
  const Inject = () => () => {};
  function chainableCol() {
    const chained: Record<string, any> = {};
    chained.primaryKey = vi.fn(() => chained);
    chained.notNull = vi.fn(() => chained);
    chained.unique = vi.fn(() => chained);
    chained.default = vi.fn(() => chained);
    chained.references = vi.fn(() => chained);
    chained.autoincrement = vi.fn(() => chained);
    return chained;
  }

  const cols = {
    varchar: vi.fn(() => chainableCol()),
    char: vi.fn(() => chainableCol()),
    datetime: vi.fn(() => chainableCol()),
    int: vi.fn(() => chainableCol()),
    bigint: vi.fn(() => chainableCol()),
    mysqlEnum: vi.fn(() => chainableCol()),
    boolean: vi.fn(() => chainableCol()),
    longtext: vi.fn(() => chainableCol()),
    date: vi.fn(() => chainableCol()),
    text: vi.fn(() => chainableCol()),
    serial: vi.fn(() => chainableCol()),
    json: vi.fn(() => chainableCol()),
    double: vi.fn(() => chainableCol()),
    decimal: vi.fn(() => chainableCol()),
    tinyint: vi.fn(() => chainableCol()),
    smallint: vi.fn(() => chainableCol()),
    mediumint: vi.fn(() => chainableCol()),
    real: vi.fn(() => chainableCol()),
    float: vi.fn(() => chainableCol()),
    year: vi.fn(() => chainableCol()),
    time: vi.fn(() => chainableCol()),
    timestamp: vi.fn(() => chainableCol()),
    binary: vi.fn(() => chainableCol()),
    varbinary: vi.fn(() => chainableCol()),
    blob: vi.fn(() => chainableCol()),
    tinyblob: vi.fn(() => chainableCol()),
    mediumblob: vi.fn(() => chainableCol()),
    longblob: vi.fn(() => chainableCol()),
    geometry: vi.fn(() => chainableCol()),
  };

  return {
    Service: () => (target: any) => target,
    Inject: () => () => {},
    DbService: class {},
    mysqlTable: vi.fn(() => ({ $inferSelect: {}, $inferInsert: {} })),
    index: vi.fn(() => ({ on: vi.fn() })),
    primaryKey: vi.fn(() => ({})),
    foreignKey: vi.fn(() => ({})),
    uniqueIndex: vi.fn(() => ({ on: vi.fn() })),
    ...cols,
  };
});

vi.mock('@rx-ted/packages-honest-plugins/cache', () => ({
  CacheService: class {},
  cacheable: vi.fn((_cache: unknown, _key: string, _ttl: number, fn: () => unknown) => fn()),
}));

describe('PostRepository', () => {
  let repo: PostRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new PostRepository(mockDb as any, mockCache as any, mockCacheInvalidator as any);
  });

  describe('list', () => {
    it('should list with defaults (page=1, pageSize from DEFAULTS.PAGE_SIZE)', async () => {
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: 0 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue({
                        offset: vi.fn().mockResolvedValue([]),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        });

      const result = await repo.list(1, DEFAULTS.PAGE_SIZE);

      expect(result).toEqual({ list: [], total: 0 });
    });

    it('should filter by keyword', async () => {
      const mockRow = {
        postCore: {
          id: 1,
          slug: 'test-post',
          title: 'Test Post',
          coverImage: null,
          status: 'published',
          userId: 'user-1',
          isPinned: false,
          featuredWeight: 0,
          visibility: 'public',
          allowComment: true,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z'),
          publishedAt: null,
          deletedAt: null,
          deletedBy: null,
          createdBy: null,
          updatedBy: null,
          passwordHash: null,
        },
        users: { id: 'user-1', username: 'author' },
        postContent: { postId: 1, contentMd: 'x'.repeat(500), contentHtml: null },
        postStats: { postId: 1, viewCount: 10, likeCount: 5, commentCount: 2 },
      };

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: 1 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue({
                        offset: vi.fn().mockResolvedValue([mockRow]),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        });

      const result = await repo.list(1, 10, { keyword: 'test' });

      expect(result.list).toHaveLength(1);
      expect(result.list[0].title).toBe('Test Post');
      expect(result.total).toBe(1);
    });
  });

  describe('findBySlug', () => {
    it('should return null when not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await repo.findBySlug('non-existent');

      expect(result).toBeNull();
    });

    it('should return post when found', async () => {
      const mockRow = {
        postCore: {
          id: 1,
          slug: 'test-post',
          title: 'Test Post',
          coverImage: null,
          status: 'published',
          userId: 'user-1',
          isPinned: false,
          featuredWeight: 0,
          visibility: 'public',
          allowComment: true,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z'),
          publishedAt: null,
          deletedAt: null,
          deletedBy: null,
          createdBy: null,
          updatedBy: null,
          passwordHash: null,
        },
        users: { id: 'user-1', username: 'author' },
        postContent: { postId: 1, contentMd: '# Hello', contentHtml: '<h1>Hello</h1>' },
        postStats: { postId: 1, viewCount: 10, likeCount: 5, commentCount: 2 },
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([mockRow]),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await repo.findBySlug('test-post');

      expect(result).not.toBeNull();
      expect(result!.slug).toBe('test-post');
      expect(result!.title).toBe('Test Post');
    });
  });

  describe('create', () => {
    it('should insert data and return created post', async () => {
      const data = {
        slug: 'new-post',
        title: 'New Post',
        contentMd: '# Hello World',
        contentHtml: null,
        coverImage: null,
        isPinned: false,
        featuredWeight: 0,
        status: 'draft' as const,
        visibility: 'public' as const,
        allowComment: true,
        authorId: 'user-1',
        authorName: 'Author',
        authorUsername: 'author',
        readingTime: 1,
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        publishedAt: null,
        createdBy: 'user-1',
        updatedBy: 'user-1',
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 1 }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([
                      {
                        postCore: {
                          id: 1,
                          slug: 'new-post',
                          title: 'New Post',
                          coverImage: null,
                          status: 'draft',
                          userId: 'user-1',
                          isPinned: false,
                          featuredWeight: 0,
                          visibility: 'public',
                          allowComment: true,
                          createdAt: new Date('2024-01-01T00:00:00.000Z'),
                          updatedAt: new Date('2024-01-01T00:00:00.000Z'),
                          publishedAt: null,
                          deletedAt: null,
                          deletedBy: null,
                          createdBy: 'user-1',
                          updatedBy: 'user-1',
                          passwordHash: null,
                        },
                        users: { id: 'user-1', username: 'author' },
                        postContent: {
                          postId: 1,
                          contentMd: '# Hello World',
                          contentHtml: null,
                        },
                        postStats: { postId: 1, viewCount: 0, likeCount: 0, commentCount: 0 },
                      },
                    ]),
                  }),
                }),
              }),
            }),
          }),
        });

      const result = await repo.create(data);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockCacheInvalidator.invalidatePostRelated).toHaveBeenCalledWith('new-post');
      expect(result).not.toBeNull();
      expect(result.slug).toBe('new-post');
    });
  });

  describe('update', () => {
    it('should modify post by slug', async () => {
      const existingPost = {
        id: 1,
        slug: 'test-post',
        title: 'Old Title',
        coverImage: null,
        status: 'draft',
        userId: 'user-1',
        isPinned: false,
        featuredWeight: 0,
        visibility: 'public',
        allowComment: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        publishedAt: null,
        deletedAt: null,
        deletedBy: null,
        createdBy: null,
        updatedBy: null,
        passwordHash: null,
      };

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([existingPost]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([
                      {
                        postCore: { ...existingPost, title: 'Updated Title' },
                        users: { id: 'user-1', username: 'author' },
                        postContent: { postId: 1, contentMd: '', contentHtml: null },
                        postStats: { postId: 1, viewCount: 0, likeCount: 0, commentCount: 0 },
                      },
                    ]),
                  }),
                }),
              }),
            }),
          }),
        });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await repo.update('test-post', {
        title: 'Updated Title',
        updatedBy: 'user-1',
      });

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockCacheInvalidator.invalidatePostRelated).toHaveBeenCalledWith('test-post');
      expect(result).not.toBeNull();
      expect(result!.title).toBe('Updated Title');
    });
  });
});
