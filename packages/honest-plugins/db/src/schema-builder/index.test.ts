import { describe, it, expect } from 'vitest';
import { t, table, compileSchema } from './index';

describe('compileSchema dispatcher', () => {
  const schema = {
    users: table('users', {
      id: t.char(36).primaryKey(),
      email: t.varchar(255).unique().notNull(),
    }),
  };

  it('compileSchema with mysql dialect', () => {
    const result = compileSchema('mysql', schema);
    expect(result.users).toBeDefined();
    expect(typeof (result.users as any).id).toBe('object');
  });

  it('compileSchema with d1 dialect', () => {
    const result = compileSchema('d1', schema);
    expect(result.users).toBeDefined();
    expect(typeof (result.users as any).id).toBe('object');
  });

  it('compileSchema with sqlite dialect', () => {
    const result = compileSchema('sqlite', schema);
    expect(result.users).toBeDefined();
    expect(typeof (result.users as any).id).toBe('object');
  });

  it('sqlite produces same column types as d1', () => {
    const sqlite = compileSchema('sqlite', schema);
    const d1 = compileSchema('d1', schema);
    expect(sqlite.users.constructor.name).toBe('SQLiteTable');
    expect(d1.users.constructor.name).toBe('SQLiteTable');
  });
});
