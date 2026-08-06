import { z } from 'zod';

export const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().max(128).optional(),
  cover_image: z.string().optional().nullable(),
  is_pinned: z.boolean().optional(),
  featured_weight: z.number().optional(),
  content_md: z.string().min(1),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  visibility: z.enum(['public', 'private', 'password']).optional(),
  allow_comment: z.boolean().optional(),
  tag_ids: z.array(z.coerce.number()).optional(),
  category_ids: z.array(z.coerce.number()).optional(),
});

export const UpdatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  cover_image: z.string().optional().nullable(),
  is_pinned: z.boolean().optional(),
  featured_weight: z.number().optional(),
  content_md: z.string().min(1).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  visibility: z.enum(['public', 'private', 'password']).optional(),
  allow_comment: z.boolean().optional(),
  tag_ids: z.array(z.coerce.number()).optional(),
  category_ids: z.array(z.coerce.number()).optional(),
});

export const PostListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  lang: z.enum(['en', 'zh-CN']).optional(),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
export type PostListQuery = z.infer<typeof PostListQuerySchema>;
