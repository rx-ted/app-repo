export interface PreparedStatement {
  execute(params?: unknown[]): Promise<QueryResult>;
  release(): void;
}

export interface DatabaseConnection {
  prepare(sql: string): PreparedStatement;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<QueryResult>;
  release(): void;
}

export interface DatabaseClient {
  prepare(sql: string): PreparedStatement;
  getConnection(): Promise<DatabaseConnection>;
  close(): Promise<void>;
}

export interface QueryResult {
  affectedRows: number;
  insertId?: number;
}

export interface DatabaseDriver {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<QueryResult>;
  transaction<T>(fn: (driver: DatabaseDriver) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export interface QueryOptions {
  where?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  pagination?: { page: number; pageSize: number };
  include?: string[];
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
