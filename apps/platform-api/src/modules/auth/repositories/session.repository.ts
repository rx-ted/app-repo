import { Inject, Service } from '@rx-ted/packages-honest';
import { CacheService } from '@rx-ted/packages-honest-plugins/cache';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { eq, and, gt } from 'drizzle-orm';
import { sessions } from '@/schema';
import type { SessionRecord } from '@/modules/auth/entities/session.entity';
import { AUTH } from '@/constants/auth';

@Service()
class SessionRepository {
  constructor(
    @Inject(CacheService) private cache: CacheService,
    @Inject(DbService) private db?: DbService,
  ) {}

  private cacheTtl(): number {
    return AUTH.SESSION_TTL_SECONDS;
  }

  private sessionKey(id: string): string {
    return `session:${id}`;
  }

  private toSessionRecord(row: any): SessionRecord {
    const createdAt = row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date(row.createdAt).toISOString();
    const lastActiveAt = row.lastActiveAt instanceof Date ? row.lastActiveAt.toISOString() : new Date(row.lastActiveAt).toISOString();
    return {
      id: row.id,
      userId: row.userId,
      username: row.username,
      deviceId: row.deviceId ?? null,
      ip: row.ip ?? null,
      city: row.city ?? null,
      userAgent: row.userAgent ?? null,
      refreshTokenHash: row.refreshTokenHash,
      createdAt,
      lastActiveAt,
    };
  }

  private async persistSession(session: SessionRecord): Promise<void> {
    if (!this.db) return;
    const expiresAt = new Date(Date.now() + AUTH.SESSION_TTL_SECONDS * 1000);
    const values = {
      id: session.id,
      userId: session.userId,
      username: session.username,
      deviceId: session.deviceId,
      ip: session.ip,
      city: session.city,
      userAgent: session.userAgent,
      refreshTokenHash: session.refreshTokenHash,
      createdAt: new Date(session.createdAt),
      lastActiveAt: new Date(session.lastActiveAt),
      expiresAt,
    };

    const existing = await this.db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.id, session.id))
      .limit(1);

    if (existing.length) {
      await this.db
        .update(sessions)
        .set({
          userId: values.userId,
          username: values.username,
          deviceId: values.deviceId,
          ip: values.ip,
          city: values.city,
          userAgent: values.userAgent,
          refreshTokenHash: values.refreshTokenHash,
          lastActiveAt: values.lastActiveAt,
          expiresAt: values.expiresAt,
        })
        .where(eq(sessions.id, values.id));
    } else {
      await this.db.insert(sessions).values(values);
    }
  }

  async create(session: SessionRecord): Promise<void> {
    await this.persistSession(session);
    await this.cache.set(this.sessionKey(session.id), session, this.cacheTtl());
    await this.cache.set(`session:hash-index:${session.id}`, session.refreshTokenHash, this.cacheTtl());
  }

  async findById(id: string): Promise<SessionRecord | null> {
    const cached = await this.cache.get<SessionRecord>(this.sessionKey(id));
    if (cached) return cached;

    if (!this.db) return null;

    const rows = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);
    if (!rows.length) return null;
    if (new Date(rows[0].expiresAt).getTime() <= Date.now()) {
      await this.deleteSession(id);
      return null;
    }
    const session = this.toSessionRecord(rows[0]);
    await this.cache.set(this.sessionKey(id), session, this.cacheTtl());
    await this.cache.set(`session:hash-index:${id}`, session.refreshTokenHash, this.cacheTtl());
    return session;
  }

  async delete(key: string): Promise<void> {
    await this.cache.delete(key);
  }

  async deleteSession(id: string): Promise<void> {
    const session = await this.findById(id);
    if (!session) return;

    if (this.db) {
      await this.db.delete(sessions).where(eq(sessions.id, id));
    }
    await this.cache.delete(this.sessionKey(id));
    await this.cache.delete(`session:hash:${session.refreshTokenHash}`);
    await this.cache.delete(`session:hash-index:${id}`);
  }

  async getCurrentHashIndex(sessionId: string): Promise<string | null> {
    return this.cache.get<string>(`session:hash-index:${sessionId}`);
  }

  async setCurrentHashIndex(sessionId: string, hash: string): Promise<void> {
    await this.cache.set(`session:hash-index:${sessionId}`, hash, this.cacheTtl());
  }

  async getRefreshTokenHash(hashKey: string): Promise<string | null> {
    return this.cache.get<string>(hashKey);
  }

  async setRefreshTokenHash(hashKey: string, sessionId: string): Promise<void> {
    await this.cache.set(hashKey, sessionId, this.cacheTtl());
  }

  async deleteHashKey(hashKey: string): Promise<void> {
    await this.cache.delete(hashKey);
  }

  async addToUserSessions(userId: string, sessionId: string): Promise<void> {
    const key = `user:sessions:${userId}`;
    const ids = (await this.cache.get<string[]>(key)) ?? [];
    if (!ids.includes(sessionId)) {
      ids.push(sessionId);
      await this.cache.set(key, ids, this.cacheTtl());
    }
  }

  async removeFromUserSessions(userId: string, sessionId: string): Promise<void> {
    const key = `user:sessions:${userId}`;
    const ids = (await this.cache.get<string[]>(key)) ?? [];
    await this.cache.set(key, ids.filter((id) => id !== sessionId), this.cacheTtl());
  }

  async getUserSessionIds(userId: string): Promise<string[]> {
    if (!this.db) return (await this.cache.get<string[]>(`user:sessions:${userId}`)) ?? [];
    const rows = await this.db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())));
    return rows.map((row) => row.id);
  }

  async revokeUserSessions(userId: string): Promise<void> {
    const ids = await this.getUserSessionIds(userId);
    for (const id of ids) {
      const session = await this.findById(id).catch(() => null);
      await this.cache.delete(this.sessionKey(id));
      await this.cache.delete(`session:hash-index:${id}`);
      if (session) await this.cache.delete(`session:hash:${session.refreshTokenHash}`);
    }
    if (this.db) {
      await this.db.delete(sessions).where(eq(sessions.userId, userId));
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
    if (!session) throw new Error('Session not found');
    if (session.userId !== userId) throw new Error('Session does not belong to user');
    await this.deleteSession(id);
    if (this.db) {
      await this.db.delete(sessions).where(eq(sessions.id, id));
    }
  }

  async updateLastActiveAt(sessionId: string): Promise<void> {
    const session = await this.findById(sessionId);
    if (!session) return;
    session.lastActiveAt = new Date().toISOString();
    await this.persistSession(session);
    await this.cache.set(this.sessionKey(sessionId), session, this.cacheTtl());
  }

  async tryAcquireRefreshLock(tokenHash: string): Promise<boolean> {
    const key = `refresh-lock:${tokenHash}`;
    if (typeof this.cache.incr !== 'function') return true;
    const count = await this.cache.incr(key);
    if (count === 1 && typeof this.cache.expire === 'function') {
      await this.cache.expire(key, 10);
    }
    return count === 1;
  }
}

export { SessionRepository };
