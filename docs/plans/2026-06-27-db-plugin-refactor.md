# DB Plugin Refactor Implementation Plan

> **Status: IMPLEMENTED** — MySQL 已重构为多数据库支持（MySQL/SQLite/D1/PostgreSQL）。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename `packages/honest/src/plugins/mysql/` → `packages/honest/src/plugins/db/` with multi-database support (MySQL, PostgreSQL, SQLite, D1), unified under Drizzle ORM.

**Architecture:** Remove `orm/` (QueryBuilder). Keep only Drizzle-based `BaseRepository`. `DB` type is dialect-specific (not exported from common `types.ts`). Each dialect has its own subdirectory with driver + plugin + Drizzle re-exports. Common interfaces (`DatabaseDriver`, `QueryResult`, etc.) stay in `types.ts`.

**Tech Stack:** drizzle-orm, mysql2, TypeScript 6.0, vitest

---

### Task 1: Create `db/types.ts` — dialect-agnostic interfaces

**Files:**
- Create: `packages/honest/src/plugins/db/types.ts`

- [ ] **Step 1: Write the file**

Content:
```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/honest/src/plugins/db/types.ts
git commit -m "refactor(db): add dialect-agnostic type interfaces"
```

---

### Task 2: Create `db/constants.ts` and `db/db-service.ts`

**Files:**
- Create: `packages/honest/src/plugins/db/constants.ts`
- Create: `packages/honest/src/plugins/db/db-service.ts`
- Read: `packages/honest/src/plugins/mysql/db-service.ts`

- [ ] **Step 1: Create `db/constants.ts`**

Defines the global key that all dialect plugins use to register their Drizzle instance:

```typescript
export const DB_GLOBAL_KEY = 'db';
```

- [ ] **Step 2: Read the existing db-service.ts**

```bash
cat packages/honest/src/plugins/mysql/db-service.ts
```

- [ ] **Step 3: Create `db/db-service.ts`**

```typescript
import { Service } from '../../decorators';
import { ComponentManager } from '../../managers';
import { DB_GLOBAL_KEY } from './constants';

@Service()
class DbService {
  constructor() {
    return ComponentManager.getPlugin(DB_GLOBAL_KEY);
  }
}

export { DbService };
```

- [ ] **Step 4: Commit**

```bash
git add packages/honest/src/plugins/db/constants.ts packages/honest/src/plugins/db/db-service.ts
git commit -m "refactor(db): create DB_GLOBAL_KEY constant and generic DbService"
```

---

### Task 3: Create `db/repository.ts` — generic BaseRepository

**Files:**
- Create: `packages/honest/src/plugins/db/repository.ts`
- Read: `packages/honest/src/plugins/mysql/repository.ts`

- [ ] **Step 1: Read existing repository.ts**

```bash
cat packages/honest/src/plugins/mysql/repository.ts
```

- [ ] **Step 2: Create new repository.ts**

Replace `MySqlTable` with `Table` from `drizzle-orm`, use `any` for db instance:

