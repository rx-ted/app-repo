import { Inject, Service } from '@rx-ted/packages-honest';
import { and, eq, inArray } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { permissions, rolePermissionMappings } from '@/schema';
import { userRoleMappings } from '@/schema';
import { users, userProfiles } from '@/schema';
import { CategoryMapper } from '@/modules/category/mappers/category.mapper';
import { CategoryRepository } from '@/modules/category/repositories/category.repository';

@Service()
class CategoryService {
  constructor(
    @Inject(CategoryRepository) private categoryRepo: CategoryRepository,
    @Inject(DbService) private db: DbService,
  ) {}

  async list() {
    const categories = await this.categoryRepo.listCategories();
    return categories.map((c) => CategoryMapper.toResponse(c));
  }

  async findById(id: string) {
    const category = await this.categoryRepo.findCategoryById(id);
    return category ? CategoryMapper.toResponse(category) : null;
  }

  async findBySlug(slug: string) {
    const category = await this.categoryRepo.findCategoryBySlug(slug);
    return category ? CategoryMapper.toResponse(category) : null;
  }

  async create(data: { name: string; slug: string; description?: string; createdBy: string }) {
    const category = await this.categoryRepo.createCategory(data);
    return CategoryMapper.toResponse(category);
  }

  async update(
    id: string,
    data: { name?: string; slug?: string; description?: string },
    userId: string,
    roles: string[],
  ) {
    const existing = await this.categoryRepo.findCategoryById(id);
    if (!existing) return null;
    if (existing.createdBy !== userId && !roles.includes('admin')) return null;
    const category = await this.categoryRepo.updateCategory(id, data);
    return category ? CategoryMapper.toResponse(category) : null;
  }

  async delete(id: string, userId: string, roles: string[]): Promise<boolean> {
    const existing = await this.categoryRepo.findCategoryById(id);
    if (!existing) return false;
    if (existing.createdBy !== userId && !roles.includes('admin')) return false;
    return this.categoryRepo.deleteCategory(id);
  }

  async findApprovers() {
    const permRows = await this.db
      .select({ id: permissions.id })
      .from(permissions)
      .where(and(eq(permissions.resource, 'category'), eq(permissions.action, 'approve')))
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

export default CategoryService;
