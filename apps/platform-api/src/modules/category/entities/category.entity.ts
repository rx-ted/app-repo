import { z } from 'zod';
import { zdb } from '@rx-ted/packages-honest-plugins/db';

export const PostCategoriesSchema = z.object({
  id: zdb(z.number(), { type: 'bigint', primaryKey: true, autoIncrement: true }),
  name: zdb(z.string().max(50), { type: 'varchar', length: 50, notNull: true }),
  slug: zdb(z.string().max(100), { type: 'varchar', length: 100, notNull: true, unique: true }),
  description: zdb(z.string().max(500).nullable(), { type: 'varchar', length: 500 }),
  postCount: zdb(z.number().int().nullable(), {
    type: 'integer',
    dbName: 'post_count',
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

export const CategoryEntitySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  postCount: z.number(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export interface CategoryEntity {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  postCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
