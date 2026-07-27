import { describe, it, expect } from 'vitest';
import { ColumnBuilder } from './column-builder';

describe('ColumnBuilder', () => {
  it('builds varchar definition', () => {
    const col = new ColumnBuilder('varchar', { length: 255 });
    const def = col.build('email');
    expect(def).toMatchObject({ type: 'varchar', name: 'email', length: 255 });
  });

  it('supports chainable modifiers', () => {
    const def = new ColumnBuilder('bigint')
      .primaryKey()
      .autoIncrement()
      .notNull()
      .unique()
      .build('id');
    expect(def.primaryKey).toBe(true);
    expect(def.autoIncrement).toBe(true);
    expect(def.notNull).toBe(true);
    expect(def.unique).toBe(true);
  });

  it('supports default value', () => {
    const def = new ColumnBuilder('varchar', { length: 20 }).default('user').build('role');
    expect(def.default).toBe('user');
  });

  it('supports enum values', () => {
    const def = new ColumnBuilder('enum', { values: ['admin', 'user'] }).build('role');
    expect(def.values).toEqual(['admin', 'user']);
  });

  it('supports references', () => {
    const target = new ColumnBuilder('char', { length: 36 });
    target.__tableName = 'users';
    target.__columnName = 'id';
    const def = new ColumnBuilder('char', { length: 36 })
      .references(() => target, { onDelete: 'cascade' })
      .build('user_id');
    expect(def.references).toEqual({ table: 'users', column: 'id', onDelete: 'cascade' });
  });

  it('supports all portable types', () => {
    expect(new ColumnBuilder('text').build('a').type).toBe('text');
    expect(new ColumnBuilder('boolean').build('a').type).toBe('boolean');
    expect(new ColumnBuilder('timestamp').build('a').type).toBe('timestamp');
    expect(new ColumnBuilder('date').build('a').type).toBe('date');
    expect(new ColumnBuilder('json').build('a').type).toBe('json');
    expect(new ColumnBuilder('decimal', { precision: 10, scale: 2 }).build('a').type).toBe(
      'decimal',
    );
    expect(new ColumnBuilder('integer').build('a').type).toBe('integer');
  });
});
