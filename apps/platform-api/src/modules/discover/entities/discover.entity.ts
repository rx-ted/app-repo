import { z } from 'zod';
import { zdb } from '@rx-ted/packages-honest-plugins/db';

export const DISCOVER_CATEGORIES = [
  'blog',
  'docs',
  'framework',
  'mail',
  'mall',
  'community',
  'tool',
  'other',
] as const;

export const DISCOVER_STATUSES = ['active', 'pending', 'unreachable', 'disabled'] as const;

export type DiscoverCategory = (typeof DISCOVER_CATEGORIES)[number];
export type DiscoverStatus = (typeof DISCOVER_STATUSES)[number];

export const DiscoveriesSchema = z.object({
  id: zdb(z.number(), { type: 'bigint', primaryKey: true, autoIncrement: true }),
  name: zdb(z.string().max(100), { type: 'varchar', length: 100, notNull: true }),
  url: zdb(z.string().max(500), { type: 'varchar', length: 500, notNull: true }),
  logo: zdb(z.string().max(500).nullable(), { type: 'varchar', length: 500 }),
  description: zdb(z.string().max(200).nullable(), { type: 'varchar', length: 200 }),
  category: zdb(z.string().max(50).nullable(), {
    type: 'varchar',
    length: 50,
    default: 'other',
  }),
  status: zdb(z.string().max(20).nullable(), {
    type: 'varchar',
    length: 20,
    default: 'active',
  }),
  email: zdb(z.string().max(200).nullable(), { type: 'varchar', length: 200 }),
  sortOrder: zdb(z.number().int().nullable(), {
    type: 'integer',
    dbName: 'sort_order',
    default: 0,
  }),
  failCount: zdb(z.number().int().nullable(), {
    type: 'integer',
    dbName: 'fail_count',
    default: 0,
  }),
  lastCheckedAt: zdb(z.string().nullable(), {
    type: 'timestamp',
    dbName: 'last_checked_at',
  }),
  createdAt: zdb(z.string(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  updatedAt: zdb(z.string(), { type: 'timestamp', dbName: 'updated_at', notNull: true }),
});

export const DiscoveryEntitySchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string(),
  logo: z.string().nullable(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  status: z.string().nullable(),
  email: z.string().nullable(),
  sortOrder: z.number(),
  failCount: z.number(),
  lastCheckedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export interface DiscoveryEntity {
  id: number;
  name: string;
  url: string;
  logo: string | null;
  description: string | null;
  category: string | null;
  status: string | null;
  email: string | null;
  sortOrder: number;
  failCount: number;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
