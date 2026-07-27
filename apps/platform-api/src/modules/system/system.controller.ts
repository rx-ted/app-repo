import { Controller, Get, Inject, Post, Param, UseGuards } from '@rx-ted/packages-honest';
import { z } from '@/lib/openapi';
import { EnvironmentGuard, InitKeyGuard } from '@/common/guards';
import { Public } from '@/common/decorators';
import SystemInitService from '@/modules/system/system-init.service';
import SystemInfoService from '@/modules/system/system-info.service';

@UseGuards(EnvironmentGuard, InitKeyGuard)
@Controller('system/init', {
  tag: { name: 'System Init', description: '系统初始化接口' },
})
class SystemController {
  constructor(@Inject(SystemInitService) private initService: SystemInitService) {}

  @Post('', {
    apiDoc: {
      summary: '运行所有初始化模块',
      tags: ['System Init'],
      responses: {
        200: {
          description: '初始化结果',
          schema: z.object({
            data: z.array(
              z.object({
                module: z.string(),
                status: z.string(),
                error: z.string().optional(),
              }),
            ),
          }),
        },
      },
    },
  })
  async runAll() {
    const results = await this.initService.runAll();
    return { data: results };
  }

  @Post(':module', {
    apiDoc: {
      summary: '运行指定初始化模块',
      tags: ['System Init'],
      request: {
        params: z.object({ module: z.string() }),
      },
      responses: {
        200: {
          description: '初始化结果',
          schema: z.object({
            data: z.object({
              module: z.string(),
              status: z.string(),
              error: z.string().optional(),
            }),
          }),
        },
      },
    },
  })
  async runModule(@Param('module') moduleName: string) {
    const result = await this.initService.runModule(moduleName);
    if (result.status === 'failed') {
      return { error: result.error };
    }
    return { data: result };
  }
}

@Controller('system', {
  tag: { name: 'System Info', description: '站点信息接口' },
})
class SystemInfoController {
  constructor(@Inject(SystemInfoService) private readonly infoService: SystemInfoService) {}

  @Public()
  @Get('info', {
    apiDoc: {
      summary: '获取系统/站点信息',
      tags: ['System Info'],
      responses: { 200: { description: '系统信息' } },
    },
  })
  async info() {
    return { data: await this.infoService.getInfo() };
  }
}

export { SystemController, SystemInfoController };
