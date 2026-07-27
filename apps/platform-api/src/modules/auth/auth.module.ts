import { Module } from '@rx-ted/packages-honest';

import AuthController from '@/modules/auth/auth.controller';
import AuthEmailController from '@/modules/auth/auth-email.controller';
import AuthOAuthController from '@/modules/auth/auth-oauth.controller';
import SessionsController from '@/modules/auth/sessions/sessions.controller';
import SessionManagerService from '@/modules/auth/services/session-manager.service';
import PasswordAuthService from '@/modules/auth/services/password-auth.service';
import EmailAuthService from '@/modules/auth/services/email-auth.service';
import OAuthService from '@/modules/auth/services/oauth.service';
import { AuthRepository } from '@/modules/auth/repositories/auth.repository';
import { SessionRepository } from '@/modules/auth/repositories/session.repository';
import { AuthContextService } from '@/modules/auth/auth-context.service';
import { RateLimitMiddleware } from '@/common/middleware/rate-limit.middleware';
import MailService from '@/modules/mail/mail.service';

@Module({
  controllers: [AuthController, AuthEmailController, AuthOAuthController, SessionsController],
  services: [
    SessionManagerService,
    PasswordAuthService,
    EmailAuthService,
    OAuthService,
    AuthRepository,
    SessionRepository,
    AuthContextService,
    RateLimitMiddleware,
    MailService,
  ],
})
class AuthModule {}

export default AuthModule;
