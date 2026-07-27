# Portable Schema Builder — Design Spec

> **Status: IMPLEMENTED** — Portable Schema Builder 已实现。

## Motivation

The app runs on multiple runtimes (Node, Bun, Deno → MySQL; Cloudflare Workers → D1). Currently the schema is hardcoded to Drizzle MySQL (`mysqlTable`, `mysqlEnum`, etc.), making it impossible to run on D1 without duplicating schema definitions.

We need a **single portable schema definition** that compiles to the correct Drizzle dialect at runtime based on `env.PLATFORM`.

## Design

### Layers

```
apps/platform-api/src/schema/index.ts     — app-specific portable schema definitions
packages/honest-plugins/db/src/schema-builder/  — portable DSL tools
apps/platform-api/src/lib/plugins.ts      — uses env.PLATFORM + compileSchema to pick dialect
```

### DSL API

```ts
// apps/platform-api/src/schema/index.ts
import { t, table } from '@rx-ted/packages-honest-plugins-db/schema-builder';

export const users = table('users', {
  id:        t.bigint().primaryKey().autoIncrement(),
  email:     t.varchar(255).unique().notNull(),
  name:      t.varchar(100),
  role:      t.enum(['admin', 'user']).default('user'),
  createdAt: t.timestamp().defaultNow(),
});

export const posts = table('posts', {
  id:        t.bigint().primaryKey().autoIncrement(),
  title:     t.varchar(255).notNull(),
  content:   t.text(),
  authorId:  t.bigint().references(() => users.id),
});
```

### Compilation

```ts
// plugins.ts
import { compileSchema } from '@rx-ted/packages-honest-plugins-db/schema-builder';
import * as schema from '@/schema';

const dialect = env.PLATFORM === 'cloudflare' ? 'd1' : 'mysql';
const dbSchema = compileSchema(dialect, schema);
// dbSchema: Record<string, MySqlTable | SQLiteTable> — passed to drizzle()
```

The `plugins.ts` `try/catch` dynamic import pattern will use `env.PLATFORM` instead of relying on import success/failure to determine dialect.

### Type Mappings

| Portable | MySQL | D1 (SQLite) |
|---|---|---|
| `varchar(n)` | `varchar(n)` | `text` |
| `text` | `text` | `text` |
| `bigint` | `bigint` | `integer` |
| `integer` | `int` | `integer` |
| `boolean` | `boolean` | `integer` (0/1) |
| `timestamp` | `timestamp` | `integer` (unix epoch) |
| `enum([a,b])` | `mysqlEnum([a,b])` | `text` |
| `json` | `json` | `text` (JSON.stringify) |
| `decimal(p,s)` | `decimal(p,s)` | `real` |

### Implementation Structure

```
packages/honest-plugins/db/src/
├── schema-builder/
│   ├── index.ts              # public exports: t, table, compileSchema
│   ├── types.ts              # ColumnDefinition, TableDefinition, Dialect, ColumnBuilder
│   ├── column-builder.ts     # ColumnBuilder class with chainable methods
│   ├── compile-mysql.ts      # compileColumn + compileTable → mysqlTable()
│   └── compile-d1.ts         # compileColumn + compileTable → sqliteTable()
```

### ColumnBuilder API

```ts
class ColumnBuilder<T extends string = string> {
  primaryKey(): this
  autoIncrement(): this
  notNull(): this
  unique(): this
  default(value: unknown): this
  references(fn: () => TableDefinition, column?: string): this
  build(): ColumnDefinition
}

const t = {
  varchar:  (length: number) => ColumnBuilder<'varchar'>
  text:     () => ColumnBuilder<'text'>
  bigint:   () => ColumnBuilder<'bigint'>
  integer:  () => ColumnBuilder<'integer'>
  boolean:  () => ColumnBuilder<'boolean'>
  timestamp:() => ColumnBuilder<'timestamp'>
  enum:     (values: string[]) => ColumnBuilder<'enum'>
  decimal:  (precision: number, scale: number) => ColumnBuilder<'decimal'>
  json:     () => ColumnBuilder<'json'>
}
```

### Integration in plugins.ts

```ts
// apps/platform-api/src/lib/plugins.ts
// Replace the current try/catch dynamic import with explicit platform branching:

const dialect = env.PLATFORM === 'cloudflare' ? 'd1' : 'mysql';

const dbSchema = compileSchema(dialect, schema);

if (dialect === 'd1') {
  // D1: no redis cache, different db
  const { D1Plugin } = await import('@rx-ted/packages-honest-plugins-db/d1');
  plugins.push(new D1Plugin({ binding: env.require('DB'), schema: dbSchema }));
} else {
  // Node/Bun/Deno: MySQL + Redis
  const { MysqlPlugin } = await import('@rx-ted/packages-honest-plugins-db');
  const { RedisPlugin } = await import('@rx-ted/packages-honest-plugins-cache');
  plugins.push(new MysqlPlugin({ connection: dbConfig, schema: dbSchema }));
  plugins.push(new RedisPlugin({ url: env.require('REDIS_URL') }));
}
```

### Order of Implementation

1. Add `ColumnDefinition`, `TableDefinition`, `Dialect` types to `schema-builder/types.ts`
2. Implement `ColumnBuilder` class with chainable API
3. Implement `t` factory object + `table()` function
4. Implement `compile-mysql.ts` — maps portable types to `drizzle-orm/mysql-core`
5. Implement `compile-d1.ts` — maps portable types to `drizzle-orm/sqlite-core`
6. Implement `compileSchema()` — iterates tables, dispatches to dialect compiler
7. Export everything from `schema-builder/index.ts`
8. Convert `apps/platform-api/src/schema/index.ts` to use portable DSL
9. Update `plugins.ts` to use `env.PLATFORM` + `compileSchema`

### Out of Scope

- Index definitions (can be added later; tables will work without explicit indexes)
- Full `references()` FK constraint for D1 (SQLite FK support differs)
- Migration generation (use existing Drizzle Kit per dialect)
