import { Inject, Service } from '@rx-ted/packages-honest';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { outboxEvents } from '@/schema';
import { eq, lte, and } from 'drizzle-orm';

type OutboxEventRow = typeof outboxEvents.$inferSelect;

@Service()
class OutboxService {
  constructor(@Inject(DbService) private db: DbService) {}

  async enqueue(eventType: string, payload: unknown): Promise<number> {
    const now = new Date();
    const result = await this.db.insert(outboxEvents).values({
      eventType,
      payloadJson: payload,
      status: 'pending',
      attempts: 0,
      availableAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return Number((result as any).insertId ?? (result as any).lastInsertRowid ?? (result as any).meta?.last_row_id ?? 0);
  }

  async fetchPending(limit = 10): Promise<OutboxEventRow[]> {
    return this.db
      .select()
      .from(outboxEvents)
      .where(and(eq(outboxEvents.status, 'pending'), lte(outboxEvents.availableAt, new Date())))
      .orderBy(outboxEvents.id)
      .limit(limit);
  }

  async markDone(id: number | string): Promise<void> {
    await this.db
      .update(outboxEvents)
      .set({ status: 'done', updatedAt: new Date(), errorMessage: null })
      .where(eq(outboxEvents.id, Number(id)));
  }

  async markFailed(id: number | string, error: string): Promise<void> {
    await this.db
      .update(outboxEvents)
      .set({ status: 'failed', attempts: 0, errorMessage: error.slice(0, 500), updatedAt: new Date() })
      .where(eq(outboxEvents.id, Number(id)));
  }

  async processPending(processor: (event: OutboxEventRow) => Promise<void>, limit = 10): Promise<void> {
    const events = await this.fetchPending(limit);
    for (const event of events) {
      await this.db
        .update(outboxEvents)
        .set({ status: 'processing', updatedAt: new Date() })
        .where(eq(outboxEvents.id, event.id));
      try {
        await processor(event);
        await this.markDone(event.id);
      } catch (error) {
        await this.markFailed(event.id, error instanceof Error ? error.message : String(error));
      }
    }
  }
}

export default OutboxService;
