import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { SchemaDefinition, ColumnDefinition } from './types';

export function compileD1<T extends SchemaDefinition>(schema: T): { [K in keyof T]: SQLiteTable } {
  const compiled: Record<string, any> = {};

  const dbNameToKey: Record<string, string> = {};
  for (const key of Object.keys(schema)) {
    dbNameToKey[schema[key].name] = key;
  }

  for (const tableName of Object.keys(schema)) {
    const tableDef = schema[tableName];
    const builders: Record<string, any> = {};
    for (const [colName, colDef] of Object.entries(tableDef.columns)) {
      let col = toD1Column(colDef.name, colDef);
      if (colDef.references) {
        const refKey = dbNameToKey[colDef.references.table] ?? colDef.references.table;
        col = col.references(() => compiled[refKey]?.[colDef.references!.column], {
          onDelete: colDef.references!.onDelete,
        });
      }
      builders[colName] = col;
    }
    compiled[tableName] = sqliteTable(tableDef.name, builders);
  }

  return compiled as { [K in keyof T]: SQLiteTable };
}

function toD1Column(name: string, def: ColumnDefinition): any {
  let col: any;
  switch (def.type) {
    case 'varchar':
    case 'char':
    case 'text':
    case 'enum':
      col = text(name);
      break;
    case 'json':
      col = text(name, { mode: 'json' });
      break;
    case 'bigint':
    case 'integer':
      col = integer(name);
      break;
    case 'boolean':
      col = integer(name, { mode: 'boolean' });
      break;
    case 'timestamp':
    case 'date':
      col = integer(name, { mode: 'timestamp' });
      break;
    case 'decimal':
      col = real(name);
      break;
    default:
      col = text(name);
  }
  if (def.autoIncrement) {
    col = col.primaryKey({ autoIncrement: true });
  } else if (def.primaryKey) {
    col = col.primaryKey();
  }
  if (def.notNull) col = col.notNull();
  if (def.unique) col = col.unique();
  if (def.default !== undefined) col = col.default(def.default);
  return col;
}
