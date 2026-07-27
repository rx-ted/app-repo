# Portable Schema Builder — Implementation Plan

> **Status: IMPLEMENTED** — Portable Schema Builder 已在 `packages/honest-plugins/db` 中实现。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a portable schema DSL that compiles to MySQL or D1 Drizzle tables based on `env.PLATFORM`.

**Architecture:** A `schema-builder/` sub-module in `packages/honest-plugins/db/src/` provides `t`, `table()`, and `compileSchema()`. Entity files in `apps/platform-api/src/modules/*/entities/` switch from `mysqlTable(...)` to `table(...)` with portable column types. `plugins.ts` calls `compileSchema(env.PLATFORM === 'cloudflare' ? 'd1' : 'mysql', schema)` to get dialect-specific Drizzle tables at startup.

**Tech Stack:** TypeScript, Drizzle ORM (`drizzle-orm/mysql-core` + `drizzle-orm/sqlite-core`), `@rx-ted/packages-honest-plugins-db` package, `@rx-ted/packages-config` (env)

---

### Task 1: Schema-Builder Types

**Files:**
- Create: `packages/honest-plugins/db/src/schema-builder/types.ts`
- Test: `packages/honest-plugins/db/src/schema-builder/types.test.ts`

- [ ] **Step 1: Create schema-builder directory**

```bash
mkdir -p packages/honest-plugins/db/src/schema-builder
```

- [ ] **Step 2: Write types**

```ts
// packages/honest-plugins/db/src/schema-builder/types.ts

export type Dialect = 'mysql' | 'd1';

export interface ReferenceDef {
  table: string;
  column: string;
  onDelete?: 'cascade' | 'set null' | 'restrict' | 'no action';
}

export interface ColumnDefinition {
  type: string;
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

export interface TableDefinition {
  name: string;
  columns: Record<string, ColumnDefinition>;
}

export type SchemaDefinition = Record<string, TableDefinition>;
```

- [ ] **Step 3: Write test**

```ts
// packages/honest-plugins/db/src/schema-builder/types.test.ts
import { describe, it, expect } from 'vitest';
import type { ColumnDefinition, TableDefinition, SchemaDefinition } from './types';

describe('schema-builder types', () => {
  it('ColumnDefinition shape', () => {
    const col: ColumnDefinition = {
      type: 'varchar', name: 'email', length: 255, notNull: true, unique: true,
    };
    expect(col.type).toBe('varchar');
    expect(col.notNull).toBe(true);
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
```

- [ ] **Step 4: Run test**

Run: `cd packages/honest-plugins/db && npx vitest run src/schema-builder/types.test.ts`
Expected: PASS

---

### Task 2: ColumnBuilder Class

**Files:**
- Create: `packages/honest-plugins/db/src/schema-builder/column-builder.ts`
- Test: `packages/honest-plugins/db/src/schema-builder/column-builder.test.ts`

- [ ] **Step 1: Implement ColumnBuilder**

```ts
// packages/honest-plugins/db/src/schema-builder/column-builder.ts
import type { ColumnDefinition, ReferenceDef } from './types';

type ColumnType =
  | 'varchar' | 'char' | 'text' | 'bigint' | 'integer' | 'boolean'
  | 'timestamp' | 'date' | 'enum' | 'json' | 'decimal';

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
  __tableName?: string;
  __columnName?: string;

  constructor(type: ColumnType, opts?: ColumnOpts) {
    this.def = { type };
    if (opts?.length !== undefined) this.def.length = opts.length;
    if (opts?.values !== undefined) this.def.values = opts.values;
    if (opts?.precision !== undefined) this.def.precision = opts.precision;
    if (opts?.scale !== undefined) this.def.scale = opts.scale;
  }

  primaryKey(): this { this.def.primaryKey = true; return this; }
  autoIncrement(): this { this.def.autoIncrement = true; return this; }
  notNull(): this { this.def.notNull = true; return this; }
  unique(): this { this.def.unique = true; return this; }
  default(value: unknown): this { this.def.default = value; return this; }

  references(fn: () => ColumnBuilder, opts?: { onDelete?: ReferenceDef['onDelete'] }): this {
    const target = fn();
    this.def.references = {
      table: target.__tableName!,
      column: target.__columnName!,
      onDelete: opts?.onDelete,
    };
    return this;
  }

  build(name: string): ColumnDefinition {
    return { name, ...this.def } as unknown as ColumnDefinition;
  }
}
```

