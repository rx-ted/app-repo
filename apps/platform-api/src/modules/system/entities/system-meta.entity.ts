import { z } from 'zod';
import { zdb } from '@rx-ted/packages-honest-plugins/db';

export const SystemMetaSchema = z.object({
  key: zdb(z.string().max(100), { type: 'varchar', length: 100, primaryKey: true, notNull: true }),
  value: zdb(z.string(), { type: 'text', notNull: true }),
  createdAt: zdb(z.string(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  updatedAt: zdb(z.string(), { type: 'timestamp', dbName: 'updated_at', notNull: true }),
});
