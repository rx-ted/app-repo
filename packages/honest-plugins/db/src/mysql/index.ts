// Plugin
export {
  MysqlPlugin,
  DRIZZLE_GLOBAL_KEY,
  DB_CONTEXT_KEY,
  DRIZZLE_CONTEXT_KEY,
  MYSQL_CONTEXT_KEY,
  POOL_CONTEXT_KEY,
} from './plugin';
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
