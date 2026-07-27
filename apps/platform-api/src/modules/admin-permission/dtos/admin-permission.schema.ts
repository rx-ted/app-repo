import { z } from 'zod';

export const GrantPermissionsSchema = z.object({
  userId: z.string().length(36),
  permissionIds: z.array(z.number().int()).min(1),
});

export const RevokePermissionsSchema = z.object({
  userId: z.string().length(36),
  permissionIds: z.array(z.number().int()).min(1),
});

export type GrantPermissionsInput = z.infer<typeof GrantPermissionsSchema>;
export type RevokePermissionsInput = z.infer<typeof RevokePermissionsSchema>;
