import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ERRORS } from '@/constants';

const httpMock = {
  get: vi.fn(),
};

vi.mock('@/http', () => ({
  http: httpMock,
}));

vi.mock('@/utils/blogView', () => ({
  mapPostDetailVOToArticle: (post: any) => ({
    id: String(post.id),
    slug: post.slug,
    title: post.title,
    content: post.content_md ?? '',
    tags: post.tags ?? [],
    createdAt: post.created_at,
    updatedAt: post.updated_at,
  }),
}));

const mockPostDetail = {
  id: 1,
  slug: 'test-article',
  title: 'Test Article',
  content_md: '# Hello World',
  status: 'published' as const,
  tags: ['vue'],
  created_at: '2024-01-15T00:00:00.000Z',
  updated_at: '2024-01-15T00:00:00.000Z',
};

describe('postDetail store', () => {
  beforeEach(() => {
    vi.resetModules();
    setActivePinia(createPinia());
    httpMock.get.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetchBySlug loads post detail', async () => {
    httpMock.get.mockResolvedValue({
      code: 'OK',
      data: mockPostDetail,
    });

    const { usePostDetailStore } = await import('./postDetail');
    const store = usePostDetailStore();

    await store.fetchBySlug('test-article');

    expect(httpMock.get).toHaveBeenCalledWith('/posts/test-article');
    expect(store.item).not.toBeNull();
    expect(store.item?.title).toBe('Test Article');
    expect(store.item?.content).toBe('# Hello World');
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('fetchBySlug handles empty/null response', async () => {
    httpMock.get.mockResolvedValue({
      code: 'ERROR',
      data: null,
    });

    const { usePostDetailStore } = await import('./postDetail');
    const store = usePostDetailStore();

    await store.fetchBySlug('test-article');

    expect(store.error).toBe(ERRORS.API_RETURNED_EMPTY);
    expect(store.item).toBeNull();
    expect(store.loading).toBe(false);
  });

  it('fetchBySlug handles API failure', async () => {
    httpMock.get.mockRejectedValue(new Error('Not found'));

    const { usePostDetailStore } = await import('./postDetail');
    const store = usePostDetailStore();

    await store.fetchBySlug('missing-post');

    expect(store.error).toBe('Not found');
    expect(store.item).toBeNull();
    expect(store.loading).toBe(false);
  });

  it('fetchBySlug stores content as raw markdown', async () => {
    httpMock.get.mockResolvedValue({
      code: 'OK',
      data: mockPostDetail,
    });

    const { usePostDetailStore } = await import('./postDetail');
    const store = usePostDetailStore();

    await store.fetchBySlug('test-article');

    expect(store.item?.content).toBe('# Hello World');
  });

  it('fetchBySlug handles empty content', async () => {
    httpMock.get.mockResolvedValue({
      code: 'OK',
      data: { ...mockPostDetail, content_md: '' },
    });

    const { usePostDetailStore } = await import('./postDetail');
    const store = usePostDetailStore();

    await store.fetchBySlug('test-article');

    expect(store.item?.content).toBe('');
  });
});
