import { z } from 'zod';
import { zdb } from '@rx-ted/packages-honest-plugins/db';

export const PostTagsSchema = z.object({
  id: zdb(z.number(), { type: 'bigint', primaryKey: true, autoIncrement: true }),
  name: zdb(z.string().max(50), { type: 'varchar', length: 50, notNull: true, unique: true }),
  slug: zdb(z.string().max(100), { type: 'varchar', length: 100, notNull: true, unique: true }),
  usageCount: zdb(z.number().int(), {
    type: 'integer',
    dbName: 'usage_count',
    notNull: true,
    default: 0,
  }),
  createdBy: zdb(z.string(), {
    type: 'varchar',
    length: 36,
    dbName: 'created_by',
    notNull: true,
    default: '',
  }),
  createdAt: zdb(z.string(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  updatedAt: zdb(z.string(), { type: 'timestamp', dbName: 'updated_at', notNull: true }),
});

// ==================== Entity Interfaces ====================

export const TagEntitySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  usageCount: z.number(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export interface TagEntity {
  id: number;
  name: string;
  slug: string;
  usageCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
