import { z } from 'zod';
import { zdb } from '@rx-ted/packages-honest-plugins/db';

export const AnnouncementsSchema = z.object({
  id: zdb(z.number(), { type: 'bigint', primaryKey: true, autoIncrement: true }),
  slot: zdb(z.enum(['top', 'footer']), { type: 'enum', values: ['top', 'footer'], notNull: true }),
  tone: zdb(z.enum(['critical', 'subtle']).nullable(), {
    type: 'enum',
    values: ['critical', 'subtle'],
    default: 'subtle',
  }),
  audience: zdb(z.enum(['ALL', 'AUTHENTICATED', 'ADMIN']).nullable(), {
    type: 'enum',
    values: ['ALL', 'AUTHENTICATED', 'ADMIN'],
    default: 'ALL',
  }),
  sourceLocale: zdb(z.enum(['zh-CN', 'en']).nullable(), {
    type: 'enum',
    values: ['zh-CN', 'en'],
    dbName: 'source_locale',
    default: 'zh-CN',
  }),
  payloadJson: zdb(z.any(), { type: 'json', dbName: 'payload_json', notNull: true }),
  translatedPayloadJson: zdb(z.any().nullable(), {
    type: 'json',
    dbName: 'translated_payload_json',
  }),
  translationStatus: zdb(z.enum(['none', 'manual', 'machine']).nullable(), {
    type: 'enum',
    values: ['none', 'manual', 'machine'],
    dbName: 'translation_status',
    default: 'none',
  }),
  dismissible: zdb(z.boolean().nullable(), { type: 'boolean', default: true }),
  enabled: zdb(z.boolean().nullable(), { type: 'boolean', default: true }),
  priority: zdb(z.number().int().nullable(), { type: 'integer', default: 0 }),
  activeFrom: zdb(z.string().nullable(), { type: 'timestamp', dbName: 'active_from' }),
  activeUntil: zdb(z.string().nullable(), { type: 'timestamp', dbName: 'active_until' }),
  frontendVersion: zdb(z.string().max(32).nullable(), {
    type: 'varchar',
    length: 32,
    dbName: 'frontend_version',
  }),
  backendVersion: zdb(z.string().max(32).nullable(), {
    type: 'varchar',
    length: 32,
    dbName: 'backend_version',
  }),
  createdBy: zdb(z.string().length(36).nullable(), {
    type: 'char',
    length: 36,
    dbName: 'created_by',
    references: { table: 'users', column: 'id', onDelete: 'set null' },
  }),
  updatedBy: zdb(z.string().length(36).nullable(), {
    type: 'char',
    length: 36,
    dbName: 'updated_by',
    references: { table: 'users', column: 'id', onDelete: 'set null' },
  }),
  createdAt: zdb(z.string(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  updatedAt: zdb(z.string(), { type: 'timestamp', dbName: 'updated_at', notNull: true }),
});
// TODO: index idx_slot_enabled_priority on (slot, enabled, priority)
// TODO: index idx_audience on (audience)
// TODO: index idx_active_window on (active_from, active_until)

// ==================== Entity Interfaces ====================

export const AnnouncementEntitySchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  slot: z.enum(['top', 'footer']),
  audiences: z.array(z.string()),
  payload_json: z.string().nullable(),
  translated_payload_json: z.string().nullable(),
  created_by: z.string(),
  updated_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export interface AnnouncementEntity {
  id: string;
  title: string;
  content: string;
  slot: 'top' | 'footer';
  audiences: string[];
  payload_json: string | null;
  translated_payload_json: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}
