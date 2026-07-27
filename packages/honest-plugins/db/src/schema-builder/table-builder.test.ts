import { describe, it, expect } from 'vitest';
import { t, table } from './table-builder';

describe('table builder DSL', () => {
  it('t.varchar creates builder with length', () => {
    const def = t.varchar(255).build('email');
    expect(def.type).toBe('varchar');
    expect(def.length).toBe(255);
  });

  it('t supports all portable types', () => {
    expect(t.char(36).build('a').type).toBe('char');
    expect(t.text().build('a').type).toBe('text');
    expect(t.bigint().build('a').type).toBe('bigint');
    expect(t.integer().build('a').type).toBe('integer');
    expect(t.boolean().build('a').type).toBe('boolean');
    expect(t.timestamp().build('a').type).toBe('timestamp');
    expect(t.date().build('a').type).toBe('date');
    expect(t.enum(['x', 'y']).build('a').type).toBe('enum');
    expect(t.json().build('a').type).toBe('json');
    expect(t.decimal(10, 2).build('a').type).toBe('decimal');
  });

  it('table() creates TableDefinition with column names', () => {
    const users = table('users', {
      id: t.char(36).primaryKey(),
      email: t.varchar(255).unique().notNull(),
      name: t.varchar(100),
    });
    expect(users.name).toBe('users');
    expect(Object.keys(users.columns)).toEqual(['id', 'email', 'name']);
    expect(users.columns.id.primaryKey).toBe(true);
    expect(users.columns.email.unique).toBe(true);
  });

  it('table() sets table/column names on builders for references', () => {
    const users = table('users', { id: t.char(36).primaryKey() });
    expect(users.columns.id.name).toBe('id');
  });

  it('two tables with foreign key reference', () => {
    const users = table('users', {
      id: t.char(36).primaryKey(),
    });
    const posts = table('posts', {
      id: t.char(36).primaryKey(),
      authorId: t.char(36).references(() => users.id),
    });
    expect(posts.columns.authorId.references).toEqual({
      table: 'users',
      column: 'id',
      onDelete: undefined,
    });
  });
});
