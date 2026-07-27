import { describe, expect, it, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSessionStore } from '@/stores/session';

vi.mock('@/http', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({ setLocale: vi.fn(), t: vi.fn() }),
}));

import { useNotification } from './useNotification';
import { http } from '@/http';

describe('useNotification', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should return empty array when not authenticated', async () => {
      const store = useSessionStore();
      store.token = null;
      store.user = null;

      const notification = useNotification();
      const result = await notification.list();

      expect(result).toEqual([]);
      expect(http.get).not.toHaveBeenCalled();
    });

    it('should fetch notification list when authenticated', async () => {
      const store = useSessionStore();
      store.token = 'valid-token';
      store.user = {
        id: 'u1',
        username: 'test',
        email: null,
        preferredLocale: 'zh-CN',
        roles: [],
        permissions: [],
        tokenVersion: 1,
      };

      vi.mocked(http.get).mockResolvedValue({
        data: [
          {
            id: 1,
            type: 'comment',
            content: '新评论',
            is_read: false,
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
      });

      const notification = useNotification();
      const result = await notification.list();

      expect(http.get).toHaveBeenCalledWith('/notification/me');
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('新评论');
    });

    it('should handle empty response', async () => {
      const store = useSessionStore();
      store.token = 'valid-token';
      store.user = {
        id: 'u1',
        username: 'test',
        email: null,
        preferredLocale: 'zh-CN',
        roles: [],
        permissions: [],
        tokenVersion: 1,
      };

      vi.mocked(http.get).mockResolvedValue({ data: [] });

      const notification = useNotification();
      const result = await notification.list();

      expect(result).toEqual([]);
    });

    it('should handle error', async () => {
      const store = useSessionStore();
      store.token = 'valid-token';
      store.user = {
        id: 'u1',
        username: 'test',
        email: null,
        preferredLocale: 'zh-CN',
        roles: [],
        permissions: [],
        tokenVersion: 1,
      };

      vi.mocked(http.get).mockRejectedValue(new Error('Network error'));

      const notification = useNotification();
      const result = await notification.list();

      expect(result).toEqual([]);
      expect(notification.error.value).toBe('Network error');
    });
  });

  describe('summary', () => {
    it('should return default summary when not authenticated', async () => {
      const store = useSessionStore();
      store.token = null;
      store.user = null;

      const notification = useNotification();
      const result = await notification.summary();

      expect(result).toEqual({ unreadCount: 0, recent: [] });
    });

    it('should fetch summary when authenticated', async () => {
      const store = useSessionStore();
      store.token = 'valid-token';
      store.user = {
        id: 'u1',
        username: 'test',
        email: null,
        preferredLocale: 'zh-CN',
        roles: [],
        permissions: [],
        tokenVersion: 1,
      };

      vi.mocked(http.get).mockResolvedValue({
        data: {
          unreadCount: 3,
          recent: [
            {
              id: 1,
              type: 'system',
              content: '欢迎',
              is_read: false,
              created_at: '2026-01-01T00:00:00Z',
            },
          ],
        },
      });

      const notification = useNotification();
      const result = await notification.summary();

      expect(http.get).toHaveBeenCalledWith('/notification/me/summary');
      expect(result.unreadCount).toBe(3);
      expect(result.recent).toHaveLength(1);
    });
  });

  describe('markRead', () => {
    it('should call mark read API', async () => {
      const store = useSessionStore();
      store.token = 'valid-token';
      store.user = {
        id: 'u1',
        username: 'test',
        email: null,
        preferredLocale: 'zh-CN',
        roles: [],
        permissions: [],
        tokenVersion: 1,
      };

      vi.mocked(http.get).mockResolvedValue({
        data: [{ id: 42, type: 'comment', content: 'test', is_read: false, created_at: '' }],
      });
      vi.mocked(http.post).mockResolvedValue({});

      const notification = useNotification();
      await notification.list();
      await notification.markRead(42);

      expect(http.post).toHaveBeenCalledWith('/notification/42/read');
    });

    it('should do nothing when not authenticated', async () => {
      const store = useSessionStore();
      store.token = null;
      store.user = null;

      const notification = useNotification();
      await notification.markRead(1);

      expect(http.post).not.toHaveBeenCalled();
    });
  });

  describe('markAllRead', () => {
    it('should call mark all read API', async () => {
      const store = useSessionStore();
      store.token = 'valid-token';
      store.user = {
        id: 'u1',
        username: 'test',
        email: null,
        preferredLocale: 'zh-CN',
        roles: [],
        permissions: [],
        tokenVersion: 1,
      };

      vi.mocked(http.get).mockResolvedValue({
        data: [
          { id: 1, type: 'comment', content: 'a', is_read: false, created_at: '' },
          { id: 2, type: 'system', content: 'b', is_read: false, created_at: '' },
        ],
      });
      vi.mocked(http.post).mockResolvedValue({});

      const notification = useNotification();
      await notification.list();
      await notification.markAllRead();

      expect(http.post).toHaveBeenCalledWith('/notification/read-all');
    });

    it('should do nothing when not authenticated', async () => {
      const store = useSessionStore();
      store.token = null;
      store.user = null;

      const notification = useNotification();
      await notification.markAllRead();

      expect(http.post).not.toHaveBeenCalled();
    });
  });
});
