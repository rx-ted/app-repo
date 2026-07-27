import { Inject, Service } from '@rx-ted/packages-honest';
import { eq, desc, count } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { CacheService, cacheable } from '@rx-ted/packages-honest-plugins/cache';
import { notifications } from '@/schema';
import type {
  NotificationResponseDto,
  NotificationSummaryResponseDto,
} from '@/modules/notification/dtos/notification.response.dto';

@Service()
export class NotificationService {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  async listMine(): Promise<NotificationResponseDto[]> {
    return cacheable(this.cache, 'notifications:list', 60, async () => {
      const rows = await this.db
        .select()
        .from(notifications)
        .orderBy(desc(notifications.createdAt));
      return rows.map((row) => ({
        id: String(row.id),
        type: row.type ?? '',
        title: row.title ?? '',
        content: row.content ?? '',
        is_read: row.isRead ?? false,
        created_at: row.createdAt.toISOString(),
      }));
    });
  }

  async getSummary(): Promise<NotificationSummaryResponseDto> {
    return cacheable(this.cache, 'notifications:summary', 60, async () => {
      const [unreadResult] = await this.db
        .select({ value: count() })
        .from(notifications)
        .where(eq(notifications.isRead, false));
      const recent = await this.db
        .select()
        .from(notifications)
        .orderBy(desc(notifications.createdAt))
        .limit(5);
      return {
        unreadCount: unreadResult?.value ?? 0,
        recent: recent.map((row) => ({
          id: String(row.id),
          type: row.type ?? '',
          title: row.title ?? '',
          content: row.content ?? '',
          is_read: row.isRead ?? false,
          created_at: row.createdAt.toISOString(),
        })),
      };
    });
  }

  async markAllRead(): Promise<{ affectedRows: number }> {
    const result = await this.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.isRead, false));
    await this.cache.delete('notifications:list');
    await this.cache.delete('notifications:summary');
    return { affectedRows: result[0]?.affectedRows ?? 0 };
  }

  async markRead(id: number): Promise<{ affectedRows: number }> {
    const result = await this.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, id));
    await this.cache.delete('notifications:list');
    await this.cache.delete('notifications:summary');
    return { affectedRows: result[0]?.affectedRows ?? 0 };
  }
}

export default NotificationService;
