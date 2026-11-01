import { z } from 'zod';
import { zdb } from '@rx-ted/packages-honest-plugins/db';

export const OutboxEventsSchema = z.object({
  id: zdb(z.number().int(), { type: 'bigint', primaryKey: true, autoIncrement: true }),
  eventType: zdb(z.string().max(100), {
    type: 'varchar',
    length: 100,
    dbName: 'event_type',
    notNull: true,
  }),
  payloadJson: zdb(z.any().nullable(), { type: 'json', dbName: 'payload_json' }),
  status: zdb(z.enum(['pending', 'processing', 'done', 'failed']), {
    type: 'enum',
    values: ['pending', 'processing', 'done', 'failed'],
    default: 'pending',
    notNull: true,
  }),
  attempts: zdb(z.number().int(), { type: 'integer', notNull: true, default: 0 }),
  availableAt: zdb(z.string(), { type: 'timestamp', dbName: 'available_at', notNull: true }),
  errorMessage: zdb(z.string().max(500).nullable(), {
    type: 'varchar',
    length: 500,
    dbName: 'error_message',
  }),
  createdAt: zdb(z.string(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  updatedAt: zdb(z.string(), { type: 'timestamp', dbName: 'updated_at', notNull: true }),
});
