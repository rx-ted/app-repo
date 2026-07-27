import { Inject, Service } from '@rx-ted/packages-honest';
import { eq, desc } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { permissionRequests, permissionRequestItems, userPermissionMappings } from '@/schema';
import type { PermissionRequestResponseDto } from '@/modules/permission-request/dtos/permission-request.response.dto';
import type { PermissionRequestEntity } from '@/modules/permission-request/entities/permission-request.entity';
import { PermissionRequestMapper } from '@/modules/permission-request/mappers/permission-request.mapper';
import AuditService from '@/modules/audit/audit.service';

function mapPermissionRequestRow(
  row: typeof permissionRequests.$inferSelect,
): PermissionRequestEntity {
  return {
    id: String(row.id),
    user_id: row.userId,
    permission_code: '',
    request_type: row.requestType ?? 'PERMISSION',
    target_user_id: row.targetUserId ?? null,
    path: row.path ?? null,
    scope: row.scope ?? null,
    entity_type: row.entityType ?? null,
    entity_data: row.entityData ?? null,
    expires_at: row.expiresAt?.toISOString() ?? null,
    status: row.status ?? 'PENDING',
    reason: row.reason ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

@Service()
class PermissionRequestService {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(AuditService) private auditService: AuditService,
  ) {}

  async list(): Promise<PermissionRequestResponseDto[]> {
    const rows = await this.db
      .select()
      .from(permissionRequests)
      .orderBy(desc(permissionRequests.createdAt));

    const items = await this.db.select().from(permissionRequestItems);
    const itemsByRequestId = new Map<number, number[]>();
    for (const item of items) {
      const arr = itemsByRequestId.get(item.requestId) ?? [];
      arr.push(item.permissionId);
      itemsByRequestId.set(item.requestId, arr);
    }

    return rows.map((row) =>
      PermissionRequestMapper.toResponse({
        ...mapPermissionRequestRow(row),
        permission_ids: itemsByRequestId.get(row.id) ?? [],
      }),
    );
  }

  async listMine(userId: string): Promise<PermissionRequestResponseDto[]> {
    const rows = await this.db
      .select()
      .from(permissionRequests)
      .where(eq(permissionRequests.userId, userId))
      .orderBy(desc(permissionRequests.createdAt));

    const items = await this.db.select().from(permissionRequestItems);
    const itemsByRequestId = new Map<number, number[]>();
    for (const item of items) {
      const arr = itemsByRequestId.get(item.requestId) ?? [];
      arr.push(item.permissionId);
      itemsByRequestId.set(item.requestId, arr);
    }

    return rows.map((row) =>
      PermissionRequestMapper.toResponse({
        ...mapPermissionRequestRow(row),
        permission_ids: itemsByRequestId.get(row.id) ?? [],
      }),
    );
  }

  async create(
    data: {
      permission_ids?: number[];
      entity_type?: string;
      entity_data?: string;
      reason?: string;
    },
    userId: string,
  ): Promise<PermissionRequestResponseDto> {
    const now = new Date();
    const insertResult: any = await this.db.insert(permissionRequests).values({
      userId,
      requestType: 'PERMISSION',
      entityType: data.entity_type ?? null,
      entityData: data.entity_data ?? null,
      reason: data.reason ?? null,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    });
    const insertId = Number(
      insertResult.insertId ?? insertResult.lastInsertRowid ?? insertResult.meta?.last_row_id,
    );

    const requestId = insertId;

    for (const permissionId of data.permission_ids ?? []) {
      await this.db.insert(permissionRequestItems).values({ requestId, permissionId });
    }

    const [row] = await this.db
      .select()
      .from(permissionRequests)
      .where(eq(permissionRequests.id, requestId))
      .limit(1);

    const items = await this.db
      .select()
      .from(permissionRequestItems)
      .where(eq(permissionRequestItems.requestId, requestId));

    return PermissionRequestMapper.toResponse({
      ...mapPermissionRequestRow(row),
      permission_ids: items.map((i) => i.permissionId),
    });
  }

  async approve(
    _id: string,
    _data: { reason?: string },
    decidedBy: string,
  ): Promise<PermissionRequestResponseDto | null> {
    const id = Number(_id);

    const [existing] = await this.db
      .select()
      .from(permissionRequests)
      .where(eq(permissionRequests.id, id))
      .limit(1);
    if (existing?.status !== 'PENDING') return null;

    const items = await this.db
      .select()
      .from(permissionRequestItems)
      .where(eq(permissionRequestItems.requestId, id));

    const existingMappings = await this.db
      .select()
      .from(userPermissionMappings)
      .where(eq(userPermissionMappings.userId, existing.userId));
    const existingPermIds = new Set(existingMappings.map((m) => m.permissionId));

    for (const item of items) {
      if (existingPermIds.has(item.permissionId)) continue;
      await this.db
        .insert(userPermissionMappings)
        .values({ userId: existing.userId, permissionId: item.permissionId });
    }

    await this.db
      .update(permissionRequests)
      .set({
        status: 'APPROVED',
        decidedAt: new Date(),
        decisionReason: _data.reason ?? null,
        decidedBy,
      })
      .where(eq(permissionRequests.id, id));

    await this.auditService.record({
      actor_id: decidedBy,
      actor_role: null,
      action: 'permission_request.approve',
      target_type: 'permission_request',
      target_id: String(id),
      status: 'SUCCESS',
      message: _data.reason ?? null,
      meta: {
        target_user_id: existing.userId,
        permission_ids: items.map((i) => i.permissionId),
      },
    });

    const [row] = await this.db
      .select()
      .from(permissionRequests)
      .where(eq(permissionRequests.id, id))
      .limit(1);
    if (!row) return null;

    return PermissionRequestMapper.toResponse({
      ...mapPermissionRequestRow(row),
      permission_ids: items.map((i) => i.permissionId),
    });
  }

  async reject(
    _id: string,
    _data: { reason?: string },
    decidedBy: string,
  ): Promise<PermissionRequestResponseDto | null> {
    const id = Number(_id);

    const [existing] = await this.db
      .select()
      .from(permissionRequests)
      .where(eq(permissionRequests.id, id))
      .limit(1);
    if (existing?.status !== 'PENDING') return null;

    await this.db
      .update(permissionRequests)
      .set({
        status: 'REJECTED',
        decidedAt: new Date(),
        decisionReason: _data.reason ?? null,
        decidedBy,
      })
      .where(eq(permissionRequests.id, id));

    const items = await this.db
      .select()
      .from(permissionRequestItems)
      .where(eq(permissionRequestItems.requestId, id));

    await this.auditService.record({
      actor_id: decidedBy,
      actor_role: null,
      action: 'permission_request.reject',
      target_type: 'permission_request',
      target_id: String(id),
      status: 'SUCCESS',
      message: _data.reason ?? null,
      meta: {
        target_user_id: existing.userId,
        permission_ids: items.map((i) => i.permissionId),
      },
    });

    const [row] = await this.db
      .select()
      .from(permissionRequests)
      .where(eq(permissionRequests.id, id))
      .limit(1);
    if (!row) return null;

    return PermissionRequestMapper.toResponse({
      ...mapPermissionRequestRow(row),
      permission_ids: items.map((i) => i.permissionId),
    });
  }

  async delete(id: string): Promise<{ affectedRows: number }> {
    const result = await this.db
      .delete(permissionRequests)
      .where(eq(permissionRequests.id, Number(id)));
    return { affectedRows: result[0]?.affectedRows ?? 0 };
  }
}

export default PermissionRequestService;
