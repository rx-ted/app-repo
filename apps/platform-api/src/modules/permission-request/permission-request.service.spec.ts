import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PermissionRequestService from './permission-request.service';

function makeThenable(resolvedValue: any) {
  return {
    then: (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject),
  };
}

function makeSelectChain(result: any) {
  const terminal = makeThenable(result);
  const limited = { ...terminal };
  const ordered = { ...terminal, limit: vi.fn(() => limited) };
  const whereResult = {
    ...terminal,
    orderBy: vi.fn(() => ordered),
    limit: vi.fn(() => limited),
  };
  const fromChain = {
    ...terminal,
    where: vi.fn(() => whereResult),
    orderBy: vi.fn(() => ordered),
  };
  return { from: vi.fn(() => fromChain) };
}

function makeInsertChain(result: any) {
  return {
    values: vi.fn(() => makeThenable(result)),
  };
}

function makeUpdateChain(result: any) {
  const terminal = makeThenable(result);
  return { set: vi.fn(() => ({ where: vi.fn(() => terminal) })) };
}

function makePermissionRequest(overrides: Record<string, any> = {}) {
  const now = new Date('2026-06-21T10:00:00Z');
  return {
    id: 1,
    userId: 'user-1',
    requestType: 'PERMISSION',
    permissionId: null,
    targetUserId: null,
    path: null,
    scope: null,
    entityType: null,
    entityData: null,
    expiresAt: null,
    reason: null,
    status: 'PENDING',
    decisionReason: null,
    decidedBy: null,
    decidedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('PermissionRequestService', () => {
  let service: PermissionRequestService;
  let mockDb: {
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let mockAuditService: { record: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mockAuditService = { record: vi.fn() };
    service = new PermissionRequestService(mockDb as any, mockAuditService as any);
  });

  describe('create', () => {
    it('should create a permission request with items', async () => {
      const insertedRow = makePermissionRequest();
      const items = [
        { id: 1, requestId: 1, permissionId: 10 },
        { id: 2, requestId: 1, permissionId: 20 },
        { id: 3, requestId: 1, permissionId: 30 },
      ];
      mockDb.insert.mockReturnValue(makeInsertChain([{ insertId: 1 }]));
      mockDb.select
        .mockReturnValueOnce(makeSelectChain([insertedRow]))
        .mockReturnValueOnce(makeSelectChain(items));
      mockDb.update.mockReturnValue(makeUpdateChain([{ affectedRows: 1 }]));

      const result = await service.create(
        { permission_ids: [1, 2, 3], reason: 'Need access' },
        'user-1',
      );

      expect(result).not.toBeNull();
      expect(mockDb.insert).toHaveBeenCalledTimes(4); // 1 request + 3 items
    });
  });

  describe('approve', () => {
    it('should return null when request does not exist', async () => {
      mockDb.select.mockReturnValue(makeSelectChain([]));

      const result = await service.approve('1', {}, 'admin-id');

      expect(result).toBeNull();
    });

    it('should return null when request is not PENDING', async () => {
      mockDb.select.mockReturnValue(
        makeSelectChain([makePermissionRequest({ status: 'APPROVED' })]),
      );

      const result = await service.approve('1', {}, 'admin-id');

      expect(result).toBeNull();
    });

    it('should approve a PENDING request and grant permissions', async () => {
      const pending = makePermissionRequest();
      const items = [
        { id: 1, requestId: 1, permissionId: 10 },
        { id: 2, requestId: 1, permissionId: 20 },
      ];
      const updated = makePermissionRequest({ status: 'APPROVED', decidedBy: 'admin-id' });

      mockDb.select
        .mockReturnValueOnce(makeSelectChain([pending]))
        .mockReturnValueOnce(makeSelectChain(items))
        .mockReturnValueOnce(makeSelectChain([])) // no existing mappings
        .mockReturnValueOnce(makeSelectChain([updated]))
        .mockReturnValueOnce(makeSelectChain(items));
      mockDb.insert.mockReturnValue(makeInsertChain([{ affectedRows: 1 }]));
      mockDb.update.mockReturnValue(makeUpdateChain([{ affectedRows: 1 }]));

      const result = await service.approve('1', { reason: 'Looks good' }, 'admin-id');

      expect(result).not.toBeNull();
      expect(result!.status).toBe('APPROVED');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'permission_request.approve',
          target_id: '1',
        }),
      );
    });

    it('should skip already-granted permissions', async () => {
      const pending = makePermissionRequest();
      const items = [
        { id: 1, requestId: 1, permissionId: 10 },
        { id: 2, requestId: 1, permissionId: 20 },
      ];
      const existingMapping = { userId: 'user-1', permissionId: 10 };
      const updated = makePermissionRequest({ status: 'APPROVED', decidedBy: 'admin-id' });

      mockDb.select
        .mockReturnValueOnce(makeSelectChain([pending]))
        .mockReturnValueOnce(makeSelectChain(items))
        .mockReturnValueOnce(makeSelectChain([existingMapping]))
        .mockReturnValueOnce(makeSelectChain([updated]))
        .mockReturnValueOnce(makeSelectChain(items));
      mockDb.insert.mockReturnValue(makeInsertChain([{ affectedRows: 1 }]));
      mockDb.update.mockReturnValue(makeUpdateChain([{ affectedRows: 1 }]));

      const result = await service.approve('1', {}, 'admin-id');

      expect(result).not.toBeNull();
      // Only 1 insert (permission 20), permission 10 skipped
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });
  });

  describe('reject', () => {
    it('should return null when request does not exist', async () => {
      mockDb.select.mockReturnValue(makeSelectChain([]));

      const result = await service.reject('1', {}, 'admin-id');

      expect(result).toBeNull();
    });

    it('should return null when request is not PENDING', async () => {
      mockDb.select.mockReturnValue(
        makeSelectChain([makePermissionRequest({ status: 'APPROVED' })]),
      );

      const result = await service.reject('1', {}, 'admin-id');

      expect(result).toBeNull();
    });

    it('should reject a PENDING request and record audit', async () => {
      const pending = makePermissionRequest();
      const items = [{ id: 1, requestId: 1, permissionId: 10 }];
      const updated = makePermissionRequest({ status: 'REJECTED', decidedBy: 'admin-id' });

      mockDb.select
        .mockReturnValueOnce(makeSelectChain([pending]))
        .mockReturnValueOnce(makeSelectChain(items))
        .mockReturnValueOnce(makeSelectChain([updated]));
      mockDb.update.mockReturnValue(makeUpdateChain([{ affectedRows: 1 }]));

      const result = await service.reject('1', { reason: 'Not needed' }, 'admin-id');

      expect(result).not.toBeNull();
      expect(result!.status).toBe('REJECTED');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'permission_request.reject',
          target_id: '1',
        }),
      );
    });
  });

  describe('listMine', () => {
    it('should return requests for the specified user', async () => {
      const rows = [makePermissionRequest({ id: 1 }), makePermissionRequest({ id: 2 })];
      mockDb.select.mockReturnValue(makeSelectChain(rows));

      const result = await service.listMine('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('should return empty array when user has no requests', async () => {
      mockDb.select.mockReturnValue(makeSelectChain([]));

      const result = await service.listMine('user-1');

      expect(result).toEqual([]);
    });
  });
});
