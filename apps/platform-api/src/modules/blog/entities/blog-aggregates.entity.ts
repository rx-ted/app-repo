import { z } from 'zod';
import { zdb } from '@rx-ted/packages-honest-plugins/db';

export const BlogAggregatesSchema = z.object({
  id: zdb(z.number().int(), { type: 'integer', primaryKey: true, autoIncrement: true }),
  publishedPostCount: zdb(z.number().int(), {
    type: 'integer',
    dbName: 'published_post_count',
    notNull: true,
    default: 0,
  }),
  tagCount: zdb(z.number().int(), { type: 'integer', dbName: 'tag_count', notNull: true, default: 0 }),
  categoryCount: zdb(z.number().int(), {
    type: 'integer',
    dbName: 'category_count',
    notNull: true,
    default: 0,
  }),
  totalViews: zdb(z.number().int(), { type: 'bigint', dbName: 'total_views', notNull: true, default: 0 }),
  totalLikes: zdb(z.number().int(), { type: 'bigint', dbName: 'total_likes', notNull: true, default: 0 }),
  totalComments: zdb(z.number().int(), {
    type: 'bigint',
    dbName: 'total_comments',
    notNull: true,
    default: 0,
  }),
  updatedAt: zdb(z.string(), { type: 'timestamp', dbName: 'updated_at', notNull: true }),
});
