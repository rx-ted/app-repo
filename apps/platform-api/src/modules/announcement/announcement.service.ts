import { Inject, Service } from '@rx-ted/packages-honest';
import { eq, and, or, desc, lte, gte, isNull } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { CacheService, cacheable } from '@rx-ted/packages-honest-plugins/cache';
import { announcements } from '@/schema';
import type {
  ActiveAnnouncementsResponseDto,
  AnnouncementResponseDto,
} from '@/modules/announcement/dtos/announcement.response.dto';
import type { AnnouncementEntity } from '@/modules/announcement/entities/announcement.entity';
import { AnnouncementMapper } from '@/modules/announcement/mappers/announcement.mapper';
import { CACHE } from '@/constants';

function mapAnnouncementRow(row: typeof announcements.$inferSelect): AnnouncementEntity {
  return {
    id: String(row.id),
    title: '',
    content: '',
    slot: row.slot,
    audiences: [],
    payload_json: row.payloadJson ? JSON.stringify(row.payloadJson) : null,
    translated_payload_json: row.translatedPayloadJson
      ? JSON.stringify(row.translatedPayloadJson)
      : null,
    created_by: row.createdBy ?? '',
    updated_by: row.updatedBy ?? '',
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

@Service()
export class AnnouncementService {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  async listActive(): Promise<ActiveAnnouncementsResponseDto> {
    return cacheable(
      this.cache,
      'announcements:active',
      CACHE.ANNOUNCEMENT_ACTIVE_TTL,
      async () => {
        const now = new Date();
        const rows = await this.db
          .select()
          .from(announcements)
          .where(
            and(
              eq(announcements.enabled, true),
              lte(announcements.activeFrom, now),
              or(isNull(announcements.activeUntil), gte(announcements.activeUntil, now)),
            ),
          )
          .orderBy(desc(announcements.priority));

        const mapped = rows.map((row) => AnnouncementMapper.toResponse(mapAnnouncementRow(row)));

        return {
          top: mapped.filter((a) => a.slot === 'top'),
          footer: mapped.filter((a) => a.slot === 'footer'),
          meta: {
            frontend_version: '',
            backend_version: '',
            rotation_interval_ms: 6000,
            generated_at: new Date().toISOString(),
          },
        };
      },
    );
  }

  async listAll(): Promise<AnnouncementResponseDto[]> {
    const rows = await this.db.select().from(announcements).orderBy(desc(announcements.createdAt));
    return rows.map((row) => AnnouncementMapper.toResponse(mapAnnouncementRow(row)));
  }

  async getById(id: string): Promise<AnnouncementResponseDto | null> {
    const [row] = await this.db
      .select()
      .from(announcements)
      .where(eq(announcements.id, Number(id)))
      .limit(1);
    if (!row) return null;
    return AnnouncementMapper.toResponse(mapAnnouncementRow(row));
  }

  async create(data: Partial<AnnouncementEntity>): Promise<AnnouncementResponseDto> {
    const now = new Date();
    const payloadJson = data.payload_json ? JSON.parse(data.payload_json) : {};
    const translatedPayloadJson = data.translated_payload_json
      ? JSON.parse(data.translated_payload_json)
      : null;
    const insertResult: any = await this.db.insert(announcements).values({
      slot: data.slot ?? 'footer',
      payloadJson,
      translatedPayloadJson,
      enabled: true,
      priority: 0,
      dismissible: true,
      activeFrom: now,
      createdBy: data.created_by,
      updatedBy: data.created_by,
      createdAt: now,
      updatedAt: now,
    });
    const insertId = Number(
      insertResult.insertId ?? insertResult.lastInsertRowid ?? insertResult.meta?.last_row_id,
    );
    const [row] = await this.db
      .select()
      .from(announcements)
      .where(eq(announcements.id, insertId))
      .limit(1);
    await this.cache.delete('announcements:active');
    return AnnouncementMapper.toResponse(mapAnnouncementRow(row));
  }

  async update(id: string, data: Partial<AnnouncementEntity>): Promise<{ affectedRows: number }> {
    const numericId = Number(id);
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.slot !== undefined) updateData.slot = data.slot;
    if (data.payload_json !== undefined && data.payload_json !== null)
      updateData.payloadJson = JSON.parse(data.payload_json);
    if (data.translated_payload_json !== undefined && data.translated_payload_json !== null)
      updateData.translatedPayloadJson = JSON.parse(data.translated_payload_json);

    const result = await this.db
      .update(announcements)
      .set(updateData)
      .where(eq(announcements.id, numericId));
    await this.cache.delete('announcements:active');
    return { affectedRows: result[0]?.affectedRows ?? 0 };
  }

  async delete(id: string): Promise<{ affectedRows: number }> {
    const result = await this.db.delete(announcements).where(eq(announcements.id, Number(id)));
    await this.cache.delete('announcements:active');
    return { affectedRows: result[0]?.affectedRows ?? 0 };
  }
}

export default AnnouncementService;
