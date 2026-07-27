import type { OramaPostDocument } from '@/config/search';
import { http } from '@/http';
import type { ApiResponse } from '@/http/types';
import type { BlogPostCardVO } from '@/types/blog';
import { ERRORS } from '@/constants';

type SearchResultPayload = {
  list: BlogPostCardVO[];
  total: number;
};

export class SearchUnavailableError extends Error {
  constructor(message = ERRORS.SEARCH_UNAVAILABLE) {
    super(message);
    this.name = 'SearchUnavailableError';
  }
}

function toCardView(document: OramaPostDocument): BlogPostCardVO {
  return {
    id: Number(document.post_id ?? 0) || 0,
    slug: document.slug,
    title: document.title,
    excerpt: document.excerpt,
    cover_image: document.cover_image || null,
    is_pinned: document.is_pinned,
    featured_weight: document.featured_weight,
    tags: document.tags ?? [],
    categories: document.categories ?? [],
    author_name: document.author_name || null,
    author_username: document.author_username || null,
    view_count: Number(document.view_count ?? 0),
    like_count: Number(document.like_count ?? 0),
    comment_count: Number(document.comment_count ?? 0),
    reading_time: Number(document.reading_time ?? 0),
    updated_at: document.updated_at,
    published_at: document.published_at || null,
  };
}

export async function searchPosts(
  keyword: string,
  page: number,
  pageSize: number,
): Promise<SearchResultPayload> {
  const term = keyword.trim();
  if (!term) {
    return { list: [], total: 0 };
  }

  try {
    const result = await http.get<
      ApiResponse<{
        posts: { list: OramaPostDocument[]; total: number };
      }>
    >('/search', {
      query: {
        q: term,
        type: 'posts',
        limit: pageSize,
        offset: (page - 1) * pageSize,
      },
    });

    return {
      list: result.data.posts.list.map((item) => toCardView(item)),
      total: result.data.posts.total,
    };
  } catch (error) {
    if (error instanceof SearchUnavailableError) {
      throw error;
    }

    const cause = error as Error & { body?: unknown; status?: number };
    const apiMessage =
      cause.body &&
      typeof cause.body === 'object' &&
      'message' in cause.body &&
      typeof cause.body.message === 'string'
        ? cause.body.message
        : '';
    const message = apiMessage || cause.message || ERRORS.SEARCH_UNAVAILABLE;

    throw new SearchUnavailableError(message);
  }
}
