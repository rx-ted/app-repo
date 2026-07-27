import { describe, it, expect } from 'vitest';
import { compileD1 } from './compile-d1';
import type { SchemaDefinition } from './types';

const schema: SchemaDefinition = {
  users: {
    name: 'users',
    columns: {
      id: { type: 'char', name: 'id', length: 36, primaryKey: true },
      email: { type: 'varchar', name: 'email', length: 255, unique: true, notNull: true },
      name: { type: 'varchar', name: 'name', length: 100 },
      role: { type: 'enum', name: 'role', values: ['admin', 'user'], default: 'user' },
      age: { type: 'integer', name: 'age' },
      active: { type: 'boolean', name: 'active', default: true },
      createdAt: { type: 'timestamp', name: 'created_at', notNull: true },
    },
  },
};

describe('compileD1', () => {
  it('returns compiled table objects', () => {
    const result = compileD1(schema);
    expect(result.users).toBeDefined();
  });

  it('compiled table has column accessors', () => {
    const result = compileD1(schema);
    expect(typeof (result.users as any).id).toBe('object');
    expect(typeof (result.users as any).email).toBe('object');
  });

  it('boolean mapped to integer mode boolean', () => {
    const result = compileD1(schema);
    expect((result.users as any).active).toBeDefined();
  });

  it('handles references between tables', () => {
    const s: SchemaDefinition = {
      users: {
        name: 'users',
        columns: { id: { type: 'char', name: 'id', length: 36, primaryKey: true } },
      },
      posts: {
        name: 'posts',
        columns: {
          id: { type: 'integer', name: 'id', primaryKey: true, autoIncrement: true },
          authorId: {
            type: 'char',
            name: 'author_id',
            length: 36,
            notNull: true,
            references: { table: 'users', column: 'id', onDelete: 'cascade' },
          },
        },
      },
    };
    const result = compileD1(s);
    expect(result.posts).toBeDefined();
  });
});
