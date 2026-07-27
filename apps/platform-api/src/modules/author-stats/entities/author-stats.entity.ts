import { z } from 'zod';
import { zdb } from '@rx-ted/packages-honest-plugins/db';

export const AuthorStatsSchema = z.object({
  userId: zdb(z.string().length(36), {
    type: 'char',
    length: 36,
    dbName: 'user_id',
    primaryKey: true,
    references: { table: 'users', column: 'id', onDelete: 'cascade' },
  }),
  viewCount: zdb(z.number().nullable(), { type: 'bigint', dbName: 'view_count', default: 0 }),
  likeCount: zdb(z.number().nullable(), { type: 'bigint', dbName: 'like_count', default: 0 }),
  commentCount: zdb(z.number().nullable(), { type: 'bigint', dbName: 'comment_count', default: 0 }),
});

// ==================== Entity Interfaces ====================

export const AuthorTagSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  postCount: z.number(),
});

export const AuthorCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  postCount: z.number(),
});

export const AuthorStatsEntitySchema = z.object({
  user_id: z.string(),
  post_count: z.number(),
  view_count: z.number(),
  like_count: z.number(),
  comment_count: z.number(),
  tags: z.array(AuthorTagSchema),
  categories: z.array(AuthorCategorySchema),
  last_updated: z.string(),
});

export interface AuthorStatsEntity {
  user_id: string;
  post_count: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
    postCount: number;
  }>;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    postCount: number;
  }>;
  last_updated: string;
}