```typescript
import { type Table, eq, and, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { QueryOptions, PaginationResult } from './types';

export class BaseRepository<TTable extends Table> {
  protected db: any;
  protected table: TTable;

  constructor(db: any, table: TTable) {
    this.db = db;
    this.table = table;
  }

  async findById(id: string): Promise<any | null> {
    const [result] = await this.db
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id))
      .limit(1);
    return result ?? null;
  }

  async findMany(options?: QueryOptions): Promise<any[]> {
    let query = this.db.select().from(this.table);
    if (options?.where) {
      const conditions = Object.entries(options.where).map(
        ([key, value]) => eq((this.table as any)[key], value),
      );
      query = query.where(and(...conditions));
    }
    if (options?.orderBy) {
      for (const [key, dir] of Object.entries(options.orderBy)) {
        query = query.orderBy(
          dir === 'desc'
            ? sql`${(this.table as any)[key]} desc`
            : sql`${(this.table as any)[key]} asc`,
        );
      }
    }
    if (options?.pagination) {
      const { page, pageSize } = options.pagination;
      query = query.limit(pageSize).offset((page - 1) * pageSize);
    }
    return query;
  }

  async findWithPagination(options?: QueryOptions): Promise<PaginationResult<any>> {
    const page = options?.pagination?.page ?? 1;
    const pageSize = options?.pagination?.pageSize ?? 10;
    const data = await this.findMany(options);
    const total = await this.count(options?.where);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async create(data: any): Promise<any> {
    const [result] = await this.db.insert(this.table).values(data);
    return result;
  }

  async update(id: string, data: any): Promise<any | null> {
    const [result] = await this.db
      .update(this.table)
      .set(data)
      .where(eq((this.table as any).id, id));
    return result ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(this.table)
      .where(eq((this.table as any).id, id));
    return result.affectedRows > 0;
  }

  async count(where?: Record<string, any>): Promise<number> {
    let query = this.db.select({ count: sql<number>`count(*)` }).from(this.table);
    if (where) {
      const conditions = Object.entries(where).map(
        ([key, value]) => eq((this.table as any)[key], value),
      );
      query = query.where(and(...conditions));
    }
    const [result] = await query;
    return Number(result?.count ?? 0);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/honest/src/plugins/db/repository.ts
git commit -m "refactor(db): create generic BaseRepository with Table type"
```

---

### Task 4: Create `db/mysql/` directory with MySQL implementation

**Files:**
- Create: `packages/honest/src/plugins/db/mysql/client.ts`
- Create: `packages/honest/src/plugins/db/mysql/driver.ts`
- Create: `packages/honest/src/plugins/db/mysql/plugin.ts`
- Create: `packages/honest/src/plugins/db/mysql/index.ts`
- Read: `packages/honest/src/plugins/mysql/mysql.client.ts`
- Read: `packages/honest/src/plugins/mysql/mysql.driver.ts`
- Read: `packages/honest/src/plugins/mysql/mysql.plugin.ts`
- Read: `packages/honest/src/plugins/mysql/index.ts`
- Read: `packages/honest/src/plugins/mysql/types.ts`

- [ ] **Step 1: Create `db/mysql/client.ts`**

Copy from `mysql.client.ts` unchanged, only update the type import path:

```typescript
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
  host: string; port: number; user: string; password?: string; database: string;
  ssl?: boolean | { rejectUnauthorized?: boolean; ca?: string; cert?: string; key?: string };
}): Promise<DatabaseClient> {
  const pool = createMysqlPool(options);
  const connection = await pool.getConnection();
  connection.release();
  return new MysqlDatabaseClient(pool);
}

export class MysqlDatabaseClient implements DatabaseClient {
  constructor(private pool: Pool) {}
  prepare(sql: string): PreparedStatement { return new MysqlPreparedStatement(this.pool, sql); }
  async getConnection(): Promise<DatabaseConnection> { const conn = await this.pool.getConnection(); return new MysqlDatabaseConnection(conn); }
  async close(): Promise<void> { await this.pool.end(); }
}

class MysqlPreparedStatement implements PreparedStatement {
  constructor(private client: Pool | PoolConnection, private sql: string) {}
  async execute(params?: unknown[]): Promise<QueryResult> {
    const connection = 'getConnection' in this.client ? await this.client.getConnection() : this.client;
    try {
      const [result] = await connection.execute<ResultSetHeader>(this.sql, params as (string | number | Buffer)[]);
      return { affectedRows: result.affectedRows, insertId: result.insertId ? Number(result.insertId) : undefined };
    } finally { connection.release(); }
  }
  release(): void {}
}

class MysqlDatabaseConnection implements DatabaseConnection {
  constructor(private connection: PoolConnection) {}
  prepare(sql: string): PreparedStatement { return new MysqlPreparedStatement(this.connection, sql); }
  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const [rows] = await this.connection.query<RowDataPacket[]>(sql, params as (string | number | Buffer)[]);
    return rows as T[];
  }
  async execute(sql: string, params?: unknown[]): Promise<QueryResult> {
    const [result] = await this.connection.execute<ResultSetHeader>(sql, params as (string | number | Buffer)[]);
    return { affectedRows: result.affectedRows, insertId: result.insertId ? Number(result.insertId) : undefined };
  }
  release(): void { this.connection.release(); }
}
```

