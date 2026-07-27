import { z } from 'zod';

export const BlogSearchQuerySchema = z.object({
  keyword: z.string().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  excludeSlugs: z.string().optional(),
  tag: z.string().optional(),
  category: z.string().optional(),
  author: z.string().optional(),
});

export const BlogAuthorQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  tag: z.string().optional(),
});

export type BlogSearchQuery = z.infer<typeof BlogSearchQuerySchema>;
export type BlogAuthorQuery = z.infer<typeof BlogAuthorQuerySchema>;
