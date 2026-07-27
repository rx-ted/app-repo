# Zod-based Database Schema Management

> **Status: IMPLEMENTED** — Zod DB Schema bridge 已实现。

Date: 2026-07-03
Status: Draft

## Motivation

The current portable DSL (`table()` + `t.*` + `compileSchema()`) is functional but:
- Introduces a custom abstraction layer between the developer and standard Zod/drizzle
- Entity files contain duplicated concerns (DSL definition + Zod interface + runtime types)
- No runtime validation built into the table definition layer
- The DSL is unfamiliar to new contributors

Moving to a Zod-centric approach makes Zod the single source of truth for both
schema definition and runtime validation, while keeping the existing
`compileSchema` → `compileMysql` / `compileD1` pipeline for dialect dispatch.

## Core API

### `zdb(zodType, dbMeta): ZodType & Meta`

Attaches database column metadata to a standard Zod type via a non-enumerable
`Symbol` property. The returned value is the original Zod type — `.parse()`,
`z.infer<>`, `.optional()`, `.nullable()`, etc. all work unchanged.

```ts
import { z } from 'zod';
import { zdb, type DbColumnMeta } from '@rx-ted/packages-honest-plugins-db';

// DbColumnMeta mirrors the existing ColumnDefinition type:
// { type, dbName?, primaryKey?, autoIncrement?, notNull?, unique?,
//   default?, length?, precision?, scale?, enumValues?, references? }

const idCol = zdb(z.string().length(36), {
  type: 'char', length: 36, primaryKey: true,
});

// idCol is still a ZodString — all Zod operations work:
idCol.parse('abc-123'); // ✓
type T = z.infer<typeof idCol>; // string
```

### `toTableDefinition(name, zodObject): TableDefinition`

Iterates `zodObject.shape`, reads the `Symbol` metadata from each column,
assembles a `TableDefinition` that can be fed into `compileMysql` / `compileD1`.

```ts
import { toTableDefinition, compileMysql, compileD1 } from '@rx-ted/packages-honest-plugins-db';

const UsersSchema = z.object({ /* ... */ });

const mysqlTable = compileMysql(toTableDefinition('users', UsersSchema));
const d1Table    = compileD1(toTableDefinition('users', UsersSchema));
```

The existing `compileSchema` helper is updated to accept Zod objects directly:

```ts
const { users } = compileSchema('mysql', { users: UsersSchema });
```

## Entity File Format

Each module has a single `.entity.ts` that exports:
1. The Zod schema (primary export)
2. The compiled drizzle table (for queries)
3. The inferred TypeScript type

```ts
// src/modules/user/entities/user.entity.ts
import { z } from 'zod';
import { zdb, compileSchema } from '@rx-ted/packages-honest-plugins-db';

export const UsersSchema = z.object({
  id:           zdb(z.string().length(36),     { type: 'char',    length: 36, primaryKey: true }),
  username:     zdb(z.string().min(3).max(20), { type: 'varchar', length: 20, notNull: true, unique: true }),
  loginType:    zdb(z.enum(['password','google','github','wechat','email']), { type: 'enum', enumValues: ['password','google','github','wechat','email'], dbName: 'login_type', notNull: true, default: 'password' }),
  passwordHash: zdb(z.string().max(255).nullable(), { type: 'varchar', length: 255, dbName: 'password_hash' }),
  email:        zdb(z.string().email().nullable(),   { type: 'varchar', length: 255, unique: true }),
  status:       zdb(z.enum(['NORMAL','MUTED','BANNED','DELETED']), { type: 'enum', enumValues: ['NORMAL','MUTED','BANNED','DELETED'], default: 'NORMAL' }),
  tokenVersion: zdb(z.number().int(), { type: 'integer', dbName: 'token_version', default: 0 }),
  createdAt:    zdb(z.date(),          { type: 'timestamp', dbName: 'created_at', notNull: true }),
  updatedAt:    zdb(z.date(),          { type: 'timestamp', dbName: 'updated_at', notNull: true }),
  lastLoginAt:  zdb(z.date().nullable(), { type: 'timestamp', dbName: 'last_login_at' }),
});

export type User = z.infer<typeof UsersSchema>;

// Compiled drizzle tables (dialect-agnostic)
const _compiled = compileSchema(/* dialect set at module load */, {
  users: UsersSchema,
});
export const users = _compiled.users;
```

