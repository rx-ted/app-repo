// PostgreSQL dialect — placeholder
// Re-export Drizzle pg-core types for consumers to use in schema definitions
export {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
  primaryKey,
  foreignKey,
} from 'drizzle-orm/pg-core';
export type { PgDatabase } from 'drizzle-orm/pg-core';
