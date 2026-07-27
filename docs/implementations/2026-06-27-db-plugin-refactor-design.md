# DB Plugin Refactor: MySQL → Multi-Database

> **Status: IMPLEMENTED** — 多数据库支持已实现。

## Goal

Replace `packages/honest/src/plugins/mysql/` with `packages/honest/src/plugins/db/` that supports MySQL, PostgreSQL, SQLite, and Cloudflare D1, unified under a Drizzle-based abstraction.

Phase 1: Internal restructure inside `packages/honest/`
Phase 2: Extract to standalone `packages/honest-plugin-db/`

## Design Decisions

### DB Type Abstraction

- `DB` is not exported from `types.ts`. Each dialect module exports its own `DB` type (`MySql2Database`, `PgDatabase`, etc.).
- `types.ts` only exports dialect-agnostic interfaces: `DatabaseDriver`, `DatabaseClient`, `DatabaseConnection`, `PreparedStatement`, `QueryResult`, `QueryOptions`, `PaginationResult`.
- `BaseRepository` uses `any` for the internal db instance since Drizzle's method signatures are consistent across dialects but types are not.
- `DbService` returns `any` — consumers type-assert to their dialect's `DB` type.
- Each plugin provides `getDrizzle()` typed to the specific dialect.

### BaseRepository

- Changed from `BaseRepository<TTable extends MySqlTable>` to `BaseRepository<TTable extends Table>`.
- Uses `Table` from `drizzle-orm` (parent of all Drizzle table types).
- All Drizzle operators (`eq`, `and`, `inArray`, `sql`, etc.) are cross-dialect compatible.

### QueryBuilder / ORM Removal

- Remove `orm/` directory entirely (QueryBuilder (884 lines), MysqlRepository, base.repository.ts).
- Drizzle ORM replaces all query building needs.
- MySQL-specific features (`INSERT IGNORE`, `REPLACE INTO`, `bulkInsertIgnore`, etc.) are dropped — not needed per user.

### Plugin Architecture

- No base class shared across dialect plugins (each dialect's connection setup differs).
- Each dialect implements its own plugin class (`MysqlPlugin`, `PostgresPlugin`, `SqlitePlugin`, `D1Plugin`) implementing `IPlugin`.
- Common pattern: create client → create driver → create Drizzle instance → register in ComponentManager.
- Global key generalized: `DRIZZLE_GLOBAL_KEY` → `DB_GLOBAL_KEY = 'db'`.

### Package Exports (Phase 1)

`packages/honest/src/plugins/index.ts` re-exports `db/`. The barrel strategy:

- `db/index.ts`: Common types, DbService, BaseRepository, and cross-dialect Drizzle operators (`eq`, `and`, `or`, `sql`, `asc`, `desc`, etc.)
- `db/mysql/index.ts`: MysqlPlugin, `mysqlTable`, `varchar`, `int`, etc.
- `db/postgres/index.ts`: PostgresPlugin, `pgTable`, `text`, `integer`, etc.
- `db/sqlite/index.ts`: SqlitePlugin, `sqliteTable`, `text`, `integer`, etc.
- `db/d1/index.ts`: D1Plugin, `sqliteTable`, etc. (D1 uses SQLite types)

Consumers import via:
```typescript
// Everything available from barrel (backwards-compatible)
import { MysqlPlugin, BaseRepository, eq, mysqlTable } from '@rx-ted/packages-honest';

// Or namespaced
import { mysql } from '@rx-ted/packages-honest';
new mysql.MysqlPlugin({...});
```

## File Structure

### Phase 1: `packages/honest/src/plugins/db/`

```
db/
├── index.ts                  # Common exports
├── types.ts                  # DatabaseDriver, QueryResult, QueryOptions, PaginationResult
├── db-service.ts             # @Service() DI wrapper (from mysql/db-service.ts)
├── repository.ts             # BaseRepository<TTable extends Table> (from mysql/repository.ts, de-mysql'd)
├── mysql/
│   ├── index.ts              # MysqlPlugin + Drizzle mysql-core re-exports
│   ├── client.ts             # createMysqlPool, createMysqlClient, MysqlDatabaseClient
│   ├── driver.ts             # createMysqlDriver, MysqlDriver, TransactionalMysqlDriver
│   └── plugin.ts             # MysqlPlugin (implements IPlugin)
├── postgres/
│   ├── index.ts              # PostgresPlugin + Drizzle pg-core re-exports
│   ├── client.ts             # createPgPool, createPgClient
│   ├── driver.ts             # PgDriver implementation
│   └── plugin.ts             # PostgresPlugin
├── sqlite/
│   ├── index.ts              # SqlitePlugin + Drizzle sqlite-core re-exports
│   ├── client.ts             # createSqliteClient (libsql/better-sqlite3)
│   ├── driver.ts             # SqliteDriver implementation
│   └── plugin.ts             # SqlitePlugin
└── d1/
    ├── index.ts              # D1Plugin + Drizzle d1 re-exports
    ├── driver.ts             # D1Driver implementation
    └── plugin.ts             # D1Plugin
```

### Phase 2: `packages/honest-plugin-db/`

```
packages/honest-plugin-db/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Same structure as Phase 1 db/
│   ├── types.ts
│   ├── db-service.ts
│   ├── repository.ts
│   ├── mysql/...
│   ├── postgres/...
│   ├── sqlite/...
│   └── d1/...
```

## Changes to Existing Files

| File | Change |
|------|--------|
| `packages/honest/src/plugins/index.ts` | `export * from './mysql'` → `export * from './db'` |
| `packages/honest/src/plugins/mysql/` | Delete entire directory (moved to `db/`) |
| `packages/honest/src/plugins/mysql/orm/` | Delete (QueryBuilder removed) |
| `apps/platform-api/src/index.ts` | Update import path if needed |
| `apps/platform-api/src/modules/*/entities/*` | No change (imports from `@rx-ted/packages-honest`) |

## Deferred to Phase 2

- Standalone `package.json` with deps (`drizzle-orm`, `mysql2`, `pg`, `@libsql/client` etc.)
- Publishing configuration
- Independent versioning
- Integration guide

## Non-Goals

- Runtime database switching (one dialect per plugin instance)
- Migration tooling (handled by Drizzle Kit separately)
- Transaction across multiple databases