- [ ] **Step 2: Create `db/mysql/driver.ts`**

Update import from `./mysql.client` to `./client`, import types from `../types`:

```typescript
import type { Pool } from 'mysql2/promise';
import type { Logger } from '@rx-ted/packages-logger';
import type { DatabaseClient, DatabaseConnection, DatabaseDriver, QueryResult } from '../types';
import { createMysqlClient, MysqlDatabaseClient } from './client';

export async function createMysqlDriver(options: {
  host: string; port: number; user: string; password?: string; database: string;
  ssl?: boolean | { rejectUnauthorized?: boolean; ca?: string; cert?: string; key?: string };
  logger?: Logger; pool?: Pool;
}): Promise<DatabaseDriver> {
  const logger = options.logger;
  if (logger) logger.debug({ host: options.host, port: options.port, database: options.database }, 'MySQL: connecting');
  const client = options.pool ? new MysqlDatabaseClient(options.pool) : await createMysqlClient(options);
  if (logger) logger.info('MySQL: connected');
  return new MysqlDriver(client, logger);
}

class MysqlDriver implements DatabaseDriver {
  constructor(private client: DatabaseClient, private logger?: Logger) {}
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
    stmt.release(); conn.release();
    if (this.logger) this.logger.debug({ affectedRows: result.affectedRows, insertId: result.insertId }, 'MySQL: executed');
    return { affectedRows: result.affectedRows, insertId: result.insertId ? Number(result.insertId) : undefined };
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
    } finally { conn.release(); }
  }
  async close(): Promise<void> { await this.client.close(); if (this.logger) this.logger.info('MySQL: closed'); }
  async healthCheck(): Promise<boolean> { try { const conn = await this.client.getConnection(); await conn.query('SELECT 1'); conn.release(); return true; } catch { return false; } }
}

class TransactionalMysqlDriver implements DatabaseDriver {
  constructor(private connection: DatabaseConnection, _logger?: Logger) {}
  async query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> { return this.connection.query<T>(sql, params); }
  async execute(sql: string, params?: unknown[]): Promise<QueryResult> { const stmt = this.connection.prepare(sql); const result = await stmt.execute(params); stmt.release(); return result; }
  async transaction<T>(_fn: (driver: DatabaseDriver) => Promise<T>): Promise<T> { throw new Error('Nested transactions are not supported'); }
  async close(): Promise<void> {}
  async healthCheck(): Promise<boolean> { return true; }
}
```

- [ ] **Step 3: Create `db/mysql/plugin.ts`**

Import `DB_GLOBAL_KEY` from `../constants`, rename other keys:

