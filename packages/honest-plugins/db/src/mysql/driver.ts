import type { Pool } from 'mysql2/promise';
import type { Logger } from '@rx-ted/packages-core';
import type { DatabaseClient, DatabaseConnection, DatabaseDriver, QueryResult } from '../types';
import { createMysqlClient, MysqlDatabaseClient } from './client';

export async function createMysqlDriver(options: {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl?: boolean | { rejectUnauthorized?: boolean; ca?: string; cert?: string; key?: string };
  logger?: Logger;
  pool?: Pool;
}): Promise<DatabaseDriver> {
  const logger = options.logger;
  if (logger)
    logger.debug(
      { host: options.host, port: options.port, database: options.database },
      'MySQL: connecting',
    );
  const client = options.pool
    ? new MysqlDatabaseClient(options.pool)
    : await createMysqlClient(options);
  if (logger) logger.info('MySQL: connected');
  return new MysqlDriver(client, logger);
}

class MysqlDriver implements DatabaseDriver {
  constructor(
    private client: DatabaseClient,
    private logger?: Logger,
  ) {}
  async query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    if (this.logger) this.logger.debug({ sql: sql.substring(0, 100), params }, 'MySQL: query');
    const conn = await this.client.getConnection();
    const result = await conn.query<T>(sql, params);
    conn.release();
    if (this.logger) this.logger.debug({ rows: result.length }, 'MySQL: result');
    return result;
  }
  async execute(sql: string, params?: unknown[]): Promise<QueryResult> {
    if (this.logger) this.logger.debug({ sql: sql.substring(0, 100), params }, 'MySQL: execute');
    const conn = await this.client.getConnection();
    const stmt = conn.prepare(sql);
    const result = await stmt.execute(params);
    stmt.release();
    conn.release();
    if (this.logger)
      this.logger.debug(
        { affectedRows: result.affectedRows, insertId: result.insertId },
        'MySQL: executed',
      );
    return {
      affectedRows: result.affectedRows,
      insertId: result.insertId ? Number(result.insertId) : undefined,
    };
  }
  async transaction<T>(fn: (driver: DatabaseDriver) => Promise<T>): Promise<T> {
    const conn = await this.client.getConnection();
    await conn.query('SET autocommit = 0');
    await conn.query('START TRANSACTION');
    const txDriver = new TransactionalMysqlDriver(conn, this.logger);
    try {
      const result = await fn(txDriver);
      await conn.query('COMMIT');
      await conn.query('SET autocommit = 1');
      if (this.logger) this.logger.debug('MySQL: transaction committed');
      return result;
    } catch (error) {
      await conn.query('ROLLBACK');
      await conn.query('SET autocommit = 1');
      if (this.logger) this.logger.error({ error }, 'MySQL: transaction rolled back');
      throw error;
    } finally {
      conn.release();
    }
  }
  async close(): Promise<void> {
    await this.client.close();
    if (this.logger) this.logger.info('MySQL: closed');
  }
  async healthCheck(): Promise<boolean> {
    try {
      const conn = await this.client.getConnection();
      await conn.query('SELECT 1');
      conn.release();
      return true;
    } catch {
      return false;
    }
  }
}

class TransactionalMysqlDriver implements DatabaseDriver {
  constructor(
    private connection: DatabaseConnection,
    _logger?: Logger,
  ) {}
  async query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    return this.connection.query<T>(sql, params);
  }
  async execute(sql: string, params?: unknown[]): Promise<QueryResult> {
    const stmt = this.connection.prepare(sql);
    const result = await stmt.execute(params);
    stmt.release();
    return result;
  }
  async transaction<T>(_fn: (driver: DatabaseDriver) => Promise<T>): Promise<T> {
    throw new Error('Nested transactions are not supported');
  }
  async close(): Promise<void> {}
  async healthCheck(): Promise<boolean> {
    return true;
  }
}
