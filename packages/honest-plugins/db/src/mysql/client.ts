import MySQL, {
  type Pool,
  type PoolConnection,
  type PoolOptions,
  type ResultSetHeader,
  type RowDataPacket,
} from 'mysql2/promise';
import type { DatabaseClient, DatabaseConnection, PreparedStatement, QueryResult } from '../types';

export function createMysqlPool(options: {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl?: boolean | { rejectUnauthorized?: boolean; ca?: string; cert?: string; key?: string };
  connectionLimit?: number;
}): Pool {
  const mysqlOptions: PoolOptions = {
    host: options.host,
    port: options.port,
    user: options.user,
    password: options.password,
    database: options.database,
    waitForConnections: true,
    connectionLimit: options.connectionLimit ?? 10,
    queueLimit: 0,
  };
  if (options.ssl) {
    mysqlOptions.ssl = options.ssl === true ? { rejectUnauthorized: false } : options.ssl;
  }
  return MySQL.createPool(mysqlOptions);
}

export async function createMysqlClient(options: {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl?: boolean | { rejectUnauthorized?: boolean; ca?: string; cert?: string; key?: string };
}): Promise<DatabaseClient> {
  const pool = createMysqlPool(options);
  const connection = await pool.getConnection();
  connection.release();
  return new MysqlDatabaseClient(pool);
}

export class MysqlDatabaseClient implements DatabaseClient {
  constructor(private pool: Pool) {}
  prepare(sql: string): PreparedStatement {
    return new MysqlPreparedStatement(this.pool, sql);
  }
  async getConnection(): Promise<DatabaseConnection> {
    const conn = await this.pool.getConnection();
    return new MysqlDatabaseConnection(conn);
  }
  async close(): Promise<void> {
    await this.pool.end();
  }
}

class MysqlPreparedStatement implements PreparedStatement {
  constructor(
    private client: Pool | PoolConnection,
    private sql: string,
  ) {}
  async execute(params?: unknown[]): Promise<QueryResult> {
    const connection =
      'getConnection' in this.client ? await this.client.getConnection() : this.client;
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        this.sql,
        params as (string | number | Buffer)[],
      );
      return {
        affectedRows: result.affectedRows,
        insertId: result.insertId ? Number(result.insertId) : undefined,
      };
    } finally {
      connection.release();
    }
  }
  release(): void {}
}

class MysqlDatabaseConnection implements DatabaseConnection {
  constructor(private connection: PoolConnection) {}
  prepare(sql: string): PreparedStatement {
    return new MysqlPreparedStatement(this.connection, sql);
  }
  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const [rows] = await this.connection.query<RowDataPacket[]>(
      sql,
      params as (string | number | Buffer)[],
    );
    return rows as T[];
  }
  async execute(sql: string, params?: unknown[]): Promise<QueryResult> {
    const [result] = await this.connection.execute<ResultSetHeader>(
      sql,
      params as (string | number | Buffer)[],
    );
    return {
      affectedRows: result.affectedRows,
      insertId: result.insertId ? Number(result.insertId) : undefined,
    };
  }
  release(): void {
    this.connection.release();
  }
}
