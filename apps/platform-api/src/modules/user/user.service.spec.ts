import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserService from '@/modules/user/user.service';
import { DEFAULTS } from '@/constants';

const mockUserRepo = {
  getFullUserProfile: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  getPublicProfile: vi.fn(),
  list: vi.fn(),
};

const mockSessionRepo = {
  updateLastActiveAt: vi.fn(),
};

const mockCache = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

const mockMailService = {
  sendVerificationCode: vi.fn(),
};

const mockAuthRepo = {
  getUserByEmail: vi.fn(),
  updateLastLoginAt: vi.fn(),
};

const mockAudit = {
  record: vi.fn(),
};

function createService() {
  return new UserService(
    mockUserRepo as any,
    mockSessionRepo as any,
    mockCache as any,
    mockMailService as any,
    mockAuthRepo as any,
    mockAudit as any,
  );
}

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createService();
  });

  describe('getSelfProfile', () => {
    it('should return null when repo returns null', async () => {
      mockUserRepo.getFullUserProfile.mockResolvedValue(null);

      const result = await service.getSelfProfile('user-1');

      expect(result).toBeNull();
    });

    it('should return UserProfile shape with all fields', async () => {
      const fakeUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        preferredLocale: 'en' as const,
        status: 'NORMAL' as const,
        tokenVersion: 1,
        lastLoginAt: '2024-01-01T00:00:00Z',
        nickname: 'Test',
        avatarUrl: 'https://example.com/avatar.png',
        gender: null,
        birthday: null,
        bio: 'Hello',
        website: 'https://example.com',
        location: 'Earth',
        createdAt: '2024-01-01T00:00:00Z',
      };
      mockUserRepo.getFullUserProfile.mockResolvedValue(fakeUser);

      const result = await service.getSelfProfile('user-1');

      expect(result).toEqual({
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        preferredLocale: 'en',
        status: 'NORMAL',
        tokenVersion: 1,
        lastLoginAt: '2024-01-01T00:00:00Z',
        nickname: 'Test',
        avatarUrl: 'https://example.com/avatar.png',
        gender: null,
        birthday: null,
        bio: 'Hello',
        website: 'https://example.com',
        location: 'Earth',
      });
    });
  });

  describe('updateProfile', () => {
    it('should return null when repo returns null', async () => {
      mockUserRepo.updateProfile.mockResolvedValue(null);

      const result = await service.updateProfile('user-1', { nickname: 'New' });

      expect(result).toBeNull();
    });

    it('should return { id } on success', async () => {
      mockUserRepo.updateProfile.mockResolvedValue({ id: 'user-1' });

      const result = await service.updateProfile('user-1', { nickname: 'New' });

      expect(result).toEqual({ id: 'user-1' });
    });
  });

  describe('getPublicProfile', () => {
    it('should return null when repo returns null', async () => {
      mockUserRepo.getPublicProfile.mockResolvedValue(null);

      const result = await service.getPublicProfile('testuser');

      expect(result).toBeNull();
    });

    it('should return mapped public profile', async () => {
      const fakeProfile = {
        id: 'user-1',
        username: 'testuser',
        githubConnected: true,
        preferredLocale: 'en',
        nickname: 'Test',
        avatarUrl: 'https://example.com/avatar.png',
        bio: 'Hello',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      mockUserRepo.getPublicProfile.mockResolvedValue(fakeProfile);

      const result = await service.getPublicProfile('testuser');

      expect(result).toEqual({
        id: 'user-1',
        username: 'testuser',
        github_connected: true,
        preferred_locale: 'en',
        nickname: 'Test',
        avatar_url: 'https://example.com/avatar.png',
        bio: 'Hello',
        created_at: '2024-01-01T00:00:00Z',
      });
    });
  });

  describe('list', () => {
    it('should use DEFAULTS.MAX_PAGE_SIZE as default pageSize', async () => {
      mockUserRepo.list.mockResolvedValue({ data: [], total: 0 });

      await service.list();

      expect(mockUserRepo.list).toHaveBeenCalledWith(1, DEFAULTS.MAX_PAGE_SIZE);
    });

    it('should return data array with login_type = password mapped', async () => {
      const fakeUsers = [
        {
          id: '1',
          username: 'user1',
          email: 'u1@test.com',
          loginType: 'password',
          preferredLocale: 'en',
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ];
      mockUserRepo.list.mockResolvedValue({ data: fakeUsers, total: 1 });

      const result = await service.list(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        id: '1',
        username: 'user1',
        email: 'u1@test.com',
        preferred_locale: 'en',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        login_type: 'password',
      });
    });

    it('should return total count', async () => {
      mockUserRepo.list.mockResolvedValue({ data: [], total: 42 });

      const result = await service.list(1, 10);

      expect(result.total).toBe(42);
    });
  });
});
