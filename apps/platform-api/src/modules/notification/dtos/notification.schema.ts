import { z } from 'zod';

export const NotificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const MarkReadParamsSchema = z.object({
  id: z.string(),
});

export type NotificationListQuery = z.infer<typeof NotificationListQuerySchema>;
