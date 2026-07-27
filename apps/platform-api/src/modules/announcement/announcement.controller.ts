import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  UseGuards,
} from '@rx-ted/packages-honest';
import { z } from '@/lib/openapi';
import { AuthGuard, RolesGuard, PermissionsGuard } from '@/common/guards';
import { Public, Roles, Permissions } from '@/common/decorators';
import { PERMISSIONS, ROLES } from '@/constants';
import { AnnouncementEntitySchema } from '@/modules/announcement/entities/announcement.entity';
import AnnouncementService from '@/modules/announcement/announcement.service';
import {
  AnnouncementListQuerySchema,
  CreateAnnouncementSchema,
  UpdateAnnouncementSchema,
} from '@/modules/announcement/dtos/announcement.schema';

@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Roles(ROLES.ADMIN)
@Permissions(PERMISSIONS.ANNOUNCEMENT_ACCESS_ANY)
@Controller('announcement', {
  tag: { name: 'Announcements', description: '公告管理相关接口' },
})
export class AnnouncementController {
  constructor(
    @Inject(AnnouncementService) private readonly announcementService: AnnouncementService,
  ) {}

  @Public()
  @Get('active', {
    apiDoc: {
      summary: '获取活跃公告',
      tags: ['Announcements'],
      responses: {
        200: {
          description: '活跃公告列表',
          schema: z.array(AnnouncementEntitySchema),
        },
      },
    },
  })
  async getActive() {
    return this.announcementService.listActive();
  }

  @Public()
  @Get('', {
    apiDoc: {
      summary: '列出所有公告',
      tags: ['Announcements'],
      request: {
        query: AnnouncementListQuerySchema,
      },
      responses: {
        200: {
          description: '公告列表',
          schema: z.object({
            data: z.array(AnnouncementEntitySchema),
            total: z.number(),
          }),
        },
      },
    },
  })
  async list() {
    return this.announcementService.listAll();
  }

  @Public()
  @Get(':id', {
    apiDoc: {
      summary: '根据ID获取公告',
      tags: ['Announcements'],
      request: {
        params: z.object({ id: z.string() }),
      },
      responses: {
        200: {
          description: '公告详情',
          schema: AnnouncementEntitySchema,
        },
      },
    },
  })
  async getById(@Param('id') id: string) {
    return this.announcementService.getById(id);
  }

  @Post('', {
    apiDoc: {
      summary: '创建新公告',
      tags: ['Announcements'],
      request: {
        body: CreateAnnouncementSchema,
      },
      responses: {
        201: {
          description: '公告创建成功',
          schema: z.object({ affectedRows: z.number(), id: z.string().optional() }),
        },
      },
    },
  })
  async create(@Body() body: unknown) {
    return this.announcementService.create(
      body as Partial<
        import('@/modules/announcement/entities/announcement.entity').AnnouncementEntity
      >,
    );
  }

  @Put(':id', {
    apiDoc: {
      summary: '更新公告',
      tags: ['Announcements'],
      request: {
        params: z.object({ id: z.string() }),
        body: UpdateAnnouncementSchema,
      },
      responses: {
        200: {
          description: '公告更新成功',
          schema: z.object({ affectedRows: z.number() }),
        },
      },
    },
  })
  async update(@Param('id') id: string, @Body() body: unknown) {
    return this.announcementService.update(
      id,
      body as Partial<
        import('@/modules/announcement/entities/announcement.entity').AnnouncementEntity
      >,
    );
  }

  @Delete(':id', {
    apiDoc: {
      summary: '删除公告',
      tags: ['Announcements'],
      request: {
        params: z.object({ id: z.string() }),
      },
      responses: {
        200: {
          description: '公告删除成功',
          schema: z.object({ affectedRows: z.number() }),
        },
      },
    },
  })
  async delete(@Param('id') id: string) {
    return this.announcementService.delete(id);
  }
}
