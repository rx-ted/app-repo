import {
  mysqlTable,
  varchar,
  char,
  text,
  int,
  bigint,
  boolean,
  datetime,
  date,
  mysqlEnum,
  json,
  decimal,
} from 'drizzle-orm/mysql-core';
import type { MySqlTableWithColumns } from 'drizzle-orm/mysql-core';
import type { TableDefinition, ColumnDefinition } from './types';

type AnyMySqlTable<N extends string = string> = MySqlTableWithColumns<{
  name: N;
  columns: Record<string, any>;
  dialect: string;
  schema: string | undefined;
}>;

export function compileMysql<T extends Record<string, TableDefinition>>(
  schema: T,
): { [K in keyof T]: T[K] extends TableDefinition<infer N> ? AnyMySqlTable<N & string> : never } {
  const compiled: Record<string, any> = {};

  const dbNameToKey: Record<string, string> = {};
  for (const key of Object.keys(schema)) {
    dbNameToKey[schema[key].name] = key;
  }

  for (const tableName of Object.keys(schema)) {
    const tableDef = schema[tableName];
    const builders: Record<string, any> = {};
    for (const [colName, colDef] of Object.entries(tableDef.columns)) {
      let col = toMysqlColumn(colDef.name, colDef);
      if (colDef.references) {
        const refKey = dbNameToKey[colDef.references.table] ?? colDef.references.table;
        col = col.references(() => compiled[refKey]?.[colDef.references!.column], {
          onDelete: colDef.references!.onDelete,
        });
      }
      builders[colName] = col;
    }
    compiled[tableName] = mysqlTable(tableDef.name, builders);
  }

  return compiled as any;
}

function toMysqlColumn(name: string, def: ColumnDefinition): any {
  let col: any;
  switch (def.type) {
    case 'varchar':
      col = varchar(name, { length: def.length ?? 255 });
      break;
    case 'char':
      col = char(name, { length: def.length ?? 1 });
      break;
    case 'text':
      col = text(name);
      break;
    case 'bigint':
      col = bigint(name, { mode: 'number', unsigned: true });
      break;
    case 'integer':
      col = int(name);
      break;
    case 'boolean':
      col = boolean(name);
      break;
    case 'timestamp':
      col = datetime(name);
      break;
    case 'date':
      col = date(name);
      break;
    case 'enum':
      col =
        def.values && def.values.length > 0
          ? mysqlEnum(name, def.values as [string, ...string[]])
          : text(name);
      break;
    case 'json':
      col = json(name);
      break;
    case 'decimal':
      col = decimal(name, { precision: def.precision, scale: def.scale });
      break;
    default:
      col = text(name);
  }
  if (def.primaryKey) col = col.primaryKey();
  if (def.autoIncrement) col = col.autoincrement();
  if (def.notNull) col = col.notNull();
  if (def.unique) col = col.unique();
  if (def.default !== undefined) col = col.default(def.default);
  return col;
}