```typescript
import type { Hono } from 'hono';
import type mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import type { ILogger } from '@rx-ted/packages-logger';
import type { Application } from '../../application';
import type { IPlugin } from '../../interfaces';
import { createMysqlPool } from './client';
import { createMysqlDriver } from './driver';
import type { DatabaseDriver } from '../types';
import { ComponentManager } from '../../managers';
import { maskSensitive } from '../../utils';
import { DB_GLOBAL_KEY } from '../constants';

export const DB_CONTEXT_KEY = 'context:db';
export const POOL_CONTEXT_KEY = 'honest:mysql:pool';

// Backward-compat aliases
export const DRIZZLE_GLOBAL_KEY = DB_GLOBAL_KEY;
export const DRIZZLE_CONTEXT_KEY = DB_CONTEXT_KEY;
export const MYSQL_CONTEXT_KEY = 'honest:mysql';

export interface MysqlPluginOptions {
  connection: {
    host: string; port: number; user: string; password?: string; database: string;
    ssl?: boolean | { rejectUnauthorized?: boolean; ca?: string; cert?: string; key?: string };
    connectionLimit?: number;
  };
  contextKey?: string;
  schema?: Record<string, unknown>;
  logger?: boolean | ((log: string) => void);
  plugins?: Array<{ name: string; install: (db: any) => void }>;
}

export class MysqlPlugin implements IPlugin {
  static readonly globalKey = DB_GLOBAL_KEY;
  readonly name = 'mysql-plugin';
  readonly version = '1.0.0';
  logger?: ILogger;
  private driver: DatabaseDriver | null = null;
  private drizzleInstance: any = null;
  private pool: mysql.Pool | null = null;
  private readonly options: MysqlPluginOptions;
  private readonly contextKey: string;

  constructor(options: MysqlPluginOptions) {
    this.options = options;
    this.contextKey = options.contextKey ?? MYSQL_CONTEXT_KEY;
  }

  getClient(): DatabaseDriver {
    if (!this.driver) throw new Error('MySQL driver not initialized');
    return this.driver;
  }

  getDrizzle(): any {
    if (!this.drizzleInstance) throw new Error('Drizzle not initialized');
    return this.drizzleInstance;
  }

  getPool(): mysql.Pool {
    if (!this.pool) throw new Error('MySQL pool not initialized');
    return this.pool;
  }

  async beforeModulesRegistered(app: Application, _hono: Hono): Promise<void> {
    const logger = this.logger;
    if (logger) logger.info({ host: this.options.connection.host, database: this.options.connection.database, masked: maskSensitive(this.options.connection) }, 'MySQL: initializing');

    this.pool = createMysqlPool({ ...this.options.connection });
    this.driver = await createMysqlDriver({ ...this.options.connection, pool: this.pool, logger: logger as any });

    const { schema } = this.options;
    this.drizzleInstance = drizzle(this.pool, {
      schema,
      logger: this.options.logger
        ? (typeof this.options.logger === 'function' ? { log: this.options.logger } : { log: (msg: string) => logger?.info(msg) })
        : undefined,
    });

    ComponentManager.registerPlugin(DB_GLOBAL_KEY, this.drizzleInstance);
    app.setContext(this.contextKey, this.drizzleInstance);
    app.setContext(DB_CONTEXT_KEY, this.drizzleInstance);
  }

  async afterModulesRegistered(_app: Application, _hono: Hono): Promise<void> {
    const healthy = await this.driver?.healthCheck();
    if (this.logger) {
      if (healthy) {
        this.logger.info('MySQL: health check passed');
      } else {
        this.logger.error('MySQL: health check failed');
      }
    }
  }

  async close(): Promise<void> {
    if (this.logger) this.logger.info('MySQL: shutting down');
    await this.driver?.close();
    if (this.pool) await this.pool.end();
    this.driver = null;
    this.drizzleInstance = null;
    this.pool = null;
  }
}
```

- [ ] **Step 4: Create `db/mysql/types.ts`**

MySQL-specific types that were in `mysql/types.ts` but don't belong in `db/types.ts`:

```typescript
import type { Logger } from '@rx-ted/packages-logger';

export interface DatabaseOptions {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl?: boolean | { rejectUnauthorized?: boolean; ca?: string; cert?: string; key?: string };
}

export interface SslOptions {
  rejectUnauthorized?: boolean;
  ca?: string;
  cert?: string;
  key?: string;
}

export interface DriverOptions {
  logger?: Logger;
}

export interface DatabaseDriverOptions extends DatabaseOptions, DriverOptions {}

export interface MysqlClientOptions {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl?: boolean | { rejectUnauthorized?: boolean; ca?: string; cert?: string; key?: string };
}
```

- [ ] **Step 5: Create `db/mysql/index.ts`**

