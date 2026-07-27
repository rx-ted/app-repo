import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { API } from '@/constants';

const httpMock = {
  get: vi.fn(),
};

vi.mock('@/http', () => ({
  http: httpMock,
}));

vi.mock('@/utils/blogView', () => ({
  mapPostCardVOToArticle: (post: any) => ({
    id: String(post.id),
    title: post.title,
    slug: post.slug,
    tags: post.tags ?? [],
    categories: post.categories ?? [],
    views: Number(post.view_count ?? 0),
    likes: Number(post.like_count ?? 0),
    createdAt: post.updated_at,
  }),
}));

vi.mock('@/composables/useStorage', () => ({
  useStorage: () => ({
    get: vi.fn(() => 'card'),
    set: vi.fn(),
    remove: vi.fn(),
  }),
}));

const mockPostCard = {
  id: 1,
  slug: 'test-post',
  title: 'Test Post',
  tags: ['vue'],
  updated_at: '2024-01-01T00:00:00.000Z',
};

const mockHomeResponse = {
  data: {
    hero: {
      title: 'Test Blog',
      description: 'A test blog',
      stats: {
        posts: 10,
        tags: 5,
        categories: 3,
        totalViews: 1000,
        totalLikes: 500,
        totalComments: 200,
        runtime: '2 years',
      },
    },
    featured: [mockPostCard],
    latest: [{ ...mockPostCard, id: 2, slug: 'latest-post', title: 'Latest Post' }],
    pinned: [{ ...mockPostCard, id: 3, slug: 'pinned-post', title: 'Pinned Post' }],
    trendingTags: [
      { name: 'vue', postCount: 5 },
      { name: 'react', postCount: 3 },
    ],
  },
};

describe('blog store', () => {
  beforeEach(() => {
    vi.resetModules();
    setActivePinia(createPinia());
    httpMock.get.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetchHome loads and sets summary data', async () => {
    httpMock.get.mockResolvedValue(mockHomeResponse);

    const { useBlogStore } = await import('./blog');
    const store = useBlogStore();

    await store.fetchHome();

    expect(httpMock.get).toHaveBeenCalledWith(API.BLOG_SUMMARY);
    expect(store.hero).toEqual(mockHomeResponse.data.hero);
    expect(store.featured).toEqual(mockHomeResponse.data.featured);
    expect(store.latest).toEqual(mockHomeResponse.data.latest);
    expect(store.pinned).toEqual(mockHomeResponse.data.pinned);
    expect(store.trendingTags).toEqual(mockHomeResponse.data.trendingTags);
    expect(store.loading).toBe(false);
    expect(store.error).toBe('');
  });

  it('fetchHome silently falls back on API failure', async () => {
    httpMock.get.mockRejectedValue(new Error('Network error'));

    const { useBlogStore } = await import('./blog');
    const store = useBlogStore();

    await store.fetchHome();

    expect(store.error).toBe('');
    expect(store.loading).toBe(false);
    expect(store.hero).toBeNull();
  });

  it('fetchHome silently falls back for non-Error causes', async () => {
    httpMock.get.mockRejectedValue('string error');

    const { useBlogStore } = await import('./blog');
    const store = useBlogStore();

    await store.fetchHome();

    expect(store.error).toBe('');
    expect(store.loading).toBe(false);
  });

  it('computed stats reflect hero.stats after fetchHome', async () => {
    httpMock.get.mockResolvedValue(mockHomeResponse);

    const { useBlogStore } = await import('./blog');
    const store = useBlogStore();

    expect(store.totalPosts).toBe(0);
    expect(store.totalViews).toBe(0);
    expect(store.totalLikes).toBe(0);
    expect(store.totalComments).toBe(0);
    expect(store.tagsCount).toBe(0);
    expect(store.categoriesCount).toBe(0);

    await store.fetchHome();

    expect(store.totalPosts).toBe(10);
    expect(store.totalViews).toBe(1000);
    expect(store.totalLikes).toBe(500);
    expect(store.totalComments).toBe(200);
    expect(store.tagsCount).toBe(5);
    expect(store.categoriesCount).toBe(3);
  });

  it('trendingTags are objects with name and postCount', async () => {
    httpMock.get.mockResolvedValue(mockHomeResponse);

    const { useBlogStore } = await import('./blog');
    const store = useBlogStore();

    await store.fetchHome();

    expect(store.trendingTags).toEqual([
      { name: 'vue', postCount: 5 },
      { name: 'react', postCount: 3 },
    ]);
  });

  it('fetchPage loads paginated posts list', async () => {
    const pageResponse = {
      code: 'OK',
      data: {
        list: [
          { id: 10, slug: 'page-post', title: 'Page Post', updated_at: '2024-02-01T00:00:00.000Z' },
        ],
        total: 1,
      },
    };
    httpMock.get.mockResolvedValue(pageResponse);

    const { useBlogStore } = await import('./blog');
    const store = useBlogStore();

    await store.fetchPage(1);

    expect(httpMock.get).toHaveBeenCalledWith(
      API.POSTS_LIST,
      expect.objectContaining({
        query: expect.objectContaining({ page: 1 }),
      }),
    );
    expect(store.items.length).toBe(1);
    expect(store.items[0].title).toBe('Page Post');
    expect(store.total).toBe(1);
    expect(store.articlesLoading).toBe(false);
    expect(store.articlesError).toBeNull();
  });

  it('fetchPage handles API error gracefully', async () => {
    httpMock.get.mockRejectedValue(new Error('Network error'));

    const { useBlogStore } = await import('./blog');
    const store = useBlogStore();

    await store.fetchPage(1);

    expect(store.items).toEqual([]);
    expect(store.total).toBe(0);
    expect(store.articlesError).toBeNull();
  });
});
