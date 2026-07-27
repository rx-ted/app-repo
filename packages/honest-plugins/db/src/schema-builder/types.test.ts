import { describe, it, expect } from 'vitest';
import type { ColumnDefinition, TableDefinition, SchemaDefinition } from './types';

describe('schema-builder types', () => {
  it('ColumnDefinition shape with common fields', () => {
    const col: ColumnDefinition = {
      type: 'varchar',
      name: 'email',
      length: 255,
      notNull: true,
      unique: true,
    };
    expect(col.type).toBe('varchar');
    expect(col.notNull).toBe(true);
  });

  it('ColumnDefinition supports autoIncrement', () => {
    const col: ColumnDefinition = {
      type: 'integer',
      name: 'id',
      autoIncrement: true,
      primaryKey: true,
    };
    expect(col.autoIncrement).toBe(true);
  });

  it('ColumnDefinition supports enum values and default', () => {
    const col: ColumnDefinition = {
      type: 'enum',
      name: 'role',
      values: ['admin', 'user'],
      default: 'user',
    };
    expect(col.values).toEqual(['admin', 'user']);
    expect(col.default).toBe('user');
  });

  it('ColumnDefinition supports precision and scale', () => {
    const col: ColumnDefinition = { type: 'decimal', name: 'price', precision: 10, scale: 2 };
    expect(col.precision).toBe(10);
    expect(col.scale).toBe(2);
  });

  it('ColumnDefinition supports references with onDelete', () => {
    const col: ColumnDefinition = {
      type: 'char',
      name: 'user_id',
      length: 36,
      references: { table: 'users', column: 'id', onDelete: 'cascade' },
    };
    expect(col.references?.table).toBe('users');
    expect(col.references?.onDelete).toBe('cascade');
  });

  it('TableDefinition shape', () => {
    const t: TableDefinition = {
      name: 'users',
      columns: { id: { type: 'char', name: 'id', length: 36, primaryKey: true } },
    };
    expect(t.name).toBe('users');
    expect(t.columns.id.primaryKey).toBe(true);
  });

  it('SchemaDefinition is record of tables', () => {
    const s: SchemaDefinition = { users: { name: 'users', columns: {} } };
    expect(s.users.name).toBe('users');
  });
});
