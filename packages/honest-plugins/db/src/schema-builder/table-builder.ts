import { ColumnBuilder } from './column-builder';
import type { TableDefinition, ColumnDefinition } from './types';

function c(
  type: ConstructorParameters<typeof ColumnBuilder>[0],
  opts?: ConstructorParameters<typeof ColumnBuilder>[1],
) {
  return new ColumnBuilder(type, opts);
}

export const t = {
  varchar: (length: number) => c('varchar', { length }),
  char: (length: number) => c('char', { length }),
  text: () => c('text'),
  bigint: () => c('bigint'),
  integer: () => c('integer'),
  boolean: () => c('boolean'),
  timestamp: () => c('timestamp'),
  date: () => c('date'),
  enum: (values: string[]) => c('enum', { values }),
  json: () => c('json'),
  decimal: (p: number, s: number) => c('decimal', { precision: p, scale: s }),
};

export function table<N extends string>(
  name: N,
  columns: Record<string, ColumnBuilder>,
): TableDefinition<N> {
  const defs: Record<string, ColumnDefinition> = {};
  for (const [colName, builder] of Object.entries(columns)) {
    builder.__tableName = name;
    builder.__columnName = colName;
    defs[colName] = builder.build(colName);
  }
  const tbl: TableDefinition<N> = { name, columns: defs };
  return proxyTable(tbl, columns);
}

function proxyTable<N extends string>(
  tbl: TableDefinition<N>,
  columns: Record<string, ColumnBuilder>,
): TableDefinition<N> {
  return new Proxy(tbl, {
    get(target, prop) {
      if (prop in target) return (target as any)[prop];
      if (typeof prop === 'string' && prop in columns) return columns[prop];
      return undefined;
    },
  }) as unknown as TableDefinition<N>;
}
