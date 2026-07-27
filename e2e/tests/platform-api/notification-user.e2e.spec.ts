import { describe, it, expect, vi, beforeEach } from 'vitest';

import NotificationController from '@platform-api/modules/notification/notification.controller';
import UserController from '@platform-api/modules/user/user.controller';

describe('E2E: NotificationController', () => {
  const mockNotificationService = {
    listMine: vi.fn(),
    getSummary: vi.fn(),
    markAllRead: vi.fn(),
    markRead: vi.fn(),
  };

  function mockCtx(overrides = {}) {
    return {
      req: { header: vi.fn(), param: vi.fn() },
      json: vi.fn((data: any) => data),
      get: vi.fn(),
      ...overrides,
    } as any;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /notifications', () => {
    it('should return paginated notifications', async () => {
      const controller = new NotificationController(mockNotificationService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1' });
      mockNotificationService.listMine.mockResolvedValue({
        items: [
          { id: 'n1', type: 'comment', content: 'New comment', read: false, createdAt: '2025-06-01T00:00:00Z' },
          { id: 'n2', type: 'like', content: 'Someone liked your post', read: true, createdAt: '2025-05-01T00:00:00Z' },
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await controller.listMine(c);
      expect(result.items).toHaveLength(2);
    });

    it('should return empty list when no notifications', async () => {
      const controller = new NotificationController(mockNotificationService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1' });
      mockNotificationService.listMine.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const result = await controller.listMine(c);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('GET /notifications/summary', () => {
    it('should return notification summary with unread count', async () => {
      const controller = new NotificationController(mockNotificationService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1' });
      mockNotificationService.getSummary.mockResolvedValue({
        unreadCount: 3,
        totalCount: 15,
        latestUnread: { id: 'n3', type: 'system', content: 'Welcome!' },
      });

      const result = await controller.getSummary(c);
      expect(result.unreadCount).toBe(3);
    });

    it('should return zero unread when all read', async () => {
      const controller = new NotificationController(mockNotificationService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1' });
      mockNotificationService.getSummary.mockResolvedValue({
        unreadCount: 0,
        totalCount: 10,
        latestUnread: null,
      });

      const result = await controller.getSummary(c);
      expect(result.unreadCount).toBe(0);
    });
  });

  describe('POST /notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      const controller = new NotificationController(mockNotificationService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1' });
      mockNotificationService.markAllRead.mockResolvedValue({ affectedRows: 5 });

      const result = await controller.markAllRead(c);
      expect(result.affectedRows).toBe(5);
    });

    it('should handle empty notifications', async () => {
      const controller = new NotificationController(mockNotificationService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-new' });
      mockNotificationService.markAllRead.mockResolvedValue({ affectedRows: 0 });

      const result = await controller.markAllRead(c);
      expect(result.affectedRows).toBe(0);
    });
  });

  describe('POST /notifications/:id/read', () => {
    it('should mark a specific notification as read', async () => {
      const controller = new NotificationController(mockNotificationService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1' });
      c.req.param = vi.fn().mockReturnValue('n1');
      mockNotificationService.markRead.mockResolvedValue({ success: true });

      const result = await controller.markRead(c);
      expect(result.success).toBe(true);
    });

    it('should throw when notification not found', async () => {
      const controller = new NotificationController(mockNotificationService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1' });
      c.req.param = vi.fn().mockReturnValue('nonexistent');
      mockNotificationService.markRead.mockRejectedValue(new Error('Notification not found'));

      await expect(controller.markRead(c)).rejects.toThrow('Notification not found');
    });
  });
});

describe('E2E: UserController', () => {
  const mockUserService = {
    getSelfProfile: vi.fn(),
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    getBrief: vi.fn(),
    getPublicProfile: vi.fn(),
    getUserBrief: vi.fn(),
  };

  function mockCtx(overrides = {}) {
    return {
      req: { header: vi.fn(), param: vi.fn() },
      json: vi.fn((data: any) => data),
      get: vi.fn(),
      ...overrides,
    } as any;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /user/me', () => {
    it('should return authenticated user profile', async () => {
      const controller = new UserController(mockUserService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1' });
      mockUserService.getSelfProfile.mockResolvedValue({
        username: 'alice',
        displayName: 'Alice',
        email: 'alice@example.com',
        roles: ['user'],
        bio: 'Writer',
      });

      const result = await controller.getSelfProfile(c);
      expect(result.username).toBe('alice');
    });

    it('should return default values for missing profile fields', async () => {
      const controller = new UserController(mockUserService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-new' });
      mockUserService.getSelfProfile.mockResolvedValue({
        username: 'newuser',
        displayName: null,
        email: null,
        roles: ['user'],
        bio: null,
      });

      const result = await controller.getSelfProfile(c);
      expect(result.username).toBe('newuser');
      expect(result.bio).toBeNull();
    });
  });

  describe('PUT /user/me/profile', () => {
    it('should update user profile', async () => {
      const controller = new UserController(mockUserService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1' });
      mockUserService.updateProfile.mockResolvedValue({
        username: 'alice',
        displayName: 'Alice Updated',
        bio: 'Updated bio',
      });

      const result = await controller.updateProfile(c, {
        displayName: 'Alice Updated',
        bio: 'Updated bio',
      });
      expect(result.displayName).toBe('Alice Updated');
    });
  });

  describe('GET /user/profile/:username', () => {
    it('should return public profile for a user', async () => {
      const controller = new UserController(mockUserService as any);
      const c = mockCtx();
      c.req.param = vi.fn().mockReturnValue('alice');
      mockUserService.getPublicProfile.mockResolvedValue({
        username: 'alice',
        displayName: 'Alice',
        bio: 'Writer',
        avatarUrl: null,
        postCount: 15,
        joinDate: '2024-01-01T00:00:00Z',
      });

      const result = await controller.getPublicProfile(c);
      expect(result.postCount).toBe(15);
    });

    it('should throw 404 for non-existent user', async () => {
      const controller = new UserController(mockUserService as any);
      const c = mockCtx();
      c.req.param = vi.fn().mockReturnValue('nonexistent');
      mockUserService.getPublicProfile.mockRejectedValue(new Error('User not found'));

      await expect(controller.getPublicProfile(c)).rejects.toThrow('User not found');
    });
  });

  describe('GET /user/brief', () => {
    it('should return brief user info', async () => {
      const controller = new UserController(mockUserService as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1' });
      mockUserService.getBrief.mockResolvedValue({
        username: 'alice',
        displayName: 'Alice',
        roles: ['user'],
      });

      const result = await controller.getUserBrief('user-1', c);
      expect(result.username).toBe('alice');
    });
  });
});
