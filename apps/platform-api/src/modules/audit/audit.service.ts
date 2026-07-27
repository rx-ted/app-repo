import { Inject, Service } from '@rx-ted/packages-honest';
import { eq, desc } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { auditLogs } from '@/schema';
import { computeOffset } from '@/common/utils/pagination';
import type { AuditResponseDto } from '@/modules/audit/dtos/audit.response.dto';
import type { AuditEntity } from '@/modules/audit/entities/audit.entity';
import { AuditMapper } from '@/modules/audit/mappers/audit.mapper';

function mapAuditRow(row: typeof auditLogs.$inferSelect): AuditEntity {
  return {
    id: String(row.id),
    actor_id: row.actorId ?? '',
    actor_role: row.actorRole ?? null,
    action: row.action,
    target_type: row.targetType ?? '',
    target_id: row.targetId ?? '',
    status: row.status === 'FAILED' ? 'FAILURE' : 'SUCCESS',
    message: row.message ?? null,
    meta: row.meta as Record<string, unknown> | null,
    created_at: row.createdAt.toISOString(),
  };
}

@Service()
export class AuditService {
  constructor(@Inject(DbService) private db: DbService) {}

  async list(page: number = 1, pageSize: number = 20): Promise<AuditResponseDto[]> {
    const offset = computeOffset({ page, pageSize });
    const rows = await this.db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(pageSize)
      .offset(offset);
    return rows.map((row) => AuditMapper.toResponse(mapAuditRow(row)));
  }

  async getById(id: string): Promise<AuditResponseDto | null> {
    const [row] = await this.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.id, Number(id)))
      .limit(1);
    if (!row) return null;
    return AuditMapper.toResponse(mapAuditRow(row));
  }

  async record(data: Partial<AuditEntity>): Promise<AuditResponseDto> {
    const now = new Date();
    const insertResult: any = await this.db.insert(auditLogs).values({
      actorId: data.actor_id,
      actorRole: data.actor_role,
      action: data.action ?? '',
      targetType: data.target_type,
      targetId: data.target_id,
      status: data.status === 'FAILURE' ? 'FAILED' : 'SUCCESS',
      message: data.message,
      meta: data.meta as Record<string, unknown>,
      createdAt: now,
    });
    const insertId = Number(
      insertResult.insertId ?? insertResult.lastInsertRowid ?? insertResult.meta?.last_row_id,
    );
    const [row] = await this.db.select().from(auditLogs).where(eq(auditLogs.id, insertId)).limit(1);
    return AuditMapper.toResponse(mapAuditRow(row));
  }

  async create(data: Partial<AuditEntity>): Promise<AuditResponseDto> {
    return this.record(data);
  }

  async update(id: string, data: Partial<AuditEntity>): Promise<{ affectedRows: number }> {
    const numericId = Number(id);
    const updateData: Record<string, unknown> = {};
    if (data.actor_id !== undefined) updateData.actorId = data.actor_id;
    if (data.actor_role !== undefined) updateData.actorRole = data.actor_role;
    if (data.action !== undefined) updateData.action = data.action;
    if (data.target_type !== undefined) updateData.targetType = data.target_type;
    if (data.target_id !== undefined) updateData.targetId = data.target_id;
    if (data.status !== undefined)
      updateData.status = data.status === 'FAILURE' ? 'FAILED' : 'SUCCESS';
    if (data.message !== undefined) updateData.message = data.message;
    if (data.meta !== undefined) updateData.meta = data.meta;

    const result = await this.db
      .update(auditLogs)
      .set(updateData)
      .where(eq(auditLogs.id, numericId));
    return { affectedRows: result[0]?.affectedRows ?? 0 };
  }

  async delete(id: string): Promise<{ affectedRows: number }> {
    const result = await this.db.delete(auditLogs).where(eq(auditLogs.id, Number(id)));
    return { affectedRows: result[0]?.affectedRows ?? 0 };
  }
}

export default AuditService;
