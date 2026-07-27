import { z } from 'zod';

export const CreatePermissionSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(100),
  description: z.string().optional(),
});

export const DeletePermissionSchema = z.object({
  permission_id: z.number().int(),
  target_user_id: z.string().optional(),
});

export const PermissionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const PermissionResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  created_at: z.string(),
});

export type CreatePermissionInput = z.infer<typeof CreatePermissionSchema>;
export type DeletePermissionInput = z.infer<typeof DeletePermissionSchema>;
export type PermissionListQuery = z.infer<typeof PermissionListQuerySchema>;
export type PermissionResponseDto = z.infer<typeof PermissionResponseSchema>;
export type PermissionListResponseDto = PermissionResponseDto[];
