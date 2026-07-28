import { z } from 'zod';
import { zdb } from '@rx-ted/packages-honest-plugins/db';

// ==================== Zod-Centric Schema Definitions ====================

export const PostCoreSchema = z.object({
  id: zdb(z.number().int(), { type: 'bigint', primaryKey: true, autoIncrement: true }),
  userId: zdb(z.string().length(36), {
    type: 'char',
    length: 36,
    dbName: 'user_id',
    notNull: true,
    references: { table: 'users', column: 'id' },
  }),
  slug: zdb(z.string().max(128), { type: 'varchar', length: 128, notNull: true, unique: true }),
  title: zdb(z.string().max(255), { type: 'varchar', length: 255, notNull: true }),
  coverImage: zdb(z.string().max(1024).nullable(), {
    type: 'varchar',
    length: 1024,
    dbName: 'cover_image',
  }),
  isPinned: zdb(z.boolean(), { type: 'boolean', dbName: 'is_pinned', default: false }),
  featuredWeight: zdb(z.number().int(), { type: 'integer', dbName: 'featured_weight', default: 0 }),
  readingTime: zdb(z.number().int(), { type: 'integer', dbName: 'reading_time', default: 1 }),
  status: zdb(z.enum(['draft', 'published', 'archived']), {
    type: 'enum',
    values: ['draft', 'published', 'archived'],
    default: 'draft',
  }),
  visibility: zdb(z.enum(['public', 'private', 'password']), {
    type: 'enum',
    values: ['public', 'private', 'password'],
    default: 'public',
  }),
  passwordHash: zdb(z.string().max(255).nullable(), {
    type: 'varchar',
    length: 255,
    dbName: 'password_hash',
  }),
  allowComment: zdb(z.boolean(), { type: 'boolean', dbName: 'allow_comment', default: true }),
  deletedAt: zdb(z.string().nullable(), { type: 'timestamp', dbName: 'deleted_at' }),
  createdAt: zdb(z.string(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  updatedAt: zdb(z.string(), { type: 'timestamp', dbName: 'updated_at', notNull: true }),
  publishedAt: zdb(z.string().nullable(), { type: 'timestamp', dbName: 'published_at' }),
  deletedBy: zdb(z.string().length(36).nullable(), {
    type: 'char',
    length: 36,
    dbName: 'deleted_by',
  }),
  createdBy: zdb(z.string().length(36).nullable(), {
    type: 'char',
    length: 36,
    dbName: 'created_by',
  }),
  updatedBy: zdb(z.string().length(36).nullable(), {
    type: 'char',
    length: 36,
    dbName: 'updated_by',
  }),
});
// TODO: index idx_slug on (slug)
// TODO: index idx_user_id on (user_id)
// TODO: index idx_publish on (status, published_at)
// TODO: index idx_deleted_at on (deleted_at)
// TODO: index idx_featured_weight on (featured_weight, updated_at)

export const PostContentSchema = z.object({
  postId: zdb(z.number().int(), {
    type: 'bigint',
    dbName: 'post_id',
    primaryKey: true,
    references: { table: 'postCore', column: 'id', onDelete: 'cascade' },
  }),
  contentMd: zdb(z.string(), { type: 'text', dbName: 'content_md', notNull: true }),
  contentHtml: zdb(z.string().nullable(), { type: 'text', dbName: 'content_html' }),
});

export const PostRevisionsSchema = z.object({
  id: zdb(z.number().int(), { type: 'bigint', primaryKey: true, autoIncrement: true }),
  postId: zdb(z.number().int(), {
    type: 'bigint',
    dbName: 'post_id',
    notNull: true,
    references: { table: 'postCore', column: 'id', onDelete: 'cascade' },
  }),
  contentMd: zdb(z.string(), { type: 'text', dbName: 'content_md', notNull: true }),
  createdAt: zdb(z.string(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  createdBy: zdb(z.string().length(36).nullable(), {
    type: 'char',
    length: 36,
    dbName: 'created_by',
  }),
});

export const PostStatsSchema = z.object({
  postId: zdb(z.number().int(), {
    type: 'bigint',
    dbName: 'post_id',
    primaryKey: true,
    references: { table: 'postCore', column: 'id', onDelete: 'cascade' },
  }),
  viewCount: zdb(z.number().int(), { type: 'bigint', dbName: 'view_count', default: 0 }),
  likeCount: zdb(z.number().int(), { type: 'bigint', dbName: 'like_count', default: 0 }),
  commentCount: zdb(z.number().int(), { type: 'bigint', dbName: 'comment_count', default: 0 }),
});

export const PostTagMappingsSchema = z.object({
  postId: zdb(z.number().int(), {
    type: 'bigint',
    dbName: 'post_id',
    notNull: true,
    references: { table: 'postCore', column: 'id', onDelete: 'cascade' },
  }),
  tagId: zdb(z.number().int(), {
    type: 'bigint',
    dbName: 'tag_id',
    notNull: true,
    references: { table: 'postTags', column: 'id', onDelete: 'cascade' },
  }),
});
// Indexes: ptm_post_id_idx, ptm_tag_id_idx, ptm_composite_idx (created by SystemInitService)

export const PostCategoryMappingsSchema = z.object({
  postId: zdb(z.number().int(), {
    type: 'bigint',
    dbName: 'post_id',
    notNull: true,
    references: { table: 'postCore', column: 'id', onDelete: 'cascade' },
  }),
  categoryId: zdb(z.number().int(), {
    type: 'bigint',
    dbName: 'category_id',
    notNull: true,
    references: { table: 'postCategories', column: 'id', onDelete: 'cascade' },
  }),
});
// Indexes: pcm_post_id_idx, pcm_category_id_idx, pcm_composite_idx (created by SystemInitService)

// ==================== Entity Interfaces ====================

export interface PostEntity {
  id: string;
  slug: string;
  title: string;
  contentMd: string;
  contentHtml: string | null;
  coverImage: string | null;
  isPinned: boolean;
  featuredWeight: number;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'private' | 'password';
  allowComment: boolean;
  authorId: string;
  authorName: string;
  authorUsername: string;
  tags: string[];
  tagNames: string[];
  categories: string[];
  categoryNames: string[];
  readingTime: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface PostListEntity {
  id: string;
  slug: string;
  title: string;
  coverImage: string | null;
  status: string;
  authorName: string;
  authorUsername: string;
  tags: string[];
  tagNames: string[];
  categories: string[];
  categoryNames: string[];
  readingTime: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

export const PostListEntitySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  coverImage: z.string().nullable(),
  status: z.string(),
  authorName: z.string(),
  authorUsername: z.string(),
  tags: z.array(z.string()),
  categories: z.array(z.string()),
  readingTime: z.number(),
  viewCount: z.number(),
  likeCount: z.number(),
  commentCount: z.number(),
  createdAt: z.string(),
});

export const PostEntitySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  contentMd: z.string(),
  contentHtml: z.string().nullable(),
  coverImage: z.string().nullable(),
  isPinned: z.boolean(),
  featuredWeight: z.number(),
  status: z.enum(['draft', 'published', 'archived']),
  visibility: z.enum(['public', 'private', 'password']),
  allowComment: z.boolean(),
  authorId: z.string(),
  authorName: z.string(),
  authorUsername: z.string(),
  readingTime: z.number(),
  viewCount: z.number(),
  likeCount: z.number(),
  commentCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullable(),
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
});
