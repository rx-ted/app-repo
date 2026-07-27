import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionRepository } from '@/modules/auth/repositories/session.repository';
import { AUTH } from '@/constants/auth';

const mockCache = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

describe('SessionRepository', () => {
  let repo: SessionRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new SessionRepository(mockCache as any);
  });

  describe('create', () => {
    it('should set session in cache with TTL', async () => {
      const session = {
        id: 'session-1',
        userId: 'user-1',
        username: 'testuser',
        deviceId: null,
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        refreshTokenHash: 'hash-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastActiveAt: '2024-01-01T00:00:00.000Z',
      };

      await repo.create(session);

      expect(mockCache.set).toHaveBeenCalledWith(
        `session:${session.id}`,
        session,
        AUTH.SESSION_TTL_SECONDS,
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        `session:hash-index:${session.id}`,
        session.refreshTokenHash,
        AUTH.SESSION_TTL_SECONDS,
      );
    });
  });

  describe('findById', () => {
    it('should return session from cache', async () => {
      const cachedSession = {
        id: 'session-1',
        userId: 'user-1',
        username: 'testuser',
        deviceId: null,
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        refreshTokenHash: 'hash-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastActiveAt: '2024-01-01T00:00:00.000Z',
      };
      mockCache.get.mockResolvedValue(cachedSession);

      const result = await repo.findById('session-1');

      expect(result).toEqual(cachedSession);
      expect(mockCache.get).toHaveBeenCalledWith('session:session-1');
    });

    it('should return null when not in cache', async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await repo.findById('session-1');

      expect(result).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete session from cache', async () => {
      mockCache.get.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        username: 'testuser',
        deviceId: null,
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        refreshTokenHash: 'hash-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastActiveAt: '2024-01-01T00:00:00.000Z',
      });

      await repo.deleteSession('session-1');

      expect(mockCache.delete).toHaveBeenCalledWith('session:session-1');
      expect(mockCache.delete).toHaveBeenCalledWith('session:hash:hash-1');
      expect(mockCache.delete).toHaveBeenCalledWith('session:hash-index:session-1');
    });

    it('should do nothing if session not found', async () => {
      mockCache.get.mockResolvedValue(null);

      await repo.deleteSession('session-1');

      expect(mockCache.delete).not.toHaveBeenCalled();
    });
  });

  describe('addToUserSessions', () => {
    it('should add session to existing user session list', async () => {
      mockCache.get.mockResolvedValue(['session-1']);

      await repo.addToUserSessions('user-1', 'session-2');

      expect(mockCache.get).toHaveBeenCalledWith('user:sessions:user-1');
      expect(mockCache.set).toHaveBeenCalledWith(
        'user:sessions:user-1',
        ['session-1', 'session-2'],
        AUTH.SESSION_TTL_SECONDS,
      );
    });

    it('should create new list when none exists', async () => {
      mockCache.get.mockResolvedValue(null);

      await repo.addToUserSessions('user-1', 'session-1');

      expect(mockCache.set).toHaveBeenCalledWith(
        'user:sessions:user-1',
        ['session-1'],
        AUTH.SESSION_TTL_SECONDS,
      );
    });

    it('should not duplicate existing session IDs', async () => {
      mockCache.get.mockResolvedValue(['session-1']);

      await repo.addToUserSessions('user-1', 'session-1');

      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });

  describe('revokeUserSessions', () => {
    it('should clear all user sessions from cache', async () => {
      mockCache.get.mockResolvedValue(['session-1', 'session-2']);

      await repo.revokeUserSessions('user-1');

      expect(mockCache.delete).toHaveBeenCalledWith('session:session-1');
      expect(mockCache.delete).toHaveBeenCalledWith('session:session-2');
      expect(mockCache.delete).toHaveBeenCalledWith('session:hash-index:session-1');
      expect(mockCache.delete).toHaveBeenCalledWith('session:hash-index:session-2');
      expect(mockCache.delete).toHaveBeenCalledWith('user:sessions:user-1');
    });
  });

  describe('setRefreshTokenHash / getRefreshTokenHash', () => {
    it('should round-trip through cache', async () => {
      mockCache.set.mockResolvedValue(undefined);
      mockCache.get.mockResolvedValue('session-1');

      await repo.setRefreshTokenHash('hash:abc', 'session-1');
      const result = await repo.getRefreshTokenHash('hash:abc');

      expect(mockCache.set).toHaveBeenCalledWith('hash:abc', 'session-1', AUTH.SESSION_TTL_SECONDS);
      expect(mockCache.get).toHaveBeenCalledWith('hash:abc');
      expect(result).toBe('session-1');
    });
  });

  describe('setCurrentHashIndex / getCurrentHashIndex', () => {
    it('should round-trip through cache', async () => {
      mockCache.set.mockResolvedValue(undefined);
      mockCache.get.mockResolvedValue('hash-1');

      await repo.setCurrentHashIndex('session-1', 'hash-1');
      const result = await repo.getCurrentHashIndex('session-1');

      expect(mockCache.set).toHaveBeenCalledWith(
        'session:hash-index:session-1',
        'hash-1',
        AUTH.SESSION_TTL_SECONDS,
      );
      expect(mockCache.get).toHaveBeenCalledWith('session:hash-index:session-1');
      expect(result).toBe('hash-1');
    });
  });

  describe('deleteHashKey', () => {
    it('should remove key from cache', async () => {
      await repo.deleteHashKey('some-key');

      expect(mockCache.delete).toHaveBeenCalledWith('some-key');
    });
  });
});
