import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServiceTestContainer } from '@rx-ted/packages-honest';
import { CacheService } from '@rx-ted/packages-honest-plugins/cache';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import NotificationService from '@/modules/notification/notification.service';

function makeThenable(resolvedValue: any) {
  return {
    then: (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject),
  };
}

function makeSelectChain(result: any) {
  const terminal = makeThenable(result);
  const limited = { ...terminal };
  const ordered = { ...terminal, limit: vi.fn(() => limited) };
  const whereResult = { ...terminal, orderBy: vi.fn(() => ordered) };
  const fromChain = { ...terminal, where: vi.fn(() => whereResult), orderBy: vi.fn(() => ordered) };
  return { from: vi.fn(() => fromChain) };
}

function makeUpdateChain(result: any) {
  const terminal = makeThenable(result);
  const setResult = { where: vi.fn(() => terminal) };
  return { set: vi.fn(() => setResult) };
}

function mockCache() {
  return {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    mget: vi.fn(),
    mset: vi.fn(),
    deleteByPattern: vi.fn(),
    incr: vi.fn(),
    decr: vi.fn(),
    expire: vi.fn(),
    close: vi.fn(),
    healthCheck: vi.fn(),
  };
}

function makeNotification(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    type: 'info',
    title: 'Test Notification',
    content: 'This is a test',
    isRead: false,
    createdAt: new Date('2026-01-15T10:00:00Z'),
    readAt: null,
    ...overrides,
  };
}

describe('NotificationService (integration)', () => {
  let db: { select: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  let cache: ReturnType<typeof mockCache>;
  let service: NotificationService;

  beforeEach(() => {
    cache = mockCache();

    db = {
      select: vi.fn(),
      update: vi.fn(),
    };

    const harness = createServiceTestContainer({
      overrides: [
        { provide: DbService, useValue: db as any },
        { provide: CacheService, useValue: cache as any },
      ],
      preload: [NotificationService],
    });

    service = harness.get(NotificationService);
  });

  describe('listMine', () => {
    it('should return notifications from DB when cache misses', async () => {
      cache.get.mockResolvedValue(null);
      const rows = [makeNotification({ id: 1 }), makeNotification({ id: 2, title: 'Second' })];
      db.select.mockReturnValue(makeSelectChain(rows));

      const result = await service.listMine();

      expect(cache.get).toHaveBeenCalledWith('notifications:list');
      expect(db.select).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].title).toBe('Second');
    });

    it('should return cached result when cache hits', async () => {
      const cached = [
        {
          id: '1',
          type: 'info',
          title: 'Cached',
          content: '',
          is_read: false,
          created_at: '2026-01-15T10:00:00.000Z',
        },
      ];
      cache.get.mockResolvedValue(cached);

      const result = await service.listMine();

      expect(cache.get).toHaveBeenCalledWith('notifications:list');
      expect(db.select).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });

    it('should cache result after DB fetch', async () => {
      cache.get.mockResolvedValue(null);
      const row = makeNotification();
      db.select.mockReturnValue(makeSelectChain([row]));

      await service.listMine();

      expect(cache.set).toHaveBeenCalledWith(
        'notifications:list',
        expect.arrayContaining([expect.objectContaining({ id: '1' })]),
        60,
      );
    });

    it('should return empty array when no notifications', async () => {
      cache.get.mockResolvedValue(null);
      db.select.mockReturnValue(makeSelectChain([]));

      const result = await service.listMine();

      expect(result).toEqual([]);
    });
  });

  describe('getSummary', () => {
    it('should return summary with unread count and recent list', async () => {
      cache.get.mockResolvedValue(null);
      db.select
        .mockReturnValueOnce(makeSelectChain([{ value: 3 }]))
        .mockReturnValueOnce(
          makeSelectChain([
            makeNotification({ id: 1 }),
            makeNotification({ id: 2, title: 'Recent' }),
          ]),
        );

      const result = await service.getSummary();

      expect(result.unreadCount).toBe(3);
      expect(result.recent).toHaveLength(2);
    });

    it('should default unreadCount to 0', async () => {
      cache.get.mockResolvedValue(null);
      db.select
        .mockReturnValueOnce(makeSelectChain([{ value: null }]))
        .mockReturnValueOnce(makeSelectChain([]));

      const result = await service.getSummary();

      expect(result.unreadCount).toBe(0);
      expect(result.recent).toEqual([]);
    });
  });

  describe('markAllRead', () => {
    it('should update all unread notifications and clear cache', async () => {
      db.update.mockReturnValue(makeUpdateChain([{ affectedRows: 5 }]));

      const result = await service.markAllRead();

      expect(db.update).toHaveBeenCalled();
      expect(cache.delete).toHaveBeenCalledWith('notifications:list');
      expect(cache.delete).toHaveBeenCalledWith('notifications:summary');
      expect(result.affectedRows).toBe(5);
    });

    it('should return 0 affected rows when none updated', async () => {
      db.update.mockReturnValue(makeUpdateChain([{ affectedRows: 0 }]));

      const result = await service.markAllRead();

      expect(result.affectedRows).toBe(0);
    });
  });

  describe('markRead', () => {
    it('should mark specific notification as read and clear cache', async () => {
      db.update.mockReturnValue(makeUpdateChain([{ affectedRows: 1 }]));

      const result = await service.markRead(42);

      expect(db.update).toHaveBeenCalled();
      expect(cache.delete).toHaveBeenCalledWith('notifications:list');
      expect(cache.delete).toHaveBeenCalledWith('notifications:summary');
      expect(result.affectedRows).toBe(1);
    });
  });

  describe('DI container integration', () => {
    it('should be resolved as singleton from container', () => {
      const harness = createServiceTestContainer({
        overrides: [
          { provide: DbService, useValue: db as any },
          { provide: CacheService, useValue: cache as any },
        ],
      });

      const instance1 = harness.get(NotificationService);
      const instance2 = harness.get(NotificationService);

      expect(instance1).toBe(instance2);
    });

    it('should inject DbService and CacheService via constructor', () => {
      expect(service).toBeInstanceOf(NotificationService);
    });
  });
});
