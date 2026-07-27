import { z } from 'zod';

export const NotificationResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  content: z.string(),
  is_read: z.boolean(),
  created_at: z.string(),
});

export const NotificationSummaryResponseSchema = z.object({
  unreadCount: z.number(),
  recent: z.array(NotificationResponseSchema),
});

export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;
export type NotificationSummaryResponse = z.infer<typeof NotificationSummaryResponseSchema>;
export type NotificationResponseDto = NotificationResponse;
export type NotificationSummaryResponseDto = NotificationSummaryResponse;
