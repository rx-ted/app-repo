import { Controller, Get, Inject, Query, UseGuards } from '@rx-ted/packages-honest';
import { z } from '@/lib/openapi';
import { AuthGuard, RolesGuard, PermissionsGuard } from '@/common/guards';
import { Roles, Permissions } from '@/common/decorators';
import { DEFAULTS, PERMISSIONS, ROLES } from '@/constants';
import { UserListQuerySchema } from '@/modules/user/dtos/user.schema';
import { UserEntitySchema } from '@/modules/user/entities/user.entity';
import UserService from '@/modules/user/user.service';

@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Roles(ROLES.ADMIN)
@Permissions(PERMISSIONS.USERS_ACCESS_ANY)
@Controller('admin/user', {
  tag: { name: 'Admin', description: '管理员用户管理接口' },
})
export class AdminUserController {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  @Get('', {
    apiDoc: {
      summary: '列出所有用户（管理员）',
      tags: ['Admin', 'User'],
      request: {
        query: UserListQuerySchema,
      },
      responses: {
        200: {
          description: '用户列表',
          schema: z.object({
            data: z.array(UserEntitySchema),
            total: z.number(),
          }),
        },
      },
    },
  })
  async list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const p = Number(page ?? '1');
    const ps = Number(pageSize ?? `${DEFAULTS.MAX_PAGE_SIZE}`);
    return this.userService.list(p, ps);
  }
}
