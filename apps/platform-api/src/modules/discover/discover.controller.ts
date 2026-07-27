import {
  Body,
  Controller,
  Ctx,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { z } from '@/lib/openapi';
import { AuthGuard, RolesGuard, PermissionsGuard } from '@/common/guards';
import { Public, Roles, Permissions } from '@/common/decorators';
import { PERMISSIONS, ROLES } from '@/constants';
import DiscoverService from '@/modules/discover/discover.service';
import {
  CreateDiscoverySchema,
  UpdateDiscoverySchema,
  SendFriendLinkCodeSchema,
} from '@/modules/discover/dtos/discover.schema';

@Controller('discoveries', {
  tag: { name: 'Discoveries', description: '友情链接管理' },
})
class DiscoverController {
  constructor(@Inject(DiscoverService) private readonly discoverService: DiscoverService) {}

  @Public()
  @Get('', {
    apiDoc: {
      summary: '获取友链列表',
      tags: ['Discoveries'],
      responses: { 200: { description: '友情链接列表' } },
    },
  })
  async list(@Query('category') category?: string, @Query('status') status?: string) {
    return this.discoverService.listActive(category, status);
  }

  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Roles(ROLES.ADMIN)
  @Permissions(PERMISSIONS.DISCOVER_ACCESS_ANY)
  @Get('all', {
    apiDoc: { summary: '列出所有友情链接', tags: ['Discoveries'] },
  })
  async listAll(@Query('status') status?: string, @Query('category') category?: string) {
    return this.discoverService.listAll(status, category);
  }

  @Public()
  @Post('send-code', {
    apiDoc: {
      summary: '发送友链验证码',
      tags: ['Discoveries'],
      request: { body: SendFriendLinkCodeSchema },
    },
  })
  async sendCode(@Body() body: unknown) {
    const { email } = SendFriendLinkCodeSchema.parse(body);
    return this.discoverService.sendCode(email);
  }

  @Public()
  @Post('', {
    apiDoc: {
      summary: '创建友情链接（需邮箱验证）',
      tags: ['Discoveries'],
      request: { body: CreateDiscoverySchema },
    },
  })
  async create(@Body() body: unknown, @Ctx() c: Context) {
    const data = CreateDiscoverySchema.parse(body);
    const id = await this.discoverService.create(data);

    const ctx = c.executionCtx as { waitUntil: (p: Promise<unknown>) => void } | undefined;
    if (ctx?.waitUntil) {
      ctx.waitUntil(this.discoverService.runSingleHealthCheck(id));
    }
  }

  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Roles(ROLES.ADMIN)
  @Permissions(PERMISSIONS.DISCOVER_MANAGE)
  @Put(':id', {
    apiDoc: {
      summary: '更新友情链接',
      tags: ['Discoveries'],
      request: { params: z.object({ id: z.string() }), body: UpdateDiscoverySchema },
    },
  })
  async update(@Param('id') id: string, @Body() body: unknown) {
    const data = UpdateDiscoverySchema.parse(body);
    await this.discoverService.update(Number(id), data);
  }

  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Roles(ROLES.ADMIN)
  @Permissions(PERMISSIONS.DISCOVER_MANAGE)
  @Delete(':id', {
    apiDoc: {
      summary: '删除友情链接',
      tags: ['Discoveries'],
      request: { params: z.object({ id: z.string() }) },
    },
  })
  async delete(@Param('id') id: string) {
    await this.discoverService.delete(Number(id));
  }

  // Health check endpoint — admin only, or triggered internally
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Roles(ROLES.ADMIN)
  @Permissions(PERMISSIONS.DISCOVER_MANAGE)
  @Post(':id/check', {
    apiDoc: {
      summary: '检查单个友链健康状态',
      tags: ['Discoveries'],
    },
  })
  async check(@Param('id') id: string) {
    await this.discoverService.runSingleHealthCheck(Number(id));
  }
}

export default DiscoverController;
