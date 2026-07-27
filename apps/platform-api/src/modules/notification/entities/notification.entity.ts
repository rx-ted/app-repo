import { z } from 'zod';
import { zdb } from '@rx-ted/packages-honest-plugins/db';

export const NotificationsSchema = z.object({
  id: zdb(z.number(), { type: 'bigint', primaryKey: true, autoIncrement: true }),
  userId: zdb(z.string().length(36), {
    type: 'char',
    length: 36,
    dbName: 'user_id',
    notNull: true,
    references: { table: 'users', column: 'id', onDelete: 'cascade' },
  }),
  channel: zdb(z.enum(['internal', 'email']), {
    type: 'enum',
    values: ['internal', 'email'],
    default: 'internal',
  }),
  type: zdb(z.string().max(50).nullable(), { type: 'varchar', length: 50 }),
  locale: zdb(z.enum(['zh-CN', 'en']), { type: 'enum', values: ['zh-CN', 'en'], default: 'zh-CN' }),
  title: zdb(z.string().max(255).nullable(), { type: 'varchar', length: 255 }),
  content: zdb(z.string().max(255).nullable(), { type: 'varchar', length: 255 }),
  payloadJson: zdb(z.any().nullable(), { type: 'json', dbName: 'payload_json' }),
  isRead: zdb(z.boolean(), { type: 'boolean', dbName: 'is_read', default: false }),
  readAt: zdb(z.string().nullable(), { type: 'timestamp', dbName: 'read_at' }),
  deliveredAt: zdb(z.string().nullable(), { type: 'timestamp', dbName: 'delivered_at' }),
  createdAt: zdb(z.string(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
});
// TODO: index idx_user on (user_id, is_read)
// TODO: index idx_channel_created on (channel, created_at)

// ==================== Entity Interfaces ====================

export const NotificationEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  content: z.string(),
  is_read: z.boolean(),
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export interface NotificationEntity {
  id: string;
  type: string;
  title: string;
  content: string;
  is_read: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}