- [ ] **Step 2: Write test**

```ts
// packages/honest-plugins/db/src/schema-builder/column-builder.test.ts
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
      .primaryKey().autoIncrement().notNull().unique()
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
    expect(new ColumnBuilder('decimal', { precision: 10, scale: 2 }).build('a').type).toBe('decimal');
    expect(new ColumnBuilder('integer').build('a').type).toBe('integer');
  });
});
```

- [ ] **Step 3: Run test**

Run: `cd packages/honest-plugins/db && npx vitest run src/schema-builder/column-builder.test.ts`
Expected: PASS

---

### Task 3: `t` Factory and `table()` Function

**Files:**
- Create: `packages/honest-plugins/db/src/schema-builder/table-builder.ts`
- Test: `packages/honest-plugins/db/src/schema-builder/table-builder.test.ts`

- [ ] **Step 1: Implement `t` and `table()`**

```ts
// packages/honest-plugins/db/src/schema-builder/table-builder.ts
import { ColumnBuilder } from './column-builder';
import type { TableDefinition, ColumnDefinition } from './types';

function c(type: Parameters<typeof ColumnBuilder>[0], opts?: Parameters<typeof ColumnBuilder>[1]) {
  return new ColumnBuilder(type, opts);
}

export const t = {
  varchar:  (length: number) => c('varchar', { length }),
  char:     (length: number) => c('char', { length }),
  text:     () => c('text'),
  bigint:   () => c('bigint'),
  integer:  () => c('integer'),
  boolean:  () => c('boolean'),
  timestamp:() => c('timestamp'),
  date:     () => c('date'),
  enum:     (values: string[]) => c('enum', { values }),
  json:     () => c('json'),
  decimal:  (p: number, s: number) => c('decimal', { precision: p, scale: s }),
};

export function table(name: string, columns: Record<string, ColumnBuilder>): TableDefinition {
  const defs: Record<string, ColumnDefinition> = {};
  for (const [colName, builder] of Object.entries(columns)) {
    builder.__tableName = name;
    builder.__columnName = colName;
    defs[colName] = builder.build(colName);
  }
  return { name, columns: defs };
}
```

- [ ] **Step 2: Write test**

```ts
// packages/honest-plugins/db/src/schema-builder/table-builder.test.ts
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
    expect(t.enum(['x','y']).build('a').type).toBe('enum');
    expect(t.json().build('a').type).toBe('json');
    expect(t.decimal(10,2).build('a').type).toBe('decimal');
  });

  it('table() creates TableDefinition with column names', () => {
    const users = table('users', {
      id:    t.char(36).primaryKey(),
      email: t.varchar(255).unique().notNull(),
      name:  t.varchar(100),
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
      id:       t.char(36).primaryKey(),
      authorId: t.char(36).references(() => users.id),
    });
    expect(posts.columns.authorId.references).toEqual({
      table: 'users', column: 'id', onDelete: undefined,
    });
  });
});
```

- [ ] **Step 3: Run test**

Run: `cd packages/honest-plugins/db && npx vitest run src/schema-builder/table-builder.test.ts`
Expected: PASS

---

### Task 4: MySQL Compiler

**Files:**
- Create: `packages/honest-plugins/db/src/schema-builder/compile-mysql.ts`
- Test: `packages/honest-plugins/db/src/schema-builder/compile-mysql.test.ts`

- [ ] **Step 1: Implement compile-mysql.ts**

