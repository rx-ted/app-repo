import { z } from 'zod';
import type { ColumnDefinition, ReferenceDef } from './types';

const DB_COL = Symbol('zod:db-col');

export interface ZodDbMeta {
  type:
    | 'varchar'
    | 'char'
    | 'text'
    | 'bigint'
    | 'integer'
    | 'boolean'
    | 'timestamp'
    | 'date'
    | 'enum'
    | 'json'
    | 'decimal';
  dbName?: string;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  notNull?: boolean;
  unique?: boolean;
  default?: unknown;
  length?: number;
  values?: string[];
  precision?: number;
  scale?: number;
  references?: ReferenceDef;
}

export function zdb<T extends z.ZodType>(zod: T, meta: ZodDbMeta): T {
  Object.defineProperty(zod, DB_COL, {
    value: meta,
    writable: true,
    configurable: true,
  });
  return zod;
}

export function getZodDbMeta(zod: z.ZodType): ZodDbMeta | undefined {
  return (zod as any)[DB_COL];
}

export function isZodObject(schema: unknown): schema is z.ZodObject<any> {
  return typeof schema === 'object' && schema !== null && 'shape' in schema;
}

export function toColumnDefinition(jsName: string, zod: z.ZodType): ColumnDefinition {
  const meta = getZodDbMeta(zod);
  if (!meta) {
    const inner = (zod as any)._def?.innerType;
    if (zod instanceof z.ZodDefault && inner) {
      return toColumnDefinition(jsName, inner);
    }
    if (zod instanceof z.ZodNullable && inner) {
      return toColumnDefinition(jsName, inner);
    }
    if (zod instanceof z.ZodOptional && inner) {
      return toColumnDefinition(jsName, inner);
    }
    throw new Error(`Column "${jsName}" has no db metadata. Use zdb() to attach metadata.`);
  }
  return {
    name: meta.dbName ?? jsName,
    type: meta.type,
    primaryKey: meta.primaryKey,
    autoIncrement: meta.autoIncrement,
    notNull: meta.notNull,
    unique: meta.unique,
    default: meta.default,
    length: meta.length,
    values: meta.values,
    precision: meta.precision,
    scale: meta.scale,
    references: meta.references,
  };
}

export function toTableDefinition(
  name: string,
  schema: z.ZodObject<any>,
): { name: string; columns: Record<string, ColumnDefinition> } {
  const columns: Record<string, ColumnDefinition> = {};
  for (const [key, zod] of Object.entries(schema.shape)) {
    columns[key] = toColumnDefinition(key, zod as z.ZodType);
  }
  return { name, columns };
}
