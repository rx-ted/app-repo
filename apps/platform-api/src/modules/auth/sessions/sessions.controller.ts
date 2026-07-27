import { Controller, Ctx, Delete, Get, Inject, Param, UseGuards } from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from '@/lib/openapi';
import { AuthGuard } from '@/common/guards';
import type { AuthEntity } from '@/modules/auth/entities/auth.entity';
import { SessionRepository } from '@/modules/auth/repositories/session.repository';

@UseGuards(AuthGuard)
@Controller('auth/sessions', {
  tag: { name: 'Auth', description: 'Session management' },
})
class SessionsController {
  constructor(@Inject(SessionRepository) private readonly sessionRepo: SessionRepository) {}

  @Get('', {
    apiDoc: {
      summary: 'List all active sessions for current user',
      tags: ['Auth'],
      responses: {
        200: {
          description: 'List of sessions',
          schema: z.object({
            sessions: z.array(
              z.object({
                id: z.string(),
                deviceId: z.string().nullable(),
                ip: z.string().nullable(),
                userAgent: z.string().nullable(),
                isCurrent: z.boolean(),
                lastActiveAt: z.string(),
                createdAt: z.string(),
              }),
            ),
          }),
        },
      },
    },
  })
  async listSessions(@Ctx() c: Context) {
    const user = c.get('user') as AuthEntity;
    const currentSessionId = c.get('sessionId') as string | null;
    if (!user) {
      throw new HTTPException(401, { message: 'Not authenticated' });
    }

    const sessions = await this.sessionRepo.listUserSessions(
      user.userId,
      currentSessionId ?? undefined,
    );
    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        deviceId: s.deviceId,
        ip: s.ip,
        userAgent: s.userAgent,
        isCurrent: s.isCurrent,
        lastActiveAt: s.lastActiveAt,
        createdAt: s.createdAt,
      })),
    };
  }

  @Delete(':id', {
    apiDoc: {
      summary: 'Revoke a specific session',
      tags: ['Auth'],
      responses: {
        204: { description: 'Session revoked' },
      },
    },
  })
  async revokeSession(@Param('id') id: string, @Ctx() c: Context) {
    const user = c.get('user') as AuthEntity;
    const currentSessionId = c.get('sessionId') as string | null;
    if (!user) {
      throw new HTTPException(401, { message: 'Not authenticated' });
    }

    if (id === currentSessionId) {
      throw new HTTPException(400, {
        message: 'Cannot revoke current session. Use logout instead.',
      });
    }

    await this.sessionRepo.revokeSessionById(id, user.userId);
    return c.body(null, 204);
  }

  @Delete('', {
    apiDoc: {
      summary: 'Revoke all other sessions (keep current)',
      tags: ['Auth'],
      responses: {
        204: { description: 'All other sessions revoked' },
      },
    },
  })
  async revokeOtherSessions(@Ctx() c: Context) {
    const user = c.get('user') as AuthEntity;
    const currentSessionId = c.get('sessionId') as string | null;
    if (!user) {
      throw new HTTPException(401, { message: 'Not authenticated' });
    }

    const ids = await this.sessionRepo.getUserSessionIds(user.userId);
    for (const id of ids) {
      if (id !== currentSessionId) {
        await this.sessionRepo.revokeSessionById(id, user.userId);
      }
    }
    return c.body(null, 204);
  }
}

export default SessionsController;
