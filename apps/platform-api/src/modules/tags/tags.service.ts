import { Inject, Service } from '@rx-ted/packages-honest';
import { and, eq, inArray } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { permissions, rolePermissionMappings } from '@/schema';
import { userRoleMappings } from '@/schema';
import { users, userProfiles } from '@/schema';
import type { TagResponseDto } from '@/modules/tags/dtos/tags.response.dto';
import { TagMapper } from '@/modules/tags/mappers/tags.mapper';
import { TagsRepository } from '@/modules/tags/repositories/tags.repository';

@Service()
class TagsService {
  constructor(
    @Inject(TagsRepository) private readonly tagsRepo: TagsRepository,
    @Inject(DbService) private db: DbService,
  ) {}

  async findAll(
    page: number = 1,
    pageSize: number = 10,
  ): Promise<{ data: TagResponseDto[]; total: number }> {
    const { tags, total } = await this.tagsRepo.list(page, pageSize);
    const data = tags.map(TagMapper.toResponse);
    return { data, total };
  }

  async findById(id: string): Promise<TagResponseDto | null> {
    const tag = await this.tagsRepo.findById(id);
    return tag ? TagMapper.toResponse(tag) : null;
  }

  async create(data: { name: string; slug: string; createdBy: string }): Promise<TagResponseDto> {
    const tag = await this.tagsRepo.create(data);
    return TagMapper.toResponse(tag);
  }

  async update(
    id: string,
    data: { name?: string; slug?: string },
    userId: string,
    roles: string[],
  ): Promise<TagResponseDto | null> {
    const existing = await this.tagsRepo.findById(id);
    if (!existing) return null;
    if (existing.createdBy !== userId && !roles.includes('admin')) return null;
    const tag = await this.tagsRepo.update(id, data);
    return tag ? TagMapper.toResponse(tag) : null;
  }

  async delete(id: string, userId: string, roles: string[]): Promise<boolean> {
    const existing = await this.tagsRepo.findById(id);
    if (!existing) return false;
    if (existing.createdBy !== userId && !roles.includes('admin')) return false;
    return this.tagsRepo.delete(id);
  }

  async findApprovers() {
    const permRows = await this.db
      .select({ id: permissions.id })
      .from(permissions)
      .where(and(eq(permissions.resource, 'tags'), eq(permissions.action, 'approve')))
      .limit(1);
    if (!permRows.length) return [];

    const roleRows = await this.db
      .select({ roleId: rolePermissionMappings.roleId })
      .from(rolePermissionMappings)
      .where(eq(rolePermissionMappings.permissionId, permRows[0].id));
    if (!roleRows.length) return [];
    const roleIds = roleRows.map((r) => r.roleId);

    const userRows = await this.db
      .select({
        userId: users.id,
        username: users.username,
        nickname: userProfiles.nickname,
        email: users.email,
      })
      .from(userRoleMappings)
      .innerJoin(users, eq(userRoleMappings.userId, users.id))
      .leftJoin(userProfiles, eq(userRoleMappings.userId, userProfiles.userId))
      .where(inArray(userRoleMappings.roleId, roleIds));

    const seen = new Set<string>();
    return userRows.filter((r) => {
      if (seen.has(r.userId)) return false;
      seen.add(r.userId);
      return true;
    });
  }
}

export default TagsService;
