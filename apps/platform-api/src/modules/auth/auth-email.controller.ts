import {
  Body,
  Controller,
  Ctx,
  Inject,
  Ip,
  Post,
  UA,
  UseMiddleware,
} from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { setCookie } from 'hono/cookie';
import { z } from '@/lib/openapi';
import { RateLimitMiddleware } from '@/common/middleware';
import { Public, RateLimit } from '@/common/decorators';
import EmailAuthService from '@/modules/auth/services/email-auth.service';
import {
  SendEmailCodeSchema,
  EmailLoginSchema,
  EmailResetPasswordSchema,
} from '@/modules/auth/dtos/auth-email.schema';
import { AUTH } from '@/constants/auth';
import { RATE_LIMIT } from '@/constants';

function setRefreshCookie(c: Context, token: string, maxAge: number = AUTH.COOKIE_MAX_AGE_SECONDS) {
  setCookie(c, AUTH.COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: AUTH.COOKIE_PATH,
    maxAge,
  });
}

@Controller('auth/email', {
  tag: { name: 'Auth', description: '邮箱验证码认证' },
})
class AuthEmailController {
  constructor(@Inject(EmailAuthService) private readonly emailAuth: EmailAuthService) {}

  @Public()
  @RateLimit([
    {
      limit: RATE_LIMIT.AUTH_EMAIL_SEND_CODE.limit,
      window: RATE_LIMIT.AUTH_EMAIL_SEND_CODE.window,
      keyBy: 'ip',
    },
  ])
  @UseMiddleware(RateLimitMiddleware)
  @Post('send-code', {
    apiDoc: {
      summary: '发送邮箱验证码',
      tags: ['Auth'],
      request: { body: SendEmailCodeSchema },
      responses: {
        200: {
          description: '验证码发送成功',
          schema: z.object({
            ttlSeconds: z.number(),
            resendCooldownSeconds: z.number(),
          }),
        },
      },
    },
  })
  async sendCode(@Body() body: z.infer<typeof SendEmailCodeSchema>, @Ctx() c: Context) {
    const { email, purpose, locale } = SendEmailCodeSchema.parse(body);
    return this.emailAuth.sendEmailCode(email, purpose, locale);
  }

  @Public()
  @RateLimit([
    {
      limit: RATE_LIMIT.AUTH_EMAIL_LOGIN.limit,
      window: RATE_LIMIT.AUTH_EMAIL_LOGIN.window,
      keyBy: 'ip',
    },
  ])
  @UseMiddleware(RateLimitMiddleware)
  @Post('login', {
    apiDoc: {
      summary: '邮箱验证码登录',
      tags: ['Auth'],
      request: { body: EmailLoginSchema },
      responses: {
        200: {
          description: '登录成功',
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
    @Body() body: z.infer<typeof EmailLoginSchema>,
    @Ctx() c: Context,
    @Ip() ip?: string,
    @UA() userAgent?: string,
  ) {
    const { email, code } = EmailLoginSchema.parse(body);
    const result = await this.emailAuth.emailLogin(email, code, ip, userAgent);
    setRefreshCookie(c, result.refreshToken);
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      sessionId: result.sessionId,
    };
  }

  @Public()
  @RateLimit([
    {
      limit: RATE_LIMIT.AUTH_EMAIL_RESET_PASSWORD.limit,
      window: RATE_LIMIT.AUTH_EMAIL_RESET_PASSWORD.window,
      keyBy: 'ip',
    },
  ])
  @UseMiddleware(RateLimitMiddleware)
  @Post('reset-password', {
    apiDoc: {
      summary: '邮箱验证码重置密码',
      tags: ['Auth'],
      request: { body: EmailResetPasswordSchema },
      responses: {
        200: {
          description: '密码重置成功',
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
  })
  async resetPassword(@Body() body: z.infer<typeof EmailResetPasswordSchema>) {
    const { email, code, password } = EmailResetPasswordSchema.parse(body);
    return this.emailAuth.emailResetPassword(email, code, password);
  }
}

export default AuthEmailController;
