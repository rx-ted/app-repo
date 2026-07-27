// Common exports
export { DB_GLOBAL_KEY } from './constants';
export { DBPlugin, assertRuntimeSupport } from './resolve';
export type { AppRuntime, DbType } from './resolve';
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

// Portable schema builder (table builder + compile dispatcher)
export * from './schema-builder';

// Zod bridge
export {
  zdb,
  getZodDbMeta,
  isZodObject,
  toTableDefinition,
  toColumnDefinition,
} from './schema-builder/zod-bridge';
export type { ZodDbMeta } from './schema-builder/zod-bridge';