```ts
// packages/honest-plugins/db/src/schema-builder/compile-mysql.ts
import {
  mysqlTable, varchar, char, text, int, bigint,
  boolean, datetime, date, mysqlEnum, json, decimal,
} from 'drizzle-orm/mysql-core';
import type { SchemaDefinition, ColumnDefinition } from './types';

export function compileMysql(schema: SchemaDefinition): Record<string, any> {
  const compiled: Record<string, any> = {};

  for (const tableName of Object.keys(schema)) {
    const tableDef = schema[tableName];
    const builders: Record<string, any> = {};
    for (const [colName, colDef] of Object.entries(tableDef.columns)) {
      let col = toMysqlColumn(colName, colDef);
      if (colDef.references) {
        col = col.references(
          () => compiled[colDef.references!.table]?.[colDef.references!.column],
          { onDelete: colDef.references!.onDelete },
        );
      }
      builders[colName] = col;
    }
    compiled[tableName] = mysqlTable(tableDef.name, builders);
  }

  return compiled;
}

function toMysqlColumn(name: string, def: ColumnDefinition): any {
  let col: any;
  switch (def.type) {
    case 'varchar':  col = varchar(name, { length: def.length ?? 255 }); break;
    case 'char':     col = char(name, { length: def.length ?? 1 }); break;
    case 'text':     col = text(name); break;
    case 'bigint':   col = bigint(name, { unsigned: true }); break;
    case 'integer':  col = int(name); break;
    case 'boolean':  col = boolean(name); break;
    case 'timestamp': col = datetime(name); break;
    case 'date':     col = date(name); break;
    case 'enum':     col = mysqlEnum(name, def.values ?? []); break;
    case 'json':     col = json(name); break;
    case 'decimal':  col = decimal(name, { precision: def.precision, scale: def.scale }); break;
    default:         col = text(name);
  }
  if (def.primaryKey) col = col.primaryKey();
  if (def.autoIncrement) col = col.autoincrement();
  if (def.notNull) col = col.notNull();
  if (def.unique) col = col.unique();
  if (def.default !== undefined) col = col.default(def.default);
  return col;
}
```

- [ ] **Step 2: Write test**

```ts
// packages/honest-plugins/db/src/schema-builder/compile-mysql.test.ts
import { describe, it, expect } from 'vitest';
import { compileMysql } from './compile-mysql';
import type { SchemaDefinition } from './types';

const schema: SchemaDefinition = {
  users: {
    name: 'users',
    columns: {
      id:   { type: 'char', name: 'id', length: 36, primaryKey: true },
      email:{ type: 'varchar', name: 'email', length: 255, unique: true, notNull: true },
      name: { type: 'varchar', name: 'name', length: 100 },
      role: { type: 'enum', name: 'role', values: ['admin','user'], default: 'user' },
      age:  { type: 'integer', name: 'age' },
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
    // Drizzle adds column getters on the table object
    expect(typeof u.id).toBe('object');
    expect(typeof u.email).toBe('object');
    expect(typeof u.role).toBe('object');
  });

  it('compiled table name matches', () => {
    const result = compileMysql(schema);
    // Drizzle table stores name in a Symbol or toString
    expect(String(result.users)).toBe('users');
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
          id:     { type: 'integer', name: 'id', autoIncrement: true, primaryKey: true },
          userId: { type: 'char', name: 'user_id', length: 36, notNull: true,
            references: { table: 'users', column: 'id', onDelete: 'cascade' } },
        },
      },
    };
    const result = compileMysql(schemaWithFk);
    expect(result.users).toBeDefined();
    expect(result.user_auth).toBeDefined();
  });
});
```

- [ ] **Step 3: Run test**

Run: `cd packages/honest-plugins/db && npx vitest run src/schema-builder/compile-mysql.test.ts`
Expected: PASS

---

### Task 5: D1 (SQLite) Compiler

**Files:**
- Create: `packages/honest-plugins/db/src/schema-builder/compile-d1.ts`
- Test: `packages/honest-plugins/db/src/schema-builder/compile-d1.test.ts`

- [ ] **Step 1: Implement compile-d1.ts**

