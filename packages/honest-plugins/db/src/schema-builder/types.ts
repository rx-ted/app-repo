export type Dialect = 'mysql' | 'd1' | 'sqlite';

export interface ReferenceDef {
  table: string;
  column: string;
  onDelete?: 'cascade' | 'set null' | 'restrict' | 'no action';
}

export interface ColumnDefinition {
  type: string;
  /** DB column name (distinct from the Record key which is the JS property name) */
  name: string;
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

export interface TableDefinition<N extends string = string> {
  name: N;
  columns: Record<string, ColumnDefinition>;
}

export type SchemaDefinition = Record<string, TableDefinition>;
