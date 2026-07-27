import { z } from 'zod';
import { zdb } from '@rx-ted/packages-honest-plugins/db';

export const PermissionRequestItemsSchema = z.object({
  id: zdb(z.number().int(), { type: 'integer', primaryKey: true, autoIncrement: true }),
  requestId: zdb(z.number(), {
    type: 'bigint',
    dbName: 'request_id',
    notNull: true,
    references: { table: 'permissionRequests', column: 'id', onDelete: 'cascade' },
  }),
  permissionId: zdb(z.number().int(), {
    type: 'integer',
    dbName: 'permission_id',
    notNull: true,
    references: { table: 'permissions', column: 'id', onDelete: 'cascade' },
  }),
});

export type PermissionRequestItemEntity = {
  id: string;
  request_id: string;
  permission_id: string;
};
