import { describe, it, expect, vi } from 'vitest';

vi.mock('./client', () => ({
  createMysqlClient: vi.fn(),
  MysqlDatabaseClient: class {
    constructor(public pool: any) {}
    prepare = vi.fn();
    getConnection = vi.fn();
    close = vi.fn();
  },
}));

import { createMysqlDriver } from './driver';
import * as clientModule from './client';
import type { DatabaseClient, DatabaseConnection, PreparedStatement } from '../types';

function mockConnection(overrides?: Partial<DatabaseConnection>): DatabaseConnection {
  return {
    query: vi.fn(),
    execute: vi.fn(),
    prepare: vi.fn(),
    release: vi.fn(),
    ...overrides,
  };
}

function makeClient(conn?: DatabaseConnection) {
  const c = conn ?? mockConnection();
  return {
    getConnection: vi.fn().mockResolvedValue(c),
    prepare: vi.fn(),
    close: vi.fn(),
  };
}

async function buildDriver(client?: DatabaseClient) {
  const c = client ?? makeClient();
  (clientModule.createMysqlClient as any).mockResolvedValue(c);
  return createMysqlDriver({
    host: 'localhost',
    port: 3306,
    user: 'root',
    database: 'test',
  });
}

describe('MysqlDriver', () => {
  describe('query', () => {
    it('returns rows from connection', async () => {
      const conn = mockConnection();
      (conn.query as any).mockResolvedValue([{ id: 1, name: 'Alice' }]);
      const driver = await buildDriver(makeClient(conn));

      const result = await driver.query('SELECT * FROM users');

      expect(result).toEqual([{ id: 1, name: 'Alice' }]);
      expect(conn.query).toHaveBeenCalledWith('SELECT * FROM users', undefined);
      expect(conn.release).toHaveBeenCalled();
    });
  });

  describe('execute', () => {
    it('prepares, executes and releases statement', async () => {
      const stmt: PreparedStatement = {
        execute: vi.fn().mockResolvedValue({ affectedRows: 2, insertId: 10 }),
        release: vi.fn(),
      };
      const conn = mockConnection();
      (conn.prepare as any).mockReturnValue(stmt);
      const driver = await buildDriver(makeClient(conn));

      const result = await driver.execute('UPDATE users SET name = ?', ['Bob']);

      expect(result).toEqual({ affectedRows: 2, insertId: 10 });
      expect(conn.prepare).toHaveBeenCalledWith('UPDATE users SET name = ?');
      expect(stmt.execute).toHaveBeenCalledWith(['Bob']);
      expect(stmt.release).toHaveBeenCalled();
      expect(conn.release).toHaveBeenCalled();
    });
  });

  describe('transaction', () => {
    it('commits on success', async () => {
      const conn = mockConnection();
      const driver = await buildDriver(makeClient(conn));

      const result = await driver.transaction(async (tx) => {
        await tx.query('SELECT 1');
        return 'ok';
      });

      expect(result).toBe('ok');
      expect(conn.query).toHaveBeenCalledWith('SET autocommit = 0');
      expect(conn.query).toHaveBeenCalledWith('START TRANSACTION');
      expect(conn.query).toHaveBeenCalledWith('COMMIT');
      expect(conn.query).toHaveBeenCalledWith('SET autocommit = 1');
      expect(conn.release).toHaveBeenCalled();
    });

    it('rolls back on error and rethrows', async () => {
      const conn = mockConnection();
      const driver = await buildDriver(makeClient(conn));

      await expect(
        driver.transaction(async () => {
          throw new Error('db error');
        }),
      ).rejects.toThrow('db error');

      expect(conn.query).toHaveBeenCalledWith('ROLLBACK');
      expect(conn.query).toHaveBeenCalledWith('SET autocommit = 1');
    });
  });

  describe('healthCheck', () => {
    it('returns true when SELECT 1 succeeds', async () => {
      const conn = mockConnection();
      (conn.query as any).mockResolvedValue([[1]]);
      const driver = await buildDriver(makeClient(conn));

      const result = await driver.healthCheck();

      expect(result).toBe(true);
      expect(conn.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('returns false on error', async () => {
      const conn = mockConnection();
      (conn.query as any).mockRejectedValue(new Error('connection failed'));
      const driver = await buildDriver(makeClient(conn));

      const result = await driver.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('close', () => {
    it('closes the underlying client', async () => {
      const client = makeClient();
      const driver = await buildDriver(client);

      await driver.close();

      expect(client.close).toHaveBeenCalled();
    });
  });

  describe('TransactionalMysqlDriver', () => {
    it('delegates query inside transaction', async () => {
      const conn = mockConnection();
      (conn.query as any).mockResolvedValue([{ id: 1 }]);
      const driver = await buildDriver(makeClient(conn));

      const result = await driver.transaction(async (tx) => {
        return tx.query('SELECT 1');
      });

      expect(result).toEqual([{ id: 1 }]);
    });

    it('throws on nested transaction call', async () => {
      const conn = mockConnection();
      const driver = await buildDriver(makeClient(conn));

      await expect(
        driver.transaction(async (tx) => {
          return tx.transaction(async () => 'nested');
        }),
      ).rejects.toThrow('Nested transactions are not supported');
    });

    it('executes prepared statement inside transaction', async () => {
      const stmt: PreparedStatement = {
        execute: vi.fn().mockResolvedValue({ affectedRows: 1 }),
        release: vi.fn(),
      };
      const conn = mockConnection();
      (conn.prepare as any).mockReturnValue(stmt);
      const driver = await buildDriver(makeClient(conn));

      await driver.transaction(async (tx) => {
        return tx.execute('UPDATE users SET x=1');
      });

      expect(stmt.execute).toHaveBeenCalled();
      expect(stmt.release).toHaveBeenCalled();
    });
  });
});
