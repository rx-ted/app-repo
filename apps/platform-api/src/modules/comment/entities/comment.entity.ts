import { z } from 'zod';
import { zdb } from '@rx-ted/packages-honest-plugins/db';

export const CommentsSchema = z.object({
  id: zdb(z.number(), { type: 'bigint', primaryKey: true, autoIncrement: true }),
  postId: zdb(z.number().nullable(), {
    type: 'bigint',
    dbName: 'post_id',
    references: { table: 'postCore', column: 'id', onDelete: 'cascade' },
  }),
  tag: zdb(z.enum(['post', 'guestbook', 'friends', 'about']), {
    type: 'enum',
    values: ['post', 'guestbook', 'friends', 'about'],
    default: 'post',
    notNull: true,
  }),
  userId: zdb(z.string().length(36).nullable(), { type: 'char', length: 36, dbName: 'user_id' }),
  parentId: zdb(z.number().nullable(), { type: 'bigint', dbName: 'parent_id' }),
  content: zdb(z.string(), { type: 'text', notNull: true }),
  guestName: zdb(z.string().max(100).nullable(), {
    type: 'varchar',
    length: 100,
    dbName: 'guest_name',
  }),
  guestEmail: zdb(z.string().max(255).nullable(), {
    type: 'varchar',
    length: 255,
    dbName: 'guest_email',
  }),
  guestWebsite: zdb(z.string().max(500).nullable(), {
    type: 'varchar',
    length: 500,
    dbName: 'guest_website',
  }),
  ipAddress: zdb(z.string().max(45).nullable(), {
    type: 'varchar',
    length: 45,
    dbName: 'ip_address',
  }),
  userAgent: zdb(z.string().nullable(), { type: 'text', dbName: 'user_agent' }),
  city: zdb(z.string().max(100).nullable(), { type: 'varchar', length: 100 }),
  likes: zdb(z.number().int(), { type: 'integer', default: 0, notNull: true }),
  status: zdb(z.enum(['NORMAL', 'DELETED']).nullable(), {
    type: 'enum',
    values: ['NORMAL', 'DELETED'],
    default: 'NORMAL',
  }),
  createdAt: zdb(z.string(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  updatedAt: zdb(z.string().nullable(), { type: 'timestamp', dbName: 'updated_at' }),
});
// TODO: index idx_post on (post_id)
// TODO: index idx_parent on (parent_id)

export const CommentLikesSchema = z.object({
  id: zdb(z.number(), { type: 'bigint', primaryKey: true, autoIncrement: true }),
  userId: zdb(z.string().length(36), {
    type: 'char',
    length: 36,
    dbName: 'user_id',
    notNull: true,
    references: { table: 'users', column: 'id', onDelete: 'cascade' },
  }),
  commentId: zdb(z.number(), {
    type: 'bigint',
    dbName: 'comment_id',
    notNull: true,
    references: { table: 'comments', column: 'id', onDelete: 'cascade' },
  }),
  createdAt: zdb(z.string(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
});
// TODO: uniqueIndex uk_user_comment on (user_id, comment_id)
// TODO: index idx_comment on (comment_id)

export const CommentReportsSchema = z.object({
  id: zdb(z.number(), { type: 'bigint', primaryKey: true, autoIncrement: true }),
  commentId: zdb(z.number(), {
    type: 'bigint',
    dbName: 'comment_id',
    notNull: true,
    references: { table: 'comments', column: 'id', onDelete: 'cascade' },
  }),
  reporterId: zdb(z.string().length(36), {
    type: 'char',
    length: 36,
    dbName: 'reporter_id',
    notNull: true,
    references: { table: 'users', column: 'id', onDelete: 'cascade' },
  }),
  reason: zdb(z.string().max(50), { type: 'varchar', length: 50, notNull: true }),
  description: zdb(z.string().nullable(), { type: 'text' }),
  status: zdb(z.enum(['PENDING', 'RESOLVED', 'DISMISSED']).nullable(), {
    type: 'enum',
    values: ['PENDING', 'RESOLVED', 'DISMISSED'],
    default: 'PENDING',
  }),
  createdAt: zdb(z.string(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  resolvedAt: zdb(z.string().nullable(), { type: 'timestamp', dbName: 'resolved_at' }),
  resolverId: zdb(z.string().length(36).nullable(), {
    type: 'char',
    length: 36,
    dbName: 'resolver_id',
  }),
});
// TODO: index idx_comment on (comment_id)
// TODO: index idx_reporter on (reporter_id)
// TODO: index idx_status on (status)

export const PostCommentThreadsSchema = z.object({
  id: zdb(z.number(), { type: 'bigint', primaryKey: true, autoIncrement: true }),
  postId: zdb(z.number(), {
    type: 'bigint',
    dbName: 'post_id',
    notNull: true,
    references: { table: 'postCore', column: 'id', onDelete: 'cascade' },
  }),
  provider: zdb(z.enum(['internal', 'github-discussion', 'giscus', 'disqus']).nullable(), {
    type: 'enum',
    values: ['internal', 'github-discussion', 'giscus', 'disqus'],
    default: 'github-discussion',
  }),
  repoOwner: zdb(z.string().max(100).nullable(), {
    type: 'varchar',
    length: 100,
    dbName: 'repo_owner',
  }),
  repoName: zdb(z.string().max(100).nullable(), {
    type: 'varchar',
    length: 100,
    dbName: 'repo_name',
  }),
  discussionCategory: zdb(z.string().max(100).nullable(), {
    type: 'varchar',
    length: 100,
    dbName: 'discussion_category',
  }),
  discussionCategoryId: zdb(z.string().max(100).nullable(), {
    type: 'varchar',
    length: 100,
    dbName: 'discussion_category_id',
  }),
  issueNumber: zdb(z.number().int().nullable(), { type: 'integer', dbName: 'issue_number' }),
  issueNodeId: zdb(z.string().max(255).nullable(), {
    type: 'varchar',
    length: 255,
    dbName: 'issue_node_id',
  }),
  externalThreadId: zdb(z.string().max(255).nullable(), {
    type: 'varchar',
    length: 255,
    dbName: 'external_thread_id',
  }),
  status: zdb(z.enum(['pending', 'active', 'closed', 'disabled', 'failed']).nullable(), {
    type: 'enum',
    values: ['pending', 'active', 'closed', 'disabled', 'failed'],
    default: 'pending',
  }),
  syncStatus: zdb(z.enum(['idle', 'syncing', 'error']).nullable(), {
    type: 'enum',
    values: ['idle', 'syncing', 'error'],
    dbName: 'sync_status',
    default: 'idle',
  }),
  lastError: zdb(z.string().nullable(), { type: 'text', dbName: 'last_error' }),
  createdAt: zdb(z.string(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  updatedAt: zdb(z.string(), { type: 'timestamp', dbName: 'updated_at', notNull: true }),
  closedAt: zdb(z.string().nullable(), { type: 'timestamp', dbName: 'closed_at' }),
});
// TODO: uniqueIndex uk_post_provider on (post_id, provider)
// TODO: index idx_provider_status on (provider, status)

// ==================== Entity Interfaces ====================

export const CommentEntitySchema = z.object({
  id: z.string(),
  postId: z.string().nullable(),
  tag: z.enum(['post', 'guestbook', 'friends', 'about']),
  parentId: z.string().nullable(),
  userId: z.string().nullable(),
  content: z.string(),
  guestName: z.string().nullable(),
  guestEmail: z.string().nullable(),
  guestWebsite: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  city: z.string().nullable(),
  likes: z.number(),
  status: z.enum(['NORMAL', 'DELETED']),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export interface CommentEntity {
  id: string;
  postId: string | null;
  tag: 'post' | 'guestbook' | 'friends' | 'about';
  parentId: string | null;
  userId: string | null;
  content: string;
  guestName: string | null;
  guestEmail: string | null;
  guestWebsite: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  city: string | null;
  likes: number;
  status: 'NORMAL' | 'DELETED';
  createdAt: string;
  updatedAt: string | null;
}

export interface CommentThreadEntity {
  id: string;
  postId: string;
  userId: string;
  content: string;
  status: string;
  createdAt: string;
}

export const CommentLikeEntitySchema = z.object({
  id: z.string(),
  userId: z.string(),
  commentId: z.string(),
  createdAt: z.string(),
});

export interface CommentLikeEntity {
  id: string;
  userId: string;
  commentId: string;
  createdAt: string;
}

export const CommentReportEntitySchema = z.object({
  id: z.string(),
  commentId: z.string(),
  reporterId: z.string(),
  reason: z.enum(['spam', 'harassment', 'inappropriate', 'other']),
  description: z.string().nullable(),
  status: z.enum(['PENDING', 'RESOLVED', 'DISMISSED']),
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
  resolverId: z.string().nullable(),
});

export interface CommentReportEntity {
  id: string;
  commentId: string;
  reporterId: string;
  reason: 'spam' | 'harassment' | 'inappropriate' | 'other';
  description: string | null;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  resolvedAt: string | null;
  resolverId: string | null;
}

export type CommentSort = 'newest' | 'hottest';