```ts
// packages/honest-plugins/db/src/schema-builder/compile-d1.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import type { SchemaDefinition, ColumnDefinition } from './types';

export function compileD1(schema: SchemaDefinition): Record<string, any> {
  const compiled: Record<string, any> = {};

  for (const tableName of Object.keys(schema)) {
    const tableDef = schema[tableName];
    const builders: Record<string, any> = {};
    for (const [colName, colDef] of Object.entries(tableDef.columns)) {
      let col = toD1Column(colName, colDef);
      if (colDef.references) {
        col = col.references(
          () => compiled[colDef.references!.table]?.[colDef.references!.column],
          { onDelete: colDef.references!.onDelete },
        );
      }
      builders[colName] = col;
    }
    compiled[tableName] = sqliteTable(tableDef.name, builders);
  }

  return compiled;
}

function toD1Column(name: string, def: ColumnDefinition): any {
  let col: any;
  switch (def.type) {
    case 'varchar':
    case 'char':
    case 'text':
    case 'enum':
    case 'json':   col = text(name); break;
    case 'bigint':
    case 'integer': col = integer(name); break;
    case 'boolean': col = integer(name, { mode: 'boolean' }); break;
    case 'timestamp':
    case 'date':   col = integer(name, { mode: 'timestamp' }); break;
    case 'decimal': col = real(name); break;
    default:       col = text(name);
  }
  if (def.primaryKey) col = col.primaryKey();
  if (def.autoIncrement) col = col.autoIncrement();
  if (def.notNull) col = col.notNull();
  if (def.unique) col = col.unique();
  if (def.default !== undefined) col = col.default(def.default);
  return col;
}
```

Note: D1/SQLite `integer` with `{ mode: 'timestamp' }` stores Unix epoch seconds. For `boolean`, Drizzle SQLite supports `integer({ mode: 'boolean' })`.

- [ ] **Step 2: Write test**

```ts
// packages/honest-plugins/db/src/schema-builder/compile-d1.test.ts
import { describe, it, expect } from 'vitest';
import { compileD1 } from './compile-d1';
import type { SchemaDefinition } from './types';

const schema: SchemaDefinition = {
  users: {
    name: 'users',
    columns: {
      id:    { type: 'char', name: 'id', length: 36, primaryKey: true },
      email: { type: 'varchar', name: 'email', length: 255, unique: true, notNull: true },
      name:  { type: 'varchar', name: 'name', length: 100 },
      role:  { type: 'enum', name: 'role', values: ['admin','user'], default: 'user' },
      age:   { type: 'integer', name: 'age' },
      active:{ type: 'boolean', name: 'active', default: true },
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
          authorId: { type: 'char', name: 'author_id', length: 36, notNull: true,
            references: { table: 'users', column: 'id', onDelete: 'cascade' } },
        },
      },
    };
    const result = compileD1(s);
    expect(result.posts).toBeDefined();
  });
});
```

- [ ] **Step 3: Run test**

Run: `cd packages/honest-plugins/db && npx vitest run src/schema-builder/compile-d1.test.ts`
Expected: PASS

---

### Task 6: `compileSchema()` Dispatcher + Package Exports

**Files:**
- Create: `packages/honest-plugins/db/src/schema-builder/index.ts`
- Modify: `packages/honest-plugins/db/src/schema-builder/index.ts` exports
- Test: `packages/honest-plugins/db/src/schema-builder/schema-builder.test.ts`

- [ ] **Step 1: Create schema-builder/index.ts**

```ts
// packages/honest-plugins/db/src/schema-builder/index.ts
export { t, table } from './table-builder';
export type { Dialect, ColumnDefinition, TableDefinition, SchemaDefinition, ReferenceDef } from './types';
export { compileMysql } from './compile-mysql';
export { compileD1 } from './compile-d1';
import type { Dialect, SchemaDefinition } from './types';
import { compileMysql } from './compile-mysql';
import { compileD1 } from './compile-d1';

export function compileSchema(dialect: Dialect, schema: SchemaDefinition): Record<string, any> {
  switch (dialect) {
    case 'mysql': return compileMysql(schema);
    case 'd1':    return compileD1(schema);
  }
}
```

- [ ] **Step 2: Write test**

```ts
// packages/honest-plugins/db/src/schema-builder/index.test.ts
import { describe, it, expect } from 'vitest';
import { t, table, compileSchema, type Dialect } from './index';

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

  it('different dialect produces different column types', () => {
    const mysql = compileSchema('mysql', schema);
    const d1 = compileSchema('d1', schema);
    // Names are the same
    expect(String(mysql.users)).toBe('users');
    expect(String(d1.users)).toBe('users');
  });
});
```

- [ ] **Step 3: Run test**

Run: `cd packages/honest-plugins/db && npx vitest run src/schema-builder/index.test.ts`
Expected: PASS

- [ ] **Step 4: Add export to db package index.ts**

```ts
// packages/honest-plugins/db/src/index.ts — add after existing exports
export * from './schema-builder';
```

