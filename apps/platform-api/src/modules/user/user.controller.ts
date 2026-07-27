import {
  Body,
  Controller,
  Ctx,
  Get,
  Inject,
  Param,
  Post,
  Put,
  UseGuards,
} from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { z } from '@/lib/openapi';
import { AuthGuard } from '@/common/guards';
import { Public } from '@/common/decorators';
import {
  PublicProfileParamsSchema,
  UpdateProfileSchema,
  UpdateEmailSchema,
} from '@/modules/user/dtos/user.schema';
import { UserPublicProfileEntitySchema } from '@/modules/user/entities/user.entity';
import { UserProfileSchema } from '@/modules/auth/auth.do';
import UserService from '@/modules/user/user.service';

function getUserId(c: Context): string {
  return (c.get('user') as { userId: string }).userId;
}

@UseGuards(AuthGuard)
@Controller('user', {
  tag: { name: 'User', description: '用户管理相关接口' },
})
class UserController {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  @Put('heartbeat', {
    apiDoc: {
      summary: '发送心跳，更新在线状态',
      tags: ['User'],
      responses: { 200: { description: 'OK' } },
    },
  })
  async heartbeat(@Ctx() c: Context) {
    const user = c.get('user') as { sessionId: string } | undefined;
    if (user?.sessionId) {
      await this.userService.heartbeat(user.sessionId);
    }
    return { ok: true };
  }

  @Get('me', {
    apiDoc: {
      summary: '获取当前用户完整资料',
      tags: ['User'],
      responses: {
        200: {
          description: '当前用户完整资料',
          schema: UserProfileSchema,
        },
      },
    },
  })
  async getSelfProfile(@Ctx() c: Context) {
    return this.userService.getSelfProfile(getUserId(c));
  }

  @Put('me/profile', {
    apiDoc: {
      summary: '更新当前用户资料',
      tags: ['User'],
      request: {
        body: UpdateProfileSchema,
      },
      responses: {
        200: {
          description: '资料更新成功',
          schema: z.object({ affectedRows: z.number() }),
        },
      },
    },
  })
  async updateProfile(@Ctx() c: Context, @Body() body: unknown) {
    return this.userService.updateProfile(getUserId(c), body as Partial<Record<string, unknown>>);
  }

  @Post('me/email/send-code', {
    apiDoc: {
      summary: '发送邮箱验证码（更换邮箱）',
      tags: ['User'],
      request: {
        body: z.object({ email: z.string().email() }),
      },
      responses: { 200: { description: '验证码已发送' } },
    },
  })
  async sendEmailChangeCode(@Ctx() c: Context, @Body() body: unknown) {
    const { email } = body as { email: string };
    return this.userService.sendEmailChangeCode(getUserId(c), email);
  }

  @Put('me/email', {
    apiDoc: {
      summary: '验证并更新邮箱',
      tags: ['User'],
      request: {
        body: UpdateEmailSchema,
      },
      responses: { 200: { description: '邮箱更新成功' } },
    },
  })
  async updateEmail(@Ctx() c: Context, @Body() body: unknown) {
    const { email, code } = body as { email: string; code: string };
    return this.userService.updateEmail(getUserId(c), email, code);
  }

  @Public()
  @Get('public/:username', {
    apiDoc: {
      summary: '获取用户公开资料',
      tags: ['User'],
      request: {
        params: PublicProfileParamsSchema,
      },
      responses: {
        200: {
          description: '用户公开资料',
          schema: UserPublicProfileEntitySchema,
        },
      },
    },
  })
  async getPublicProfile(@Param('username') username: string) {
    return this.userService.getPublicProfile(username);
  }

  @Public()
  @Get(':id/brief', {
    apiDoc: {
      summary: '获取用户简档（供评论作者卡片使用）',
      tags: ['User'],
      request: {
        params: z.object({ id: z.string() }),
      },
      responses: {
        200: {
          description: '用户简档信息',
        },
      },
    },
  })
  async getUserBrief(@Param('id') id: string, @Ctx() c: Context) {
    const currentUserId = getUserId(c);
    return this.userService.getBrief(id, currentUserId);
  }
}

export default UserController;
