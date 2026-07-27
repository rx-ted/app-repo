import { describe, it, expect } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { compileMysql } from './compile-mysql';
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
      meta: { type: 'json', name: 'meta' },
      createdAt: { type: 'timestamp', name: 'created_at', notNull: true },
    },
  },
};

describe('compileMysql', () => {
  it('returns compiled table objects', () => {
    const result = compileMysql(schema);
    expect(result.users).toBeDefined();
  });

  it('compiled table has column accessors', () => {
    const result = compileMysql(schema);
    const u = result.users as any;
    expect(typeof u.id).toBe('object');
    expect(typeof u.email).toBe('object');
    expect(typeof u.role).toBe('object');
  });

  it('compiled table name matches', () => {
    const result = compileMysql(schema);
    expect(getTableName(result.users)).toBe('users');
  });

  it('handles schema with two tables and FK reference', () => {
    const schemaWithFk: SchemaDefinition = {
      users: {
        name: 'users',
        columns: { id: { type: 'char', name: 'id', length: 36, primaryKey: true } },
      },
      user_auth: {
        name: 'user_auth',
        columns: {
          id: { type: 'integer', name: 'id', autoIncrement: true, primaryKey: true },
          userId: {
            type: 'char',
            name: 'user_id',
            length: 36,
            notNull: true,
            references: { table: 'users', column: 'id', onDelete: 'cascade' },
          },
        },
      },
    };
    const result = compileMysql(schemaWithFk);
    expect(result.users).toBeDefined();
    expect(result.user_auth).toBeDefined();
  });
});