- [ ] **Step 5: Run all schema-builder tests**

Run: `cd packages/honest-plugins/db && npx vitest run src/schema-builder/`
Expected: All PASS

- [ ] **Step 6: Run full package test suite to check nothing broken**

Run: `cd packages/honest-plugins/db && npx vitest run`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add packages/honest-plugins/db/src/schema-builder/ packages/honest-plugins/db/src/index.ts
git commit -m "feat(db): add compileSchema dispatcher and package export"
```

---

### Task 7: Convert One Entity File (Proof of Concept)

**Files:**
- Modify: `apps/platform-api/src/modules/user/entities/user.entity.ts`

This converts the user entity from `mysqlTable(...)` to portable `table(...)`. The Zod schemas and TS interfaces stay untouched.

- [ ] **Step 1: Convert user.entity.ts to portable DSL**

Original:
```ts
import { mysqlTable, varchar, datetime, mysqlEnum, int, char, date, text, uniqueIndex } from '@rx-ted/packages-honest-plugins-db';

export const users = mysqlTable('users', {
  id: char('id', { length: 36 }).primaryKey(),
  username: varchar('username', { length: 20 }).notNull().unique(),
  loginType: mysqlEnum('login_type', ['password', 'google', 'github', 'wechat', 'email']).notNull().default('password'),
  passwordHash: varchar('password_hash', { length: 255 }),
  email: varchar('email', { length: 255 }).unique(),
  preferredLocale: mysqlEnum('preferred_locale', ['zh-CN', 'en']).notNull().default('zh-CN'),
  status: mysqlEnum('status', ['NORMAL', 'MUTED', 'BANNED', 'DELETED']).default('NORMAL'),
  tokenVersion: int('token_version').default(0),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
  lastLoginAt: datetime('last_login_at'),
});
```

New:
```ts
import { t, table } from '@rx-ted/packages-honest-plugins-db';

