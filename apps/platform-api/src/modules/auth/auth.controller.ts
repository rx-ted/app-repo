import {
  Body,
  Controller,
  Ctx,
  Get,
  Inject,
  Ip,
  Post,
  UA,
  UseGuards,
  UseMiddleware,
} from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { setCookie } from 'hono/cookie';
import { z } from '@/lib/openapi';
import { AuthGuard } from '@/common/guards';
import { Public, RateLimit } from '@/common/decorators';
import { RateLimitMiddleware } from '@/common/middleware';
import SessionManagerService from '@/modules/auth/services/session-manager.service';
import PasswordAuthService from '@/modules/auth/services/password-auth.service';
import EmailAuthService from '@/modules/auth/services/email-auth.service';
import OAuthService from '@/modules/auth/services/oauth.service';
import { hashRefreshToken } from '@/modules/auth/auth.utils';
import { LoginSchema, RegisterSchema } from '@/modules/auth/dtos/auth.schema';
import type { AuthEntity } from '@/modules/auth/entities/auth.entity';
import { UserProfileSchema } from '@/modules/auth/auth.do';
import { SessionRepository } from '@/modules/auth/repositories/session.repository';
import { AUTH } from '@/constants/auth';
import { RATE_LIMIT } from '@/constants';

function getUser(c: Context): AuthEntity {
  return c.get('user') as AuthEntity;
}

function setRefreshCookie(c: Context, token: string, maxAge: number = AUTH.COOKIE_MAX_AGE_SECONDS) {
  setCookie(c, AUTH.COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: AUTH.COOKIE_PATH,
    maxAge,
  });
}

@UseGuards(AuthGuard)
@Controller('auth', {
  tag: { name: 'Auth', description: 'Authentication endpoints' },
})
class AuthController {
  constructor(
    @Inject(SessionManagerService) private readonly sessionManager: SessionManagerService,
    @Inject(PasswordAuthService) private readonly passwordAuth: PasswordAuthService,
    @Inject(EmailAuthService) private readonly emailAuth: EmailAuthService,
    @Inject(OAuthService) private readonly oauthService: OAuthService,
    @Inject(SessionRepository) private readonly sessionRepo: SessionRepository,
  ) {}

  @Get('me', {
    apiDoc: {
      summary: 'Get current session info',
      tags: ['Auth'],
      responses: {
        200: {
          description: 'Current session info',
          schema: UserProfileSchema,
        },
      },
    },
  })
  async getSession(@Ctx() c: Context) {
    const user = getUser(c);
    const session = await this.sessionManager.getSession(user.username);
    return c.json(session);
  }

  @Public()
  @UseMiddleware(RateLimitMiddleware)
  @Post('login', {
    apiDoc: {
      summary: 'Login',
      tags: ['Auth'],
      request: { body: LoginSchema },
      responses: {
        200: {
          description: 'Login successful',
          schema: z.object({
            accessToken: z.string(),
            expiresIn: z.string(),
            sessionId: z.string(),
          }),
        },
      },
    },
  })
  async login(
    @Body() body: z.infer<typeof LoginSchema>,
    @Ctx() c: Context,
    @Ip() ip: string,
    @UA() ua?: string,
  ) {
    const validated = LoginSchema.parse(body);
    const result = await this.passwordAuth.login(validated.username, validated.password, ip, ua);

    setRefreshCookie(c, result.refreshToken);

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      sessionId: result.sessionId,
    };
  }

  @Public()
  @RateLimit([
    { limit: RATE_LIMIT.AUTH_REFRESH.limit, window: RATE_LIMIT.AUTH_REFRESH.window, keyBy: 'ip' },
  ])
  @UseMiddleware(RateLimitMiddleware)
  @Post('refresh', {
    apiDoc: {
      summary: 'Refresh access token',
      tags: ['Auth'],
      responses: {
        200: {
          description: 'Token refreshed',
          schema: z.object({
            accessToken: z.string(),
            expiresIn: z.string(),
          }),
        },
      },
    },
  })
  async refresh(@Ctx() c: Context, @Ip() ip: string, @UA() ua?: string) {
    const refreshToken = c.req
      .header('Cookie')
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${AUTH.COOKIE_NAME}=`))
      ?.split('=')[1];

    if (!refreshToken) {
      throw new HTTPException(401, { message: 'Missing refresh token' });
    }

    const result = await this.sessionManager.refresh(refreshToken, ip, ua);

    setRefreshCookie(c, result.refreshToken);

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    };
  }

  @Public()
  @Post('logout', {
    apiDoc: {
      summary: 'Logout',
      tags: ['Auth'],
      responses: {
        200: {
          description: 'Logged out',
          schema: z.object({ affectedRows: z.number() }),
        },
      },
    },
  })
  async logout(@Ctx() c: Context) {
    const user = c.get('user') as AuthEntity | undefined;
    const refreshToken = c.req
      .header('Cookie')
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${AUTH.COOKIE_NAME}=`))
      ?.split('=')[1];

    let sessionId: string | undefined;
    if (refreshToken) {
      const tokenHash = hashRefreshToken(refreshToken);
      sessionId =
        (await this.sessionRepo.getRefreshTokenHash(`session:hash:${tokenHash}`)) ?? undefined;
    }

    const result = await this.sessionManager.logout(user?.username ?? '', sessionId);

    setRefreshCookie(c, '', 0);

    return result;
  }

  @Public()
  @RateLimit([
    {
      limit: RATE_LIMIT.AUTH_REGISTER.limit,
      window: RATE_LIMIT.AUTH_REGISTER.window,
      keyBy: 'user',
    },
  ])
  @UseMiddleware(RateLimitMiddleware)
  @Post('register', {
    apiDoc: {
      summary: 'Register new user (password / email code / third-party)',
      tags: ['Auth'],
      request: { body: RegisterSchema },
      responses: {
        201: {
          description: 'Registration successful',
          schema: z.object({
            accessToken: z.string(),
            expiresIn: z.string(),
            sessionId: z.string(),
          }),
        },
      },
    },
  })
  async register(
    @Body() body: z.infer<typeof RegisterSchema>,
    @Ctx() c: Context,
    @Ip() ip: string,
    @UA() ua?: string,
  ) {
    const validated = RegisterSchema.parse(body);

    let result: { accessToken: string; refreshToken: string; expiresIn: string; sessionId: string };

    switch (validated.login_type) {
      case 'password':
        result = await this.passwordAuth.register(validated, ip, ua);
        break;
      case 'email':
        result = await this.emailAuth.registerByEmail(validated, ip, ua);
        break;
      case 'github':
      case 'google':
      case 'wechat':
        result = await this.oauthService.registerViaOAuth(validated, ip, ua);
        break;
      default:
        throw new HTTPException(400, { message: 'Unsupported login type' });
    }

    setRefreshCookie(c, result.refreshToken);

    return c.json({
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      sessionId: result.sessionId,
    });
  }
}

export default AuthController;
