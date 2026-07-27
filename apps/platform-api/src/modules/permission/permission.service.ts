import { Inject, Service } from '@rx-ted/packages-honest';
import { eq } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { CacheService, cacheable } from '@rx-ted/packages-honest-plugins/cache';
import { permissions } from '@/schema';
import type { PermissionResponseDto } from '@/modules/permission/dtos/permission.response.dto';
import type { PermissionEntity } from '@/modules/permission/entities/permission.entity';
import { CACHE } from '@/constants';

@Service()
export class PermissionService {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  async list(): Promise<PermissionResponseDto[]> {
    return cacheable(this.cache, 'permissions:list', CACHE.USER_SESSION_TTL, async () => {
      const rows = await this.db.select().from(permissions);
      return rows.map((row) => ({
        id: String(row.id),
        name: row.name ?? '',
        code: `${row.resource}:${row.action}`,
        description: row.name ?? `${row.resource}:${row.action}`,
        created_at: row.createdAt.toISOString(),
      }));
    });
  }

  async findIdByName(name: string): Promise<number | null> {
    const [row] = await this.db
      .select()
      .from(permissions)
      .where(eq(permissions.name, name))
      .limit(1);
    return row?.id ?? null;
  }

  async upsert(data: Partial<PermissionEntity>): Promise<{ permission_id: number }> {
    const insertResult: any = await this.db.insert(permissions).values({
      resource: data.code?.split(':')[0] ?? '',
      action: data.code?.split(':')[1] ?? '',
      scope: '',
      name: data.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const insertId = Number(
      insertResult.insertId ?? insertResult.lastInsertRowid ?? insertResult.meta?.last_row_id,
    );
    await this.cache.delete('permissions:list');
    return { permission_id: insertId };
  }

  async remove(data: {
    permission_id: number;
    target_user_id?: string;
  }): Promise<{ permission_id: number }> {
    await this.db.delete(permissions).where(eq(permissions.id, data.permission_id));
    await this.cache.delete('permissions:list');
    return { permission_id: data.permission_id };
  }
}

export default PermissionService;
