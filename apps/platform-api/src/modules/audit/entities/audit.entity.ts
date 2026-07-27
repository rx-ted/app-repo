import { z } from 'zod';
import { zdb } from '@rx-ted/packages-honest-plugins/db';

export const AuditLogsSchema = z.object({
  id: zdb(z.number(), { type: 'bigint', primaryKey: true, autoIncrement: true }),
  traceId: zdb(z.string().max(64).nullable(), { type: 'varchar', length: 64, dbName: 'trace_id' }),
  requestId: zdb(z.string().max(64).nullable(), {
    type: 'varchar',
    length: 64,
    dbName: 'request_id',
  }),
  actorId: zdb(z.string().length(36).nullable(), {
    type: 'char',
    length: 36,
    dbName: 'actor_id',
    references: { table: 'users', column: 'id', onDelete: 'set null' },
  }),
  actorRole: zdb(z.string().max(20).nullable(), {
    type: 'varchar',
    length: 20,
    dbName: 'actor_role',
  }),
  action: zdb(z.string().max(50), { type: 'varchar', length: 50, notNull: true }),
  targetType: zdb(z.string().max(30).nullable(), {
    type: 'varchar',
    length: 30,
    dbName: 'target_type',
  }),
  targetId: zdb(z.string().max(64).nullable(), {
    type: 'varchar',
    length: 64,
    dbName: 'target_id',
  }),
  status: zdb(z.enum(['SUCCESS', 'FAILED']), {
    type: 'enum',
    values: ['SUCCESS', 'FAILED'],
    notNull: true,
  }),
  message: zdb(z.string().max(255).nullable(), { type: 'varchar', length: 255 }),
  ipAddress: zdb(z.string().max(45).nullable(), {
    type: 'varchar',
    length: 45,
    dbName: 'ip_address',
  }),
  userAgent: zdb(z.string().max(255).nullable(), {
    type: 'varchar',
    length: 255,
    dbName: 'user_agent',
  }),
  meta: zdb(z.any(), { type: 'json' }),
  createdAt: zdb(z.string(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
});
// TODO: index idx_actor on (actor_id, created_at)
// TODO: index idx_action on (action, created_at)
// TODO: index idx_target on (target_type, target_id)
// TODO: index idx_created_at on (created_at)

// ==================== Entity Interfaces ====================

export const AuditEntitySchema = z.object({
  id: z.string(),
  actor_id: z.string(),
  actor_role: z.string().nullable(),
  action: z.string(),
  target_type: z.string(),
  target_id: z.string(),
  status: z.enum(['SUCCESS', 'FAILURE']),
  message: z.string().nullable(),
  meta: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
});

export interface AuditEntity {
  id: string;
  actor_id: string;
  actor_role: string | null;
  action: string;
  target_type: string;
  target_id: string;
  status: 'SUCCESS' | 'FAILURE';
  message: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}
