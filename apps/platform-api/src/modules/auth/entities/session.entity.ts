import { z } from 'zod';
import { zdb } from '@rx-ted/packages-honest-plugins/db';

export const SessionsSchema = z.object({
  id: zdb(z.string().uuid(), { type: 'char', length: 36, primaryKey: true }),
  userId: zdb(z.string().length(36), {
    type: 'char',
    length: 36,
    dbName: 'user_id',
    notNull: true,
    references: { table: 'users', column: 'id', onDelete: 'cascade' },
  }),
  username: zdb(z.string().max(100), { type: 'varchar', length: 100, notNull: true }),
  deviceId: zdb(z.string().max(100).nullable(), { type: 'varchar', length: 100, dbName: 'device_id' }),
  ip: zdb(z.string().max(64).nullable(), { type: 'varchar', length: 64 }),
  city: zdb(z.string().max(100).nullable(), { type: 'varchar', length: 100 }),
  userAgent: zdb(z.string().max(512).nullable(), { type: 'varchar', length: 512, dbName: 'user_agent' }),
  refreshTokenHash: zdb(z.string().max(255), {
    type: 'varchar',
    length: 255,
    dbName: 'refresh_token_hash',
    notNull: true,
  }),
  createdAt: zdb(z.string(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  lastActiveAt: zdb(z.string(), { type: 'timestamp', dbName: 'last_active_at', notNull: true }),
  expiresAt: zdb(z.string(), { type: 'timestamp', dbName: 'expires_at', notNull: true }),
});

export interface SessionRecord {
  id: string;
  userId: string;
  username: string;
  deviceId: string | null;
  ip: string | null;
  city: string | null;
  userAgent: string | null;
  refreshTokenHash: string;
  createdAt: string;
  lastActiveAt: string;
}
