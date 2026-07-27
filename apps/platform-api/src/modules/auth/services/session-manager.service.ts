import jwt from 'jsonwebtoken';
import { Inject, Service } from '@rx-ted/packages-honest';
import { HTTPException } from 'hono/http-exception';
import { AuthRepository } from '@/modules/auth/repositories/auth.repository';
import type { AuthEntity } from '@/modules/auth/entities/auth.entity';
import type { SessionRecord } from '@/modules/auth/entities/session.entity';
import { SessionRepository } from '@/modules/auth/repositories/session.repository';
import { AUTH } from '@/constants/auth';
import { CACHE_KEYS, LOCALE } from '@/constants';
import { GeoipService } from '@/modules/geoip/geoip.service';
import AuditService from '@/modules/audit/audit.service';
import { generateRefreshToken, hashRefreshToken } from '@/modules/auth/auth.utils';
import { toUserProfile } from '@/modules/auth/auth.do';
import type { UserProfile } from '@/modules/auth/auth.do';
import { env } from '@rx-ted/packages-core';

@Service()
class SessionManagerService {
  constructor(
    @Inject(AuthRepository) private authRepo: AuthRepository,
    @Inject(SessionRepository) private sessionRepo: SessionRepository,
    @Inject(GeoipService) private geoipService: GeoipService,
    @Inject(AuditService) private audit: AuditService,
  ) {}

  private async resolveCity(ip?: string): Promise<string | null> {
    return ip ? await this.geoipService.lookup(ip) : null;
  }

  async resolveUserProfile(user: AuthEntity): Promise<UserProfile> {
    const profile = await this.authRepo.getUserProfile(user.userId);
    return toUserProfile({
      userId: user.userId,
      username: user.username,
      email: user.email,
      preferredLocale: user.preferredLocale ?? LOCALE.DEFAULT,
      status: user.status ?? 'NORMAL',
      tokenVersion: user.tokenVersion,
      lastLoginAt: user.lastLoginAt,
      nickname: profile?.nickname ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      gender: profile?.gender ?? null,
      birthday: profile?.birthday ?? null,
      bio: profile?.bio ?? null,
      website: profile?.website ?? null,
      location: profile?.location ?? null,
    });
  }

  async getSession(username: string) {
    const user = await this.authRepo.getSessionUserByUsername(username);
    if (!user) return null;
    return this.resolveUserProfile(user);
  }

  async createSessionAndTokens(user: AuthEntity, ip?: string, userAgent?: string) {
    const sessionId = crypto.randomUUID();
    const refreshToken = generateRefreshToken();
    const now = new Date().toISOString();

    const session: SessionRecord = {
      id: sessionId,
      userId: user.userId,
      username: user.username,
      deviceId: null,
      ip: ip ?? null,
      city: await this.resolveCity(ip),
      userAgent: userAgent ?? null,
      refreshTokenHash: refreshToken.hash,
      createdAt: now,
      lastActiveAt: now,
    };

    await this.sessionRepo.create(session);
    await this.sessionRepo.addToUserSessions(user.userId, sessionId);
    await this.sessionRepo.setRefreshTokenHash(
      CACHE_KEYS.sessionHash(refreshToken.hash),
      sessionId,
    );
    await this.sessionRepo.setCurrentHashIndex(sessionId, refreshToken.hash);

    const jwtSecret: string = env.require('JWT_SECRET');
    const accessToken = jwt.sign(
      { username: user.username, sessionId, tokenVersion: user.tokenVersion },
      jwtSecret,
      { expiresIn: AUTH.ACCESS_TOKEN_EXPIRES_IN },
    );

    return {
      accessToken,
      refreshToken: refreshToken.raw,
      expiresIn: AUTH.ACCESS_TOKEN_EXPIRES_IN,
      sessionId,
    };
  }

  async refresh(rawRefreshToken: string, ip?: string, userAgent?: string) {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const hashKey = CACHE_KEYS.sessionHash(tokenHash);
    const sessionId = await this.sessionRepo.getRefreshTokenHash(hashKey);

    if (!sessionId) {
      throw new HTTPException(401, { message: 'Invalid or expired refresh token' });
    }

    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new HTTPException(401, { message: 'Session expired' });
    }

    const currentHash = await this.sessionRepo.getCurrentHashIndex(sessionId);
    if (currentHash && currentHash !== tokenHash) {
      await this.sessionRepo.revokeUserSessions(session.userId);
      throw new HTTPException(401, {
        message: 'Refresh token reuse detected. All sessions have been revoked.',
      });
    }

    const newRefresh = generateRefreshToken();
    const now = new Date().toISOString();

    await this.sessionRepo.deleteHashKey(hashKey);

    session.refreshTokenHash = newRefresh.hash;
    session.lastActiveAt = now;
    if (ip) {
      session.ip = ip;
      session.city = await this.resolveCity(ip);
    }
    if (userAgent) session.userAgent = userAgent;
    await this.sessionRepo.create(session);

    await this.sessionRepo.setRefreshTokenHash(CACHE_KEYS.sessionHash(newRefresh.hash), session.id);
    await this.sessionRepo.setCurrentHashIndex(sessionId, newRefresh.hash);

    const jwtSecret: string = env.require('JWT_SECRET');
    const accessToken = jwt.sign({ username: session.username, sessionId: session.id }, jwtSecret, {
      expiresIn: AUTH.ACCESS_TOKEN_EXPIRES_IN,
    });

    return {
      accessToken,
      refreshToken: newRefresh.raw,
      expiresIn: AUTH.ACCESS_TOKEN_EXPIRES_IN,
    };
  }

  async logout(username: string, sessionId?: string) {
    if (sessionId) {
      await this.sessionRepo.deleteSession(sessionId);
    }
    await this.authRepo.invalidateSession(username);
    return { affectedRows: 1, rows: [] };
  }

  async updateUserProfileFields(
    userId: string,
    fields: { avatar_url?: string; nickname?: string; website?: string; location?: string },
  ) {
    return this.authRepo.updateProfile(userId, fields);
  }

  async recordAuditLogin(actorId: string, username: string, loginType: string, ip?: string) {
    await this.audit.record({
      actor_id: actorId,
      action: 'auth.login',
      target_type: 'user',
      target_id: actorId,
      status: 'SUCCESS',
      meta: { username, login_type: loginType, ip },
    });
  }

  async recordAuditRegister(actorId: string, username: string, loginType: string) {
    await this.audit.record({
      actor_id: actorId,
      action: 'auth.register',
      target_type: 'user',
      target_id: actorId,
      status: 'SUCCESS',
      meta: { username, login_type: loginType },
    });
  }

  async recordAuditBind(actorId: string, provider: string) {
    await this.audit.record({
      actor_id: actorId,
      action: 'auth.bind',
      target_type: 'user_oauth',
      target_id: actorId,
      status: 'SUCCESS',
      meta: { provider },
    });
  }
}

export default SessionManagerService;
