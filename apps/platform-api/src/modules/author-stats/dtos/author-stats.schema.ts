import { z } from 'zod';

export const AuthorStatsQuerySchema = z.object({
  userId: z.string(),
});

export const AuthorTagItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  postCount: z.number(),
});

export const AuthorCategoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  postCount: z.number(),
});

export const AuthorStatsResponseSchema = z.object({
  user_id: z.string(),
  post_count: z.number(),
  view_count: z.number(),
  like_count: z.number(),
  comment_count: z.number(),
  tags: z.array(AuthorTagItemSchema),
  categories: z.array(AuthorCategoryItemSchema),
  last_updated: z.string(),
});

export type AuthorStatsQuery = z.infer<typeof AuthorStatsQuerySchema>;
export type AuthorTagItem = z.infer<typeof AuthorTagItemSchema>;
export type AuthorCategoryItem = z.infer<typeof AuthorCategoryItemSchema>;
export type AuthorStatsResponseDto = z.infer<typeof AuthorStatsResponseSchema>;
