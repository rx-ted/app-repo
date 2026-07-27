import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseRepository } from './repository';
import type { Table } from 'drizzle-orm';

function createMockDb() {
  const results: any[] = [];

  const qb: any = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  };
  qb.then = (resolve: (v: any) => void) => {
    const val = results.shift() ?? [];
    resolve(val);
    return Promise.resolve(val);
  };

  const db = {
    select: vi.fn().mockReturnValue(qb),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({ affectedRows: 1 }),
    }),
  };

  return {
    db,
    qb,
    addResult: (val: any) => {
      results.push(val);
    },
  };
}

const mockTable = { _: { name: 'users' } } as unknown as Table;

describe('BaseRepository', () => {
  let repo: BaseRepository<typeof mockTable>;
  let db: ReturnType<typeof createMockDb>['db'];
  let qb: ReturnType<typeof createMockDb>['qb'];
  let addResult: ReturnType<typeof createMockDb>['addResult'];

  beforeEach(() => {
    const mocks = createMockDb();
    db = mocks.db;
    qb = mocks.qb;
    addResult = mocks.addResult;
    repo = new BaseRepository(mocks.db, mockTable);
  });

  describe('findById', () => {
    it('returns the row when found', async () => {
      addResult([{ id: '1', name: 'Alice' }]);

      const result = await repo.findById('1');

      expect(result).toEqual({ id: '1', name: 'Alice' });
      expect(db.select).toHaveBeenCalled();
      expect(qb.from).toHaveBeenCalledWith(mockTable);
    });

    it('returns null when not found', async () => {
      addResult([]);

      const result = await repo.findById('1');

      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    it('returns all rows without options', async () => {
      addResult([{ id: '1' }, { id: '2' }]);

      const result = await repo.findMany();

      expect(result).toEqual([{ id: '1' }, { id: '2' }]);
    });

    it('filters with where clause', async () => {
      addResult([{ id: '1', role: 'admin' }]);

      const result = await repo.findMany({ where: { role: 'admin' } });

      expect(result).toHaveLength(1);
      expect(qb.where).toHaveBeenCalled();
    });

    it('applies ordering', async () => {
      addResult([{ id: '2' }, { id: '1' }]);

      await repo.findMany({ orderBy: { createdAt: 'desc' } });

      expect(qb.orderBy).toHaveBeenCalled();
    });

    it('applies pagination', async () => {
      addResult([{ id: '1' }]);

      await repo.findMany({ pagination: { page: 2, pageSize: 10 } });

      expect(qb.limit).toHaveBeenCalledWith(10);
      expect(qb.offset).toHaveBeenCalledWith(10);
    });
  });

  describe('create', () => {
    it('inserts data and returns result', async () => {
      const result = await repo.create({ name: 'Bob' });

      expect(result).toEqual({ insertId: 1, affectedRows: 0 });
      expect(db.insert().values).toHaveBeenCalledWith({ name: 'Bob' });
    });
  });

  describe('update', () => {
    it('updates and returns result', async () => {
      const result = await repo.update('1', { name: 'Bob' });

      expect(result).toEqual({ affectedRows: 1 });
    });
  });

  describe('delete', () => {
    it('returns true when rows affected', async () => {
      const result = await repo.delete('1');

      expect(result).toBe(true);
    });

    it('returns false when no rows affected', async () => {
      (db.delete().where as any).mockResolvedValue({ affectedRows: 0 });

      const result = await repo.delete('1');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('returns count without where', async () => {
      addResult([{ count: 5 }]);

      const result = await repo.count();

      expect(result).toBe(5);
    });

    it('returns 0 when no rows', async () => {
      addResult([{ count: null }]);

      const result = await repo.count();

      expect(result).toBe(0);
    });

    it('filters with where clause', async () => {
      addResult([{ count: 3 }]);

      const result = await repo.count({ role: 'admin' });

      expect(result).toBe(3);
      expect(qb.where).toHaveBeenCalled();
    });
  });

  describe('findWithPagination', () => {
    it('returns paginated result with defaults', async () => {
      addResult([{ id: '1' }, { id: '2' }]); // findMany
      addResult([{ count: 20 }]); // count

      const result = await repo.findWithPagination({
        pagination: { page: 1, pageSize: 2 },
      });

      expect(result).toEqual({
        data: [{ id: '1' }, { id: '2' }],
        total: 20,
        page: 1,
        pageSize: 2,
        totalPages: 10,
      });
    });
  });
});
