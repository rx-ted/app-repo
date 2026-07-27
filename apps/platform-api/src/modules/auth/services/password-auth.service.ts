import { Inject, Service } from '@rx-ted/packages-honest';
import { HTTPException } from 'hono/http-exception';
import { conflict } from '@/lib/api-error';
import { AuthRepository } from '@/modules/auth/repositories/auth.repository';
import { verifyPassword, hashPassword } from '@/modules/auth/auth.utils';
import SessionManagerService from '@/modules/auth/services/session-manager.service';
import { LOGIN_TYPES } from '@/constants';
import { envParams } from '@/constants';

@Service()
class PasswordAuthService {
  constructor(
    @Inject(AuthRepository) private authRepo: AuthRepository,
    @Inject(SessionManagerService) private sessionManager: SessionManagerService,
  ) {}

  async login(username: string, password: string, ip?: string, userAgent?: string) {
    const user = await this.authRepo.getSessionUserByUsername(username);
    if (!user) {
      throw new HTTPException(401, { message: 'Invalid credentials' });
    }
    if (!user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      throw new HTTPException(401, { message: 'Invalid credentials' });
    }

    await this.authRepo.updateLastLoginAt(user.userId);
    await this.sessionManager.recordAuditLogin(user.userId, user.username, 'password', ip);

    return this.sessionManager.createSessionAndTokens(user, ip, userAgent);
  }

  async register(
    input: {
      login_type: 'password';
      username: string;
      password: string;
      email?: string;
      nickname?: string;
      avatar_url?: string;
      bio?: string;
      location?: string;
    },
    ip?: string,
    userAgent?: string,
  ) {
    if (await this.authRepo.findByUsername(input.username)) {
      throw conflict('USERNAME_ALREADY_EXISTS', '用户名已存在');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.authRepo.createUser(
      input.username,
      LOGIN_TYPES.PASSWORD,
      {
        passwordHash,
        email: input.email,
        nickname: input.nickname,
        avatarUrl: input.avatar_url,
        bio: input.bio,
        location: input.location,
      },
      envParams.ADMIN_USERS,
    );

    await this.sessionManager.recordAuditRegister(user.userId, user.username, 'password');

    return this.sessionManager.createSessionAndTokens(user, ip, userAgent);
  }
}

export default PasswordAuthService;
