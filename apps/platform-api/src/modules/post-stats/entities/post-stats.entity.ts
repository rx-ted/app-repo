import { z } from 'zod';

export const PostStatsEntitySchema = z.object({
  post_id: z.string(),
  view_count: z.number(),
  like_count: z.number(),
  comment_count: z.number(),
  updated_at: z.string(),
});

export interface PostStatsEntity {
  post_id: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  updated_at: string;
}
