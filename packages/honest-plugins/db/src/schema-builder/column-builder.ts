import type { ColumnDefinition, ReferenceDef } from './types';

type ColumnType =
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

interface ColumnOpts {
  length?: number;
  values?: string[];
  precision?: number;
  scale?: number;
}

export class ColumnBuilder {
  private def: {
    type: ColumnType;
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
  };
  private customDbName?: string;
  __tableName?: string;
  __columnName?: string;

  constructor(type: ColumnType, opts?: ColumnOpts) {
    this.def = { type };
    if (opts?.length !== undefined) this.def.length = opts.length;
    if (opts?.values !== undefined) this.def.values = opts.values;
    if (opts?.precision !== undefined) this.def.precision = opts.precision;
    if (opts?.scale !== undefined) this.def.scale = opts.scale;
  }

  dbName(name: string): this {
    this.customDbName = name;
    return this;
  }
  primaryKey(): this {
    this.def.primaryKey = true;
    return this;
  }
  autoIncrement(): this {
    this.def.autoIncrement = true;
    return this;
  }
  notNull(): this {
    this.def.notNull = true;
    return this;
  }
  unique(): this {
    this.def.unique = true;
    return this;
  }
  default(value: unknown): this {
    this.def.default = value;
    return this;
  }

  references(fn: () => ColumnBuilder, opts?: { onDelete?: ReferenceDef['onDelete'] }): this {
    const target = fn();
    const tbl = target.__tableName ?? (target as any).table?.[Symbol.for('drizzle:Name')];
    const col = target.__columnName ?? (target as any).name;
    if (!tbl || !col)
      throw new Error('references() target not fully initialized (missing table/column name)');
    this.def.references = { table: tbl, column: col, onDelete: opts?.onDelete };
    return this;
  }

  build(name: string): ColumnDefinition {
    return { name: this.customDbName ?? name, ...this.def } as ColumnDefinition;
  }
}