```typescript
// Plugin
export { MysqlPlugin, DRIZZLE_GLOBAL_KEY, DB_CONTEXT_KEY, DRIZZLE_CONTEXT_KEY, MYSQL_CONTEXT_KEY, POOL_CONTEXT_KEY } from './plugin';
export type { MysqlPluginOptions } from './plugin';

// Global key
export { DB_GLOBAL_KEY } from '../constants';

// Raw driver
export { createMysqlDriver } from './driver';
export { createMysqlPool, createMysqlClient, MysqlDatabaseClient } from './client';
export type { MysqlClientOptions } from './types';

// MySQL-specific types
export type {
  DatabaseOptions,
  SslOptions,
  DriverOptions,
  DatabaseDriverOptions,
} from './types';

// ── Drizzle ORM re-exports ──
export {
  mysqlTable,
  varchar,
  int,
  bigint,
  char,
  text,
  longtext,
  date,
  datetime,
  timestamp,
  boolean,
  json,
  mysqlEnum,
  uniqueIndex,
  index,
  primaryKey,
  foreignKey,
} from 'drizzle-orm/mysql-core';

export type { MySql2Database } from 'drizzle-orm/mysql2';
export { drizzle } from 'drizzle-orm/mysql2';
export * as drizzleORM from 'drizzle-orm';
```

- [ ] **Step 6: Commit**

```bash
git add packages/honest/src/plugins/db/mysql/
git commit -m "refactor(db): port MySQL implementation to db/mysql"
```

---

### Task 5: Create `db/index.ts` — main barrel

**Files:**
- Create: `packages/honest/src/plugins/db/index.ts`

- [ ] **Step 1: Write `db/index.ts`**

```typescript
// Common exports
export { DB_GLOBAL_KEY } from './constants';
export { DbService } from './db-service';
export { BaseRepository } from './repository';
export type {
  DatabaseClient,
  PreparedStatement,
  DatabaseConnection,
  QueryResult,
  DatabaseDriver,
  QueryOptions,
  PaginationResult,
} from './types';

// Common Drizzle operators
export {
  eq,
  and,
  or,
  not,
  inArray,
  sql,
  asc,
  desc,
  count,
  like,
  isNull,
  isNotNull,
} from 'drizzle-orm';

// MySQL dialect (top-level for backward compatibility + namespaced)
export * from './mysql';
export * as mysql from './mysql';

// PostgreSQL dialect (namespaced only)
export * as postgres from './postgres';

// SQLite dialect (namespaced only)
export * as sqlite from './sqlite';

// Cloudflare D1 dialect (namespaced only)
export * as d1 from './d1';
```

- [ ] **Step 2: Commit**

```bash
git add packages/honest/src/plugins/db/index.ts
git commit -m "refactor(db): create main barrel with common + dialect exports"
```

---

### Task 6: Create stub directories for postgres, sqlite, d1

**Files:**
- Create: `packages/honest/src/plugins/db/postgres/index.ts`
- Create: `packages/honest/src/plugins/db/sqlite/index.ts`
- Create: `packages/honest/src/plugins/db/d1/index.ts`

- [ ] **Step 1: Create `db/postgres/index.ts`**

```typescript
// Placeholder for PostgreSQL dialect
// Re-export Drizzle pg-core types for consumers to use in schema definitions
export { pgTable, text, integer, boolean, timestamp, pgEnum, uniqueIndex, index, primaryKey, foreignKey } from 'drizzle-orm/pg-core';
export type { PgDatabase } from 'drizzle-orm/pg-core';
```

- [ ] **Step 2: Create `db/sqlite/index.ts`**

```typescript
// Placeholder for SQLite dialect (libsql / better-sqlite3)
// Re-export Drizzle sqlite-core types for consumers to use in schema definitions
export { sqliteTable, text, integer, real, blob, uniqueIndex, index, primaryKey, foreignKey } from 'drizzle-orm/sqlite-core';
export type { SQLiteDatabase } from 'drizzle-orm/sqlite-core';
```

- [ ] **Step 3: Create `db/d1/index.ts`**