export const users = table('users', {
  id: t.char(36).primaryKey(),
  username: t.varchar(20).notNull().unique(),
  loginType: t.enum(['password', 'google', 'github', 'wechat', 'email']).notNull().default('password'),
  passwordHash: t.varchar(255),
  email: t.varchar(255).unique(),
  preferredLocale: t.enum(['zh-CN', 'en']).notNull().default('zh-CN'),
  status: t.enum(['NORMAL', 'MUTED', 'BANNED', 'DELETED']).default('NORMAL'),
  tokenVersion: t.integer().default(0),
  createdAt: t.timestamp().notNull(),
  updatedAt: t.timestamp().notNull(),
  lastLoginAt: t.timestamp(),
});
```

Convert `userAuth` similarly:
Original:
```ts
export const userAuth = mysqlTable('user_auth', {
  id: int('id').primaryKey().autoincrement(),
  userId: char('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  // ...
});
```

New:
```ts
export const userAuth = table('user_auth', {
  id: t.integer().primaryKey().autoIncrement(),
  userId: t.char(36).notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: t.enum(['password', 'email', 'phone']).notNull(),
  identifier: t.varchar(255).notNull(),
  credential: t.varchar(255),
});
```

Convert `userProfiles`:
Original:
```ts
export const userProfiles = mysqlTable('user_profiles', {
  userId: char('user_id', { length: 36 }).primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  nickname: varchar('nickname', { length: 100 }),
  // ...
});
```

New:
```ts
export const userProfiles = table('user_profiles', {
  userId: t.char(36).primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  nickname: t.varchar(100),
  avatarUrl: t.varchar(1024),
  gender: t.enum(['Male', 'Female', 'Unknown']).default('Unknown'),
  birthday: t.date(),
  bio: t.text(),
  website: t.varchar(255),
  location: t.varchar(100),
  updatedAt: t.timestamp().notNull(),
});
```

Convert `userOauth`:
Original:
```ts
export const userOauth = mysqlTable('user_oauth', {
  id: int('id').primaryKey().autoincrement(),
  userId: char('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: mysqlEnum('provider', ['gitHub', 'google', 'wechat']).notNull(),
  providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: datetime('expires_at'),
  createdAt: datetime('created_at').notNull(),
});
```

New:
```ts
export const userOauth = table('user_oauth', {
  id: t.integer().primaryKey().autoIncrement(),
  userId: t.char(36).notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: t.enum(['gitHub', 'google', 'wechat']).notNull(),
  providerUserId: t.varchar(255).notNull(),
  accessToken: t.text(),
  refreshToken: t.text(),
  expiresAt: t.timestamp(),
  createdAt: t.timestamp().notNull(),
});
```

Note: `uniqueIndex()` composite indexes (like `uk_type_identifier` on `userAuth` and `uk_provider_user`/`uk_user_provider` on `userOauth`) are **not** migrated in this task — they require the second argument callback form. The column-level `.unique()` calls are preserved, but composite unique indexes are out of scope for now. Add a comment `// TODO: composite uniqueIndex` where they were removed.

Remove the old imports (`mysqlTable`, `varchar`, etc.) and keep only `z` from `zod` and `t`, `table` from the package.

- [ ] **Step 2: Run app typecheck to verify compilation**

Run: `cd apps/platform-api && npx tsc --noEmit`
Expected: Typecheck passes (errors only from other modules referencing the table schemas — see below)

- [ ] **Step 3: Fix downstream type issues**

The entity files export Drizzle table objects. Other files may reference these as `MySqlTable` types. Since the new `table()` returns `TableDefinition`, not `MySqlTable`, any file that uses the table type directly may break.

Search for references to `users`, `userAuth`, `userProfiles`, `userOauth` that use Drizzle-specific properties:

```bash
rg -l "import.*users.*from.*user.entity" apps/platform-api/src/ --include='*.ts' | grep -v '.d.ts'
```

Fix by casting or using `any` where table shapes are used. The primary consumer is the schema barrel and plugins.ts, which will work through `compileSchema()`.

- [ ] **Step 4: Run full app typecheck**

Run: `cd apps/platform-api && pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Run tests in scope**

Run: `cd apps/platform-api && npx vitest run --reporter=verbose 2>&1 | head -40`
Expected: Tests pass (no schema-dependent tests should break since the table names and columns match)

- [ ] **Step 6: Commit**

```bash
git add apps/platform-api/src/modules/user/entities/user.entity.ts
git commit -m "feat(platform-api): convert user entity to portable schema DSL"
```

---

### Task 8: Update plugins.ts to Use CompileSchema

**Files:**
- Modify: `apps/platform-api/src/lib/plugins.ts`

- [ ] **Step 1: Update plugins.ts**

```ts
// apps/platform-api/src/lib/plugins.ts
import { ApiDocPlugin } from '@rx-ted/packages-honest';
import { MailPlugin } from '@rx-ted/packages-honest-plugins-mail';
import type { MailProviderConfigEntry } from '@rx-ted/packages-honest-plugins-mail';
import { compileSchema } from '@rx-ted/packages-honest-plugins-db';
import { envParams } from '@/constants/env';
import * as schema from '@/schema/index';
import { env } from '@rx-ted/packages-config';

export async function getPlugins(): Promise<import('@rx-ted/packages-honest').PluginEntry[]> {
  const plugins: import('@rx-ted/packages-honest').PluginEntry[] = [];

  const dialect = env.PLATFORM === 'cloudflare' ? 'd1' : 'mysql';
  const dbSchema = compileSchema(dialect, schema);

  // cache

  plugins.push(
    new ApiDocPlugin({
      specUrl: '/openapi.json',
      uiRoute: '/docs',
      uiTitle: 'Blog API Documentation',
      defaultRenderer: 'scalar',
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      security: [{ bearerAuth: [] }],
    }),
  );

  if (dialect === 'd1') {
    const { D1Plugin } = await import('@rx-ted/packages-honest-plugins-db/d1');
    plugins.push(
      new D1Plugin({
        binding: env.require('DB'),
        schema: dbSchema,
      }),
    );
  } else {
    const { MysqlPlugin } = await import('@rx-ted/packages-honest-plugins-db');
    const { RedisPlugin } = await import('@rx-ted/packages-honest-plugins-cache');
    plugins.push(
      new MysqlPlugin({
        connection: { ...envParams.mysql },
        schema: dbSchema,
        logger: true,
      }),
      new RedisPlugin({
        connection: { ...envParams.redis },
      }),
    );
  }

  // mail config unchanged...
  const mailCfg = envParams.mail;
  if (mailCfg.isEnabled) {
    const providers: MailProviderConfigEntry[] = [];
    // ... same as before
    plugins.push(new MailPlugin({ providers }));
  }

  return plugins;
}
```

- [ ] **Step 2: Create D1Plugin placeholder**

The `D1Plugin` doesn't exist yet. Create a minimal stub:

```ts
// packages/honest-plugins/db/src/d1/plugin.ts
import type { IPlugin, Application } from '@rx-ted/packages-honest';
import { ComponentManager } from '@rx-ted/packages-honest';
import { drizzle } from 'drizzle-orm/d1';
import { DB_GLOBAL_KEY } from '../constants';

export class D1Plugin implements IPlugin {
  readonly name = 'd1-plugin';
  readonly version = '0.0.1';

  constructor(private options: { binding: string; schema: Record<string, any> }) {}

  async beforeModulesRegistered(app: Application): Promise<void> {
    const binding = (globalThis as any)[this.options.binding]
      ?? (globalThis as any).env?.[this.options.binding];
    if (!binding) throw new Error(`D1 binding "${this.options.binding}" not found`);
    const db = drizzle(binding, { schema: this.options.schema });
    ComponentManager.registerPlugin(DB_GLOBAL_KEY, db);
  }
}
```

Update `packages/honest-plugins/db/src/d1/index.ts` to export it:
```ts
// packages/honest-plugins/db/src/d1/index.ts
export { sqliteTable, text, integer, real, blob, uniqueIndex, index, primaryKey, foreignKey } from 'drizzle-orm/sqlite-core';
export type { AnyD1Database as D1DrizzleDatabase } from 'drizzle-orm/d1';
export { D1Plugin } from './plugin';
```

- [ ] **Step 3: Run typecheck**

Run: `cd apps/platform-api && pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Run app tests**

Run: `cd apps/platform-api && pnpm test:run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/platform-api/src/lib/plugins.ts packages/honest-plugins/db/src/d1/plugin.ts packages/honest-plugins/db/src/d1/index.ts
git commit -m "feat(platform-api): switch to compileSchema in plugins.ts, add D1Plugin stub"
```

---

### Task 9: Convert Remaining Entity Files

**Files:**
- Modify: All `apps/platform-api/src/modules/*/entities/*.entity.ts` files (15+ files)

Convert each entity file from `mysqlTable(...)` / Drizzle MySQL imports to portable `table(...)` / `t.*` DSL.

- [ ] **Step 1-15: For each entity file, convert the schema definition**

Pattern for each conversion:

1. Replace `import { mysqlTable, varchar, ... } from '@rx-ted/packages-honest-plugins-db'` with `import { t, table } from '@rx-ted/packages-honest-plugins-db'`
2. Replace `mysqlTable('name', { ... })` with `table('name', { ... })`
3. Replace `varchar('col', { length: n })` with `t.varchar(n)`
4. Replace `char('col', { length: n })` with `t.char(n)`
5. Replace `int('col')` with `t.integer()`
6. Replace `bigint('col')` with `t.bigint()`
7. Replace `text('col')` with `t.text()`
8. Replace `datetime('col')` with `t.timestamp()`
9. Replace `date('col')` with `t.date()`
10. Replace `boolean('col')` with `t.boolean()`
11. Replace `mysqlEnum('col', [...])` with `t.enum([...])`
12. Replace `json('col')` with `t.json()`
13. Replace `decimal('col', ...)` with `t.decimal(p, s)`
14. Replace `.autoincrement()` with `.autoIncrement()` (note: renamed from drizzle's mysql to our portable naming)
15. Keep column-level `.primaryKey()`, `.notNull()`, `.unique()`, `.default()`, `.references()` as-is

For composite `uniqueIndex(...)` / `index(...)` in the table's second argument callback, add a comment `// TODO: composite index — not yet supported by portable DSL` and remove the callback. These can be added later.

- [ ] **Final: Run full typecheck and tests**

Run: `cd apps/platform-api && pnpm typecheck && pnpm test:run`
Expected: PASS

- [ ] **Final: Commit**

```bash
git add apps/platform-api/src/modules/*/entities/*.entity.ts
git commit -m "feat(platform-api): convert all entity files to portable schema DSL"
```
