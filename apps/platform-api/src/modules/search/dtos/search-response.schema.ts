import { z } from 'zod';

export const SearchPostItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  cover_image: z.string().nullable(),
  is_pinned: z.boolean(),
  featured_weight: z.number(),
  author_name: z.string().nullable(),
  author_username: z.string().nullable(),
  tags: z.array(z.string()),
  categories: z.array(z.string()),
  reading_time: z.number(),
  view_count: z.number(),
  like_count: z.number(),
  comment_count: z.number(),
  updated_at: z.string(),
  published_at: z.string().nullable(),
});

export const SearchTagItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  post_count: z.number(),
});

export const SearchCategoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  post_count: z.number(),
});

export const SearchAuthorItemSchema = z.object({
  id: z.string(),
  username: z.string(),
  nickname: z.string().nullable(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable(),
  post_count: z.number(),
});

export const SearchResponseDtoSchema = z.object({
  posts: z.object({ list: z.array(SearchPostItemSchema), total: z.number() }),
  tags: z.object({ list: z.array(SearchTagItemSchema), total: z.number() }),
  categories: z.object({ list: z.array(SearchCategoryItemSchema), total: z.number() }),
  author: z.object({ list: z.array(SearchAuthorItemSchema), total: z.number() }),
});

export type SearchPostItem = z.infer<typeof SearchPostItemSchema>;
export type SearchTagItem = z.infer<typeof SearchTagItemSchema>;
export type SearchCategoryItem = z.infer<typeof SearchCategoryItemSchema>;
export type SearchAuthorItem = z.infer<typeof SearchAuthorItemSchema>;
export type SearchResponseDto = z.infer<typeof SearchResponseDtoSchema>;
