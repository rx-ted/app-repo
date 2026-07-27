import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { Container } from '@rx-ted/packages-honest';
import { CacheService } from '@rx-ted/packages-honest-plugins/cache';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { createControllerTestApplication } from '@rx-ted/packages-honest';
import CommentController from '@/modules/comment/comment.controller';

function mockDbWithChain(resolvedRows: any[]) {
  const dbResult = {
    then: (resolve: any, reject?: any) => Promise.resolve(resolvedRows).then(resolve, reject),
  };

  const orderByResult = { ...dbResult };
  const whereResult = { ...dbResult, orderBy: vi.fn(() => orderByResult) };
  const fromChain = {
    ...dbResult,
    where: vi.fn(() => whereResult),
    orderBy: vi.fn(() => orderByResult),
  };
  const selectChain = { from: vi.fn(() => fromChain) };

  return {
    select: vi.fn(() => selectChain),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function mockCache() {
  return {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn().mockResolvedValue(false),
    mget: vi.fn(),
    mset: vi.fn(),
    deleteByPattern: vi.fn().mockResolvedValue(0),
    incr: vi.fn(),
    decr: vi.fn(),
    expire: vi.fn(),
    close: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue(true),
  };
}

describe('CommentController (integration)', () => {
  it('should return 200 with comment list via DI', async () => {
    const commentRows = [
      {
        id: 1,
        postId: 10,
        userId: 'user-1',
        parentId: null,
        content: 'Great post!',
        status: 'normal',
        createdAt: new Date('2026-01-15T10:00:00Z'),
      },
    ];
    const cache = mockCache();
    cache.get.mockResolvedValue(null);
    const db = mockDbWithChain(commentRows);

    const container = new Container();
    container.register(DbService, db as any);
    container.register(CacheService, cache as any);

    const testApp = await createControllerTestApplication({
      controller: CommentController,
      appOptions: { container },
    });

    const response = await testApp.request('/comments');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].content).toBe('Great post!');
  });

  it('should return 200 with empty array when no comments', async () => {
    const cache = mockCache();
    cache.get.mockResolvedValue(null);
    const db = mockDbWithChain([]);

    const container = new Container();
    container.register(DbService, db as any);
    container.register(CacheService, cache as any);

    const testApp = await createControllerTestApplication({
      controller: CommentController,
      appOptions: { container },
    });

    const response = await testApp.request('/comments');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([]);
  });

  it('should return 404 for unknown routes', async () => {
    const container = new Container();
    container.register(DbService, mockDbWithChain([]) as any);
    container.register(CacheService, mockCache() as any);

    const testApp = await createControllerTestApplication({
      controller: CommentController,
      appOptions: { container },
    });

    const response = await testApp.request('/comments/nonexistent');
    expect(response.status).toBe(404);
  });
});