```typescript
// Placeholder for Cloudflare D1 dialect
// D1 uses sqlite-core for table definitions + drizzle-orm/d1 for the client
export { sqliteTable, text, integer, real, blob, uniqueIndex, index, primaryKey, foreignKey } from 'drizzle-orm/sqlite-core';
export type { D1Database as D1DrizzleDatabase } from 'drizzle-orm/d1';
```

- [ ] **Step 4: Commit**

```bash
git add packages/honest/src/plugins/db/postgres/ packages/honest/src/plugins/db/sqlite/ packages/honest/src/plugins/db/d1/
git commit -m "refactor(db): add stub directories for postgres, sqlite, d1"
```

---

### Task 7: Update `plugins/index.ts` — point barrel to `./db`

**Files:**
- Modify: `packages/honest/src/plugins/index.ts`

- [ ] **Step 1: Read and update**

Current content:
```typescript
export * from './api-doc';
export * from './redis';
export * from './mysql';
export * from './s3';
export * from './mail';
```

Replace `'./mysql'` with `'./db'`:
```typescript
export * from './api-doc';
export * from './redis';
export * from './db';
export * from './s3';
export * from './mail';
```

- [ ] **Step 2: Commit**

```bash
git add packages/honest/src/plugins/index.ts
git commit -m "refactor(db): update plugins barrel to point to db/"
```

---

### Task 8: Remove old `mysql/` directory (including `orm/`)

**Files:**
- Delete: `packages/honest/src/plugins/mysql/` (entire directory)

- [ ] **Step 1: Delete the directory**

```bash
rm -rf packages/honest/src/plugins/mysql
```

- [ ] **Step 2: Commit**

```bash
git add -A packages/honest/src/plugins/mysql
git commit -m "refactor(db): remove old mysql plugin directory"
```

---

### Task 9: Verify TypeScript compilation

**Files:**
- All files in packages/honest

- [ ] **Step 1: Run TypeScript check on honest package**

```bash
cd packages/honest && npx tsc --noEmit
```

Expected: No type errors. If errors occur:
- Check import paths in `db/mysql/` files (they reference `../types`, `../../application`, `../../managers`, etc.)
- Check that `plugins/index.ts` no longer references `./mysql`
- Check that all common types are correctly exported

- [ ] **Step 2: Run vitest for honest package**

```bash
cd packages/honest && npx vitest run
```

Expected: All existing tests pass (no mysql-specific tests exist, but general honest tests should pass).

- [ ] **Step 3: Verify platform-api still resolves imports**

```bash
cd apps/platform-api && npx tsc --noEmit
```

Expected: No type errors. If errors occur, check that:
- The e2e mock setup at `e2e/tests/platform-api/setup.ts` still mocks `@rx-ted/packages-honest` correctly
- Entity files importing `mysqlTable`, `varchar`, etc. from `@rx-ted/packages-honest` still resolve (they should since `db/index.ts` re-exports from `./mysql`)

- [ ] **Step 4: Run platform-api vitest**

```bash
cd apps/platform-api && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 5: Commit if fixes made**

```bash
git commit -m "fix(db): resolve type errors after refactor"
```

---

### Task 10: Final cleanup and verification

- [ ] **Step 1: Verify no remaining references to old `./mysql` import path**

```bash
rg "from '\.\/mysql'" packages/honest/src/
```

Expected: No matches (all should be `'./db'` or `'./mysql/...'`).

- [ ] **Step 2: Verify the file tree looks correct**

```bash
ls -R packages/honest/src/plugins/db/
```

Expected output:
```
db/
├── index.ts
├── constants.ts
├── types.ts
├── db-service.ts
├── repository.ts
├── mysql/
│   ├── index.ts
│   ├── client.ts
│   ├── driver.ts
│   ├── plugin.ts
│   └── types.ts
├── postgres/
│   └── index.ts
├── sqlite/
│   └── index.ts
└── d1/
    └── index.ts
```

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "refactor(db): final cleanup after mysql-to-db migration"
```
