import { z } from 'zod';
import { zdb } from '@rx-ted/packages-honest-plugins/db';

export const PostDiscussionMapSchema = z.object({
  id: zdb(z.number().int(), { type: 'bigint', primaryKey: true, autoIncrement: true }),
  postId: zdb(z.number().int().nullable(), {
    type: 'bigint',
    dbName: 'post_id',
    references: { table: 'postCore', column: 'id', onDelete: 'set null' },
  }),
  postSlug: zdb(z.string().max(128), {
    type: 'varchar',
    length: 128,
    dbName: 'post_slug',
    notNull: true,
  }),
  githubOwner: zdb(z.string().max(100), {
    type: 'varchar',
    length: 100,
    dbName: 'github_owner',
    notNull: true,
  }),
  githubRepo: zdb(z.string().max(100), {
    type: 'varchar',
    length: 100,
    dbName: 'github_repo',
    notNull: true,
  }),
  discussionNumber: zdb(z.number().int(), {
    type: 'integer',
    dbName: 'discussion_number',
    notNull: true,
  }),
  discussionNodeId: zdb(z.string().max(100).nullable(), {
    type: 'varchar',
    length: 100,
    dbName: 'discussion_node_id',
  }),
  discussionUrl: zdb(z.string().max(500).nullable(), {
    type: 'varchar',
    length: 500,
    dbName: 'discussion_url',
  }),
  categorySlug: zdb(z.string().max(100).nullable(), {
    type: 'varchar',
    length: 100,
    dbName: 'category_slug',
  }),
  scope: zdb(z.enum(['post', 'guestbook', 'discover', 'about']), {
    type: 'varchar',
    length: 20,
    notNull: true,
    default: 'post',
  }),
  status: zdb(z.enum(['pending', 'active', 'failed', 'archived']), {
    type: 'varchar',
    length: 20,
    notNull: true,
    default: 'pending',
  }),
  createdAt: zdb(z.string(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  updatedAt: zdb(z.string(), { type: 'timestamp', dbName: 'updated_at', notNull: true }),
});
