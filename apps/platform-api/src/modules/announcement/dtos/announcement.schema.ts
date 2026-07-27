import { z } from 'zod';

export const CreateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  slot: z.enum(['top', 'footer']),
  audiences: z.array(z.string()).default([]),
  original: z.record(z.string(), z.unknown()).optional(),
  translated: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  slot: z.enum(['top', 'footer']).optional(),
  audiences: z.array(z.string()).optional(),
  original: z.record(z.string(), z.unknown()).optional(),
  translated: z.record(z.string(), z.unknown()).optional(),
});

export const AnnouncementListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const AnnouncementResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  slot: z.enum(['top', 'footer']),
  audiences: z.array(z.string()),
  original: z.record(z.string(), z.unknown()).nullable(),
  translated: z.record(z.string(), z.unknown()).nullable(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ActiveAnnouncementsResponseSchema = z.object({
  top: z.array(AnnouncementResponseSchema),
  footer: z.array(AnnouncementResponseSchema),
  meta: z.object({
    frontend_version: z.string(),
    backend_version: z.string(),
    rotation_interval_ms: z.number(),
    generated_at: z.string(),
  }),
});

export type CreateAnnouncementInput = z.infer<typeof CreateAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof UpdateAnnouncementSchema>;
export type AnnouncementListQuery = z.infer<typeof AnnouncementListQuerySchema>;
export type AnnouncementResponse = z.infer<typeof AnnouncementResponseSchema>;
export type ActiveAnnouncementsResponse = z.infer<typeof ActiveAnnouncementsResponseSchema>;
