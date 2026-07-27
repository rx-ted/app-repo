import { Inject, Service } from '@rx-ted/packages-honest';
import { CacheService } from '@rx-ted/packages-honest-plugins/cache';
import type { SessionRecord } from '@/modules/auth/entities/session.entity';
import { AUTH } from '@/constants/auth';

@Service()
class SessionRepository {
  constructor(@Inject(CacheService) private cache: CacheService) {}

  async create(session: SessionRecord): Promise<void> {
    await this.cache.set(`session:${session.id}`, session, AUTH.SESSION_TTL_SECONDS);
    await this.cache.set(
      `session:hash-index:${session.id}`,
      session.refreshTokenHash,
      AUTH.SESSION_TTL_SECONDS,
    );
  }

  async findById(id: string): Promise<SessionRecord | null> {
    return this.cache.get<SessionRecord>(`session:${id}`);
  }

  async delete(key: string): Promise<void> {
    await this.cache.delete(key);
  }

  async deleteSession(id: string): Promise<void> {
    const session = await this.findById(id);
    if (!session) return;

    await this.cache.delete(`session:${id}`);
    await this.cache.delete(`session:hash:${session.refreshTokenHash}`);
    await this.cache.delete(`session:hash-index:${id}`);
  }

  async getCurrentHashIndex(sessionId: string): Promise<string | null> {
    return this.cache.get<string>(`session:hash-index:${sessionId}`);
  }

  async setCurrentHashIndex(sessionId: string, hash: string): Promise<void> {
    await this.cache.set(`session:hash-index:${sessionId}`, hash, AUTH.SESSION_TTL_SECONDS);
  }

  async getRefreshTokenHash(hashKey: string): Promise<string | null> {
    return this.cache.get<string>(hashKey);
  }

  async setRefreshTokenHash(hashKey: string, sessionId: string): Promise<void> {
    await this.cache.set(hashKey, sessionId, AUTH.SESSION_TTL_SECONDS);
  }

  async deleteHashKey(hashKey: string): Promise<void> {
    await this.cache.delete(hashKey);
  }

  async addToUserSessions(userId: string, sessionId: string): Promise<void> {
    const key = `user:sessions:${userId}`;
    const ids = (await this.cache.get<string[]>(key)) ?? [];
    if (!ids.includes(sessionId)) {
      ids.push(sessionId);
      await this.cache.set(key, ids, AUTH.SESSION_TTL_SECONDS);
    }
  }

  async removeFromUserSessions(userId: string, sessionId: string): Promise<void> {
    const key = `user:sessions:${userId}`;
    const ids = (await this.cache.get<string[]>(key)) ?? [];
    await this.cache.set(
      key,
      ids.filter((id) => id !== sessionId),
      AUTH.SESSION_TTL_SECONDS,
    );
  }

  async getUserSessionIds(userId: string): Promise<string[]> {
    return (await this.cache.get<string[]>(`user:sessions:${userId}`)) ?? [];
  }

  async revokeUserSessions(userId: string): Promise<void> {
    const ids = await this.getUserSessionIds(userId);
    for (const id of ids) {
      await this.cache.delete(`session:${id}`);
      await this.cache.delete(`session:hash-index:${id}`);
    }
    await this.cache.delete(`user:sessions:${userId}`);
  }

  async listUserSessions(
    userId: string,
    currentSessionId?: string,
  ): Promise<
    Array<{
      id: string;
      deviceId: string | null;
      ip: string | null;
      userAgent: string | null;
      isCurrent: boolean;
      lastActiveAt: string;
      createdAt: string;
    }>
  > {
    const ids = await this.getUserSessionIds(userId);

    const results: Array<{
      id: string;
      deviceId: string | null;
      ip: string | null;
      userAgent: string | null;
      isCurrent: boolean;
      lastActiveAt: string;
      createdAt: string;
    }> = [];

    for (const id of ids) {
      const session = await this.findById(id);
      if (!session) continue;

      results.push({
        id: session.id,
        deviceId: session.deviceId,
        ip: session.ip,
        userAgent: session.userAgent,
        isCurrent: session.id === currentSessionId,
        lastActiveAt: session.lastActiveAt,
        createdAt: session.createdAt,
      });
    }

    results.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());

    return results;
  }

  async revokeSessionById(id: string, userId: string): Promise<void> {
    const session = await this.findById(id);
    if (!session) {
      throw new Error('Session not found');
    }
    if (session.userId !== userId) {
      throw new Error('Session does not belong to user');
    }

    await this.cache.delete(`session:${id}`);
    await this.cache.delete(`session:hash:${session.refreshTokenHash}`);
    await this.cache.delete(`session:hash-index:${id}`);
    await this.removeFromUserSessions(userId, id);
  }

  async updateLastActiveAt(sessionId: string): Promise<void> {
    const session = await this.findById(sessionId);
    if (!session) return;
    session.lastActiveAt = new Date().toISOString();
    await this.cache.set(`session:${sessionId}`, session, AUTH.SESSION_TTL_SECONDS);
  }
}

export { SessionRepository };
