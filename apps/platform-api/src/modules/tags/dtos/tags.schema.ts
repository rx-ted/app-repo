import { z } from 'zod';

export const CreateTagSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().max(100).optional(),
});

export const UpdateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  slug: z.string().max(100).optional(),
});

export const TagsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const TagResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  postCount: z.number().optional(),
  createdBy: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type CreateTagInput = z.infer<typeof CreateTagSchema>;
export type UpdateTagInput = z.infer<typeof UpdateTagSchema>;
export type TagsListQuery = z.infer<typeof TagsListQuerySchema>;
export type TagResponse = z.infer<typeof TagResponseSchema>;
