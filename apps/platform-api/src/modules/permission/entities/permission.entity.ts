import { z } from 'zod';
import { zdb } from '@rx-ted/packages-honest-plugins/db';

export const PermissionsSchema = z.object({
  id: zdb(z.number().int(), { type: 'integer', primaryKey: true, autoIncrement: true }),
  resource: zdb(z.string().max(100), { type: 'varchar', length: 100, notNull: true }),
  action: zdb(z.string().max(50), { type: 'varchar', length: 50, notNull: true }),
  scope: zdb(z.string().max(20), { type: 'varchar', length: 20, notNull: true }),
  effect: zdb(z.enum(['ALLOW', 'DENY']), {
    type: 'enum',
    values: ['ALLOW', 'DENY'],
    default: 'ALLOW',
  }),
  name: zdb(z.string().max(100).nullable(), { type: 'varchar', length: 100 }),
  createdAt: zdb(z.string(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  updatedAt: zdb(z.string(), { type: 'timestamp', dbName: 'updated_at', notNull: true }),
});

// TODO: uniqueIndex uk_perm on (resource, action, scope)

export const UserPermissionMappingsSchema = z.object({
  userId: zdb(z.string().length(36), {
    type: 'char',
    length: 36,
    dbName: 'user_id',
    notNull: true,
    references: { table: 'users', column: 'id', onDelete: 'cascade' },
  }),
  permissionId: zdb(z.number().int(), {
    type: 'integer',
    dbName: 'permission_id',
    notNull: true,
    references: { table: 'permissions', column: 'id', onDelete: 'cascade' },
  }),
});
// TODO: composite primary key on (user_id, permission_id)
// TODO: index upm_user_id_idx on (user_id)
// TODO: index upm_permission_id_idx on (permission_id)

export const RolePermissionMappingsSchema = z.object({
  roleId: zdb(z.number().int(), {
    type: 'integer',
    dbName: 'role_id',
    notNull: true,
    references: { table: 'roles', column: 'id', onDelete: 'cascade' },
  }),
  permissionId: zdb(z.number().int(), {
    type: 'integer',
    dbName: 'permission_id',
    notNull: true,
    references: { table: 'permissions', column: 'id', onDelete: 'cascade' },
  }),
});
// TODO: composite primary key on (role_id, permission_id)
// TODO: index rpm_role_id_idx on (role_id)
// TODO: index rpm_permission_id_idx on (permission_id)

// ==================== Entity Interfaces ====================

export const PermissionEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  created_at: z.string(),
});

export interface PermissionEntity {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
}
