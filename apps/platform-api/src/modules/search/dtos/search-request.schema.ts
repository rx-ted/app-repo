import { z } from 'zod';

export const SearchQuerySchema = z.object({
  q: z.string().default(''),
  type: z.string().default('posts'),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
