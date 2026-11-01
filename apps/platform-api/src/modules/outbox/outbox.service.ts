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
    return Number(
      (result as any).insertId ??
        (result as any).lastInsertRowid ??
        (result as any).meta?.last_row_id ??
        0,
    );
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

  async markFailed(id: number | string, error: string, attempts = 0): Promise<void> {
    await this.db
      .update(outboxEvents)
      .set({ status: 'failed', attempts, errorMessage: error.slice(0, 500), updatedAt: new Date() })
      .where(eq(outboxEvents.id, Number(id)));
  }

  private async scheduleRetry(id: number | string, attempts: number, error: string): Promise<void> {
    const delayMs = Math.min(5 * 60 * 1000, 2 ** Math.max(1, attempts) * 1000);
    await this.db
      .update(outboxEvents)
      .set({
        status: 'pending',
        attempts,
        errorMessage: error.slice(0, 500),
        availableAt: new Date(Date.now() + delayMs),
        updatedAt: new Date(),
      })
      .where(eq(outboxEvents.id, Number(id)));
  }

  async list(status?: string, limit = 20): Promise<any[]> {
    let query = this.db
      .select()
      .from(outboxEvents)
      .orderBy(outboxEvents.id)
      .limit(Math.min(Math.max(limit, 1), 100));
    if (status) {
      query = query.where(eq(outboxEvents.status, status as any)) as any;
    }
    return query;
  }

  async retry(id: string | number): Promise<void> {
    await this.db
      .update(outboxEvents)
      .set({
        status: 'pending',
        attempts: 0,
        errorMessage: null,
        availableAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(outboxEvents.id, Number(id)));
  }

  async processPending(
    processor: (event: OutboxEventRow) => Promise<void>,
    limit = 10,
  ): Promise<void> {
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
        const nextAttempts = (event.attempts ?? 0) + 1;
        const message = error instanceof Error ? error.message : String(error);
        if (nextAttempts >= 5) {
          await this.markFailed(event.id, message, nextAttempts);
        } else {
          await this.scheduleRetry(event.id, nextAttempts, message);
        }
      }
    }
  }
}

export default OutboxService;
