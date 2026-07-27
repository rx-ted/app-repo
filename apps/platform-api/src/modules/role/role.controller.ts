import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@rx-ted/packages-honest';
import { z } from '@/lib/openapi';
import { AuthGuard, RolesGuard, PermissionsGuard } from '@/common/guards';
import { Roles, Permissions } from '@/common/decorators';
import { PERMISSIONS, ROLES } from '@/constants';
import { RoleEntitySchema } from '@/modules/role/entities/role.entity';
import {
  CreateRoleSchema,
  RoleListQuerySchema,
  UpdateRoleSchema,
} from '@/modules/role/dtos/role.schema';
import RoleService from '@/modules/role/role.service';

@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Roles(ROLES.ADMIN)
@Permissions(PERMISSIONS.ROLE_ACCESS_ANY)
@Controller('role', {
  tag: { name: 'Roles', description: '角色管理相关接口' },
})
export class RoleController {
  constructor(@Inject(RoleService) private readonly roleService: RoleService) {}

  @Get('', {
    apiDoc: {
      summary: '列出所有角色',
      tags: ['Roles'],
      request: {
        query: RoleListQuerySchema,
      },
      responses: {
        200: {
          description: '角色列表',
          schema: z.object({
            data: z.array(RoleEntitySchema),
            total: z.number(),
          }),
        },
      },
    },
  })
  async list(@Query('page') _page?: number, @Query('pageSize') _pageSize?: number) {
    return this.roleService.list();
  }

  @Get(':id', {
    apiDoc: {
      summary: '根据ID获取角色',
      tags: ['Roles'],
      request: {
        params: z.object({ id: z.string() }),
      },
      responses: {
        200: {
          description: '角色详情',
          schema: RoleEntitySchema,
        },
      },
    },
  })
  async getById(@Param('id') id: string) {
    return this.roleService.getById(id);
  }

  @Post('', {
    apiDoc: {
      summary: '创建新角色',
      tags: ['Roles'],
      request: {
        body: CreateRoleSchema,
      },
      responses: {
        201: {
          description: '角色创建成功',
          schema: z.object({ affectedRows: z.number(), id: z.string().optional() }),
        },
      },
    },
  })
  async create(@Body() body: unknown) {
    return this.roleService.create(
      body as Partial<import('@/modules/role/entities/role.entity.ts').RoleEntity>,
    );
  }

  @Put(':id', {
    apiDoc: {
      summary: '更新角色',
      tags: ['Roles'],
      request: {
        params: z.object({ id: z.string() }),
        body: UpdateRoleSchema,
      },
      responses: {
        200: {
          description: '角色更新成功',
          schema: z.object({ affectedRows: z.number() }),
        },
      },
    },
  })
  async update(@Param('id') id: string, @Body() body: unknown) {
    return this.roleService.update(
      id,
      body as Partial<import('@/modules/role/entities/role.entity.ts').RoleEntity>,
    );
  }

  @Delete(':id', {
    apiDoc: {
      summary: '删除角色',
      tags: ['Roles'],
      request: {
        params: z.object({ id: z.string() }),
      },
      responses: {
        200: {
          description: '角色删除成功',
          schema: z.object({ affectedRows: z.number() }),
        },
      },
    },
  })
  async delete(@Param('id') id: string) {
    return this.roleService.delete(id);
  }
}
