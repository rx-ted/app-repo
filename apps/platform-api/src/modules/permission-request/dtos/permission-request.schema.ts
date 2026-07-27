import { z } from 'zod';

export const CreatePermissionRequestSchema = z.object({
  permission_ids: z.array(z.number().int()).min(1, 'At least one permission is required'),
  reason: z.string().optional(),
});

export const ApproveRejectSchema = z.object({
  reason: z.string().optional(),
});

export const PermissionRequestListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const PermissionRequestResponseSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  request_type: z.enum(['PERMISSION', 'ACCESS']),
  target_user_id: z.string().nullable(),
  path: z.string().nullable(),
  scope: z.string().nullable(),
  entity_type: z.string().nullable(),
  entity_data: z.string().nullable(),
  permission_ids: z.array(z.number()),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  reason: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CreatePermissionRequestInput = z.infer<typeof CreatePermissionRequestSchema>;
export type ApproveRejectInput = z.infer<typeof ApproveRejectSchema>;
export type PermissionRequestListQuery = z.infer<typeof PermissionRequestListQuerySchema>;
export type PermissionRequestResponseDto = z.infer<typeof PermissionRequestResponseSchema>;
export type PermissionRequestListResponseDto = PermissionRequestResponseDto[];
