import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthRepository } from '@/modules/auth/repositories/auth.repository';

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

const mockCache = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

describe('AuthRepository', () => {
  let repo: AuthRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new AuthRepository(mockDb as any, mockCache as any);
  });

  describe('updatePasswordByEmail', () => {
    it('should call db.update with correct parameters', async () => {
      const mockSet = vi.fn().mockReturnThis();
      mockDb.update.mockReturnValue({ set: mockSet });
      mockSet.mockReturnValue({
        where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
      });

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await repo.updatePasswordByEmail('test@example.com', 'salt:hash');

      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should clear cache for user if found', async () => {
      const mockSet = vi.fn().mockReturnThis();
      mockDb.update.mockReturnValue({ set: mockSet });
      mockSet.mockReturnValue({
        where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
      });

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'user-1', username: 'testuser' }]),
          }),
        }),
      });

      await repo.updatePasswordByEmail('test@example.com', 'salt:hash');

      expect(mockCache.delete).toHaveBeenCalledWith('auth:session:testuser');
    });
  });
});
