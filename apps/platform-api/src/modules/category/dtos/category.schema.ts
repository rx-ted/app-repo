import { z } from 'zod';

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().max(100).optional(),
  description: z.string().optional(),
});

export const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().max(100).optional(),
  description: z.string().optional(),
});

export const CategoryResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  postCount: z.number(),
  createdBy: z.string(),
  createdAt: z.string(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type CategoryResponse = z.infer<typeof CategoryResponseSchema>;