## Integration with Existing Pipeline

```
Zod object + zdb() metadata
        │
        ▼
  toTableDefinition()
        │
        ▼
  ColumnDefinition[]     ◄── unchanged
        │
        ▼
  compileMysql() / compileD1()     ◄── unchanged
        │
        ▼
  mysqlTable() / sqliteTable()     ◄── unchanged
```

The entire `schema-builder` package (`ColumnBuilder`, `table()`, `t.*`) becomes
deprecated but remains for backwards compatibility. New entities use Zod only.

## Seed System

The seed API uses the Zod schemas directly for type safety:

```ts
await seed(db, { users: UsersSchema }).values({
  users: [
    { id: '...', username: 'rxted000', passwordHash: '...', /* ... */ },
  ],
});
```

The `seed()` function validates each row with the corresponding Zod schema
before inserting, then performs the dialect-appropriate upsert.

## Valibot Pre-query Validation

A lightweight Valibot schema layer validates query parameters (where clauses,
order, limit, offset) before they reach the database. This lives in a
separate `query-validator.ts` helper and is used in Repository methods.

```ts
import { v } from 'valibot';

const QueryLimit = v.pipe(v.number(), v.maxValue(100));

function validateQuery<T>(schema: v.GenericSchema<T>, input: unknown): T {
  return v.parse(schema, input);
}
```

## mysql2sqlite Migration Workflow

For production D1 deployment:

1. Seed MySQL locally: `bun run db:seed`
2. Dump structure:  `mysqldump --no-data rx_ted > schema.sql`
3. Dump data:       `mysqldump --no-create-info --complete-insert rx_ted > data.sql`
4. Convert:         `mysql2sqlite schema.sql > schema-d1.sql`
5.                   `mysql2sqlite data.sql > data-d1.sql`
6. Apply to D1:     `wrangler d1 execute db --file=schema-d1.sql`
7.                   `wrangler d1 execute db --file=data-d1.sql`

For ongoing schema changes, drizzle-kit `generate` + `migrate` is preferred.
mysql2sqlite is used for initial data bootstrap only.

## Migration Plan

1. Add `zdb()` and `toTableDefinition()` to `@rx-ted/packages-honest-plugins-db`
2. Revert entity files layout to eac9d67 state (strip portable DSL + compileSchema)
3. Rewrite entities using `zdb()` + `z.object()` one by one
4. Update `compileSchema` to accept Zod objects
5. Rewrite `drizzle/seed.ts` using new seed API
6. Add Valibot query validation helper
7. Clean seed data (single admin user, no posts/comments)
8. Remove old `table()` + `t.*` DSL (optional, can deprecate)

### Foreign Key References

`DbColumnMeta.references` supports the existing `ReferenceDef` format directly:

```ts
userId: zdb(z.string().length(36), {
  type: 'char', length: 36, notNull: true,
  references: { table: 'users', column: 'id', onDelete: 'cascade' },
}),
```

This maps to the existing `compileMysql`/`compileD1` FK handling — no new
mechanism needed.

### compileSchema Auto-detection

`compileSchema` accepts both `TableDefinition` (old DSL) and Zod objects:

```ts
function compileSchema<T extends SchemaDefinition | Record<string, z.ZodObjectAny>>(
  dialect: Dialect,
  schema: T,
): CompiledTables<T> {
  const entries = Object.entries(schema).map(([name, def]) => {
    const table = isZodObject(def)
      ? toTableDefinition(name, def)
      : def;                        // already a TableDefinition
    const cols = table.columns;
    return [name, compile(dialect, name, cols)] as const;
  });
  // ...
}
```

Detection: `def.shape !== undefined` (Zod object) vs `def.columns !== undefined` (TableDefinition).
