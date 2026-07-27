export type SearchType = 'posts' | 'tags' | 'categories' | 'author';

export interface SearchParams {
  q: string;
  types?: SearchType[];
  limit?: number;
  offset?: number;
}

export interface SearchPostItem {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  cover_image: string | null;
  is_pinned: boolean;
  featured_weight: number;
  author_name: string | null;
  author_username: string | null;
  tags: string[];
  categories: string[];
  reading_time: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  updated_at: string;
  published_at: string | null;
}

export interface SearchTagItem {
  id: number;
  name: string;
  slug: string;
  post_count: number;
}

export interface SearchCategoryItem {
  id: number;
  name: string;
  slug: string;
  post_count: number;
}

export interface SearchAuthorItem {
  id: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
  post_count: number;
}

export interface SearchPostsResult {
  list: SearchPostItem[];
  total: number;
}

export interface SearchTagsResult {
  list: SearchTagItem[];
  total: number;
}

export interface SearchCategoriesResult {
  list: SearchCategoryItem[];
  total: number;
}

export interface SearchAuthorsResult {
  list: SearchAuthorItem[];
  total: number;
}

export interface SearchOutput {
  posts: SearchPostsResult;
  tags: SearchTagsResult;
  categories: SearchCategoriesResult;
  author: SearchAuthorsResult;
}
