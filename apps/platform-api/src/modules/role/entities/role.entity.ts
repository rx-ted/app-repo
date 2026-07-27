import { z } from 'zod';
import { zdb } from '@rx-ted/packages-honest-plugins/db';

export const RolesSchema = z.object({
  id: zdb(z.number().int(), { type: 'integer', primaryKey: true, autoIncrement: true }),
  name: zdb(z.string().min(1).max(20), {
    type: 'varchar',
    length: 20,
    notNull: true,
    unique: true,
  }),
  description: zdb(z.string().max(100).nullable(), { type: 'varchar', length: 100 }),
  createdAt: zdb(z.string(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  updatedAt: zdb(z.string(), { type: 'timestamp', dbName: 'updated_at', notNull: true }),
});

export const UserRoleMappingsSchema = z.object({
  userId: zdb(z.string().length(36), {
    type: 'char',
    length: 36,
    dbName: 'user_id',
    notNull: true,
    references: { table: 'users', column: 'id' },
  }),
  roleId: zdb(z.number().int(), {
    type: 'integer',
    dbName: 'role_id',
    notNull: true,
    references: { table: 'roles', column: 'id' },
  }),
});
// TODO: composite primary key on (user_id, role_id)
// TODO: index urm_user_id_idx on (user_id)
// TODO: index urm_role_id_idx on (role_id)

// ==================== Entity Interfaces ====================

export const RoleEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export interface RoleEntity {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}
