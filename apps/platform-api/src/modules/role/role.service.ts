import { Inject, Service } from '@rx-ted/packages-honest';
import { eq, desc } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { roles } from '@/schema';
import type { RoleResponseDto } from '@/modules/role/dtos/role.response.dto';
import type { RoleEntity } from '@/modules/role/entities/role.entity';
import { RoleMapper } from '@/modules/role/mappers/role.mapper';

function mapRoleRow(row: typeof roles.$inferSelect): RoleEntity {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

@Service()
export class RoleService {
  constructor(@Inject(DbService) private db: DbService) {}
  async list(): Promise<RoleResponseDto[]> {
    const rows = await this.db.select().from(roles).orderBy(desc(roles.createdAt));
    return rows.map((row) => RoleMapper.toResponse(mapRoleRow(row)));
  }

  async getById(id: string): Promise<RoleResponseDto | null> {
    const [row] = await this.db
      .select()
      .from(roles)
      .where(eq(roles.id, Number(id)))
      .limit(1);
    if (!row) return null;
    return RoleMapper.toResponse(mapRoleRow(row));
  }

  async getByName(name: string): Promise<RoleResponseDto | null> {
    const [row] = await this.db.select().from(roles).where(eq(roles.name, name)).limit(1);
    if (!row) return null;
    return RoleMapper.toResponse(mapRoleRow(row));
  }

  async create(data: Partial<RoleEntity>): Promise<RoleResponseDto> {
    const now = new Date();
    const insertResult: any = await this.db.insert(roles).values({
      name: data.name ?? '',
      description: data.description,
      createdAt: now,
      updatedAt: now,
    });
    const insertId = Number(
      insertResult.insertId ?? insertResult.lastInsertRowid ?? insertResult.meta?.last_row_id,
    );
    const [row] = await this.db.select().from(roles).where(eq(roles.id, insertId)).limit(1);
    return RoleMapper.toResponse(mapRoleRow(row));
  }

  async update(id: string, data: Partial<RoleEntity>): Promise<RoleResponseDto | null> {
    const numericId = Number(id);
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;

    await this.db.update(roles).set(updateData).where(eq(roles.id, numericId));
    const [row] = await this.db.select().from(roles).where(eq(roles.id, numericId)).limit(1);
    if (!row) return null;
    return RoleMapper.toResponse(mapRoleRow(row));
  }

  async delete(id: string): Promise<{ affectedRows: number }> {
    const result = await this.db.delete(roles).where(eq(roles.id, Number(id)));
    return { affectedRows: result[0]?.affectedRows ?? 0 };
  }
}

export default RoleService;
