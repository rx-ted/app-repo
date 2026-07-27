import { Inject, Service } from '@rx-ted/packages-honest';
import {
  IAuthContextService,
  type AuthUser,
  type AuthSession,
} from '@/common/guards/auth-context.interface';
import { AuthRepository } from '@/modules/auth/repositories/auth.repository';
import { SessionRepository } from '@/modules/auth/repositories/session.repository';

@Service()
export class AuthContextService extends IAuthContextService {
  constructor(
    @Inject(AuthRepository) private authRepo: AuthRepository,
    @Inject(SessionRepository) private sessionRepo: SessionRepository,
  ) {
    super();
  }

  async resolveUser(username: string): Promise<AuthUser | null> {
    const entity = await this.authRepo.getSessionUserByUsername(username);
    if (!entity) return null;
    return {
      userId: entity.userId,
      username: entity.username,
      roles: entity.roles,
      permissions: entity.permissions,
    };
  }

  async findSession(sessionId: string): Promise<AuthSession | null> {
    const record = await this.sessionRepo.findById(sessionId);
    if (!record) return null;
    return {
      id: record.id,
      ip: record.ip,
      lastActiveAt: record.lastActiveAt,
      userId: record.userId,
    };
  }

  async touchSession(session: AuthSession): Promise<void> {
    const record = await this.sessionRepo.findById(session.id);
    if (!record) return;
    record.lastActiveAt = new Date().toISOString();
    await this.sessionRepo.create(record);
  }
}
