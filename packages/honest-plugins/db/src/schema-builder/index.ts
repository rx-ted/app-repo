export { t, table } from './table-builder';
export type {
  Dialect,
  ColumnDefinition,
  TableDefinition,
  SchemaDefinition,
  ReferenceDef,
} from './types';
export { compileMysql } from './compile-mysql';
export { compileD1 } from './compile-d1';
export {
  zdb,
  getZodDbMeta,
  isZodObject,
  toTableDefinition,
  toColumnDefinition,
} from './zod-bridge';
export type { ZodDbMeta } from './zod-bridge';
import { isZodObject, toTableDefinition } from './zod-bridge';
import type { Dialect } from './types';
import { compileMysql } from './compile-mysql';
import { compileD1 } from './compile-d1';

export function compileSchema<T extends Record<string, any>>(
  dialect: Dialect,
  schema: T,
): Record<string, any> {
  const definitions: Record<string, any> = {};
  for (const [name, def] of Object.entries(schema)) {
    definitions[name] = isZodObject(def) ? toTableDefinition(name, def) : def;
  }
  switch (dialect) {
    case 'mysql':
      return compileMysql(definitions);
    case 'd1':
    case 'sqlite':
      return compileD1(definitions);
    default:
      throw new Error(`Unknown dialect: ${dialect}`);
  }
}
