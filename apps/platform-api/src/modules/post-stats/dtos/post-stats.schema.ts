import { z } from 'zod';

export const PostStatsParamsSchema = z.object({
  postId: z.string(),
});

export const PostStatsResponseSchema = z.object({
  post_id: z.string(),
  view_count: z.number(),
  like_count: z.number(),
  comment_count: z.number(),
  updated_at: z.string(),
});

export type PostStatsParams = z.infer<typeof PostStatsParamsSchema>;
export type PostStatsResponseDto = z.infer<typeof PostStatsResponseSchema>;
