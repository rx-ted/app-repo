import { z } from 'zod';

export const AuditListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const AuditResponseSchema = z.object({
  id: z.string(),
  actor_id: z.string(),
  actor_role: z.string().nullable(),
  action: z.string(),
  target_type: z.string(),
  target_id: z.string(),
  status: z.enum(['SUCCESS', 'FAILURE']),
  message: z.string().nullable(),
  meta: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
});

export type AuditListQuery = z.infer<typeof AuditListQuerySchema>;
export type AuditResponseDto = z.infer<typeof AuditResponseSchema>;
export type AuditListResponseDto = AuditResponseDto[];
