import { z } from 'zod';
import { zdb } from '@rx-ted/packages-honest-plugins/db';

export const PermissionRequestsSchema = z.object({
  id: zdb(z.number(), { type: 'bigint', primaryKey: true, autoIncrement: true }),
  userId: zdb(z.string().length(36), {
    type: 'char',
    length: 36,
    dbName: 'user_id',
    notNull: true,
    references: { table: 'users', column: 'id', onDelete: 'cascade' },
  }),
  requestType: zdb(z.enum(['PERMISSION', 'ACCESS']), {
    type: 'enum',
    values: ['PERMISSION', 'ACCESS'],
    dbName: 'request_type',
    default: 'PERMISSION',
  }),
  permissionId: zdb(z.number().int().nullable(), {
    type: 'integer',
    dbName: 'permission_id',
    references: { table: 'permissions', column: 'id' },
  }),
  targetUserId: zdb(z.string().length(36).nullable(), {
    type: 'char',
    length: 36,
    dbName: 'target_user_id',
    references: { table: 'users', column: 'id', onDelete: 'set null' },
  }),
  path: zdb(z.string().max(255).nullable(), { type: 'varchar', length: 255 }),
  scope: zdb(z.string().max(50).nullable(), { type: 'varchar', length: 50 }),
  entityType: zdb(z.string().max(50).nullable(), {
    type: 'varchar',
    length: 50,
    dbName: 'entity_type',
  }),
  entityData: zdb(z.string().nullable(), { type: 'text', dbName: 'entity_data' }),
  expiresAt: zdb(z.string().nullable(), { type: 'timestamp', dbName: 'expires_at' }),
  reason: zdb(z.string().max(255).nullable(), { type: 'varchar', length: 255 }),
  status: zdb(z.enum(['PENDING', 'APPROVED', 'REJECTED']), {
    type: 'enum',
    values: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
  }),
  decisionReason: zdb(z.string().max(255).nullable(), {
    type: 'varchar',
    length: 255,
    dbName: 'decision_reason',
  }),
  decidedBy: zdb(z.string().length(36).nullable(), {
    type: 'char',
    length: 36,
    dbName: 'decided_by',
  }),
  decidedAt: zdb(z.string().nullable(), { type: 'timestamp', dbName: 'decided_at' }),
  createdAt: zdb(z.string(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  updatedAt: zdb(z.string(), { type: 'timestamp', dbName: 'updated_at', notNull: true }),
});

// ==================== Entity Interfaces ====================

export const PermissionRequestEntitySchema = z.object({
  id: z.string(),
  user_id: z.string(),
  permission_ids: z.array(z.number()),
  request_type: z.enum(['PERMISSION', 'ACCESS']),
  target_user_id: z.string().nullable(),
  path: z.string().nullable(),
  scope: z.string().nullable(),
  entity_type: z.string().nullable(),
  entity_data: z.string().nullable(),
  expires_at: z.string().nullable(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  reason: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export interface PermissionRequestEntity {
  id: string;
  user_id: string;
  permission_code: string;
  request_type: 'PERMISSION' | 'ACCESS';
  target_user_id: string | null;
  path: string | null;
  scope: string | null;
  entity_type: string | null;
  entity_data: string | null;
  expires_at: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string | null;
  created_at: string;
  updated_at: string;
}
