# @rx-ted/packages-honest-plugins-db

Database plugin for [@rx-ted/packages-honest](https://github.com/rx-ted/honest). Supports MySQL, SQLite, Cloudflare D1, and PostgreSQL via Drizzle ORM.

## Features

- **Multi-dialect**: MySQL, SQLite, Cloudflare D1, PostgreSQL
- **Drizzle ORM**: type-safe SQL with schema-first approach
- **Runtime-agnostic**: works on Node.js, Bun, Deno, and Cloudflare Workers
- **Portable schema builder**: define schemas once, compile to any dialect
- **Zod bridge**: `zdb()` for Zod-to-Drizzle schema conversion

## Installation

```bash
pnpm add @rx-ted/packages-honest-plugins-db
```

Peer dependencies: `@rx-ted/packages-honest`, `hono`

## Usage

### Register as a plugin

```ts
import { DBPlugin } from '@rx-ted/packages-honest-plugins/db';

const plugin = new DBPlugin({
  // dialect is auto-detected from DB env var
});

const { hono } = await Application.create(AppModule, {
  plugins: [plugin],
});
```

### Subpath exports

```ts
import { DBPlugin } from '@rx-ted/packages-honest-plugins/db'       // auto-detect dialect
import { DBPlugin } from '@rx-ted/packages-honest-plugins/db/d1'    // Cloudflare D1
import { DBPlugin } from '@rx-ted/packages-honest-plugins/db/sqlite' // SQLite
```

### Access the database

```ts
import { ComponentManager } from '@rx-ted/packages-honest';
import { DbService } from '@rx-ted/packages-honest-plugins/db';

const db = ComponentManager.getPlugin<DbService>('db');
// Use db.client for Drizzle ORM operations
```

### Schema builder

```ts
import { compileSchema, table, column } from '@rx-ted/packages-honest-plugins/db';

const schema = table('users', {
  id: column.uuid().primaryKey(),
  name: column.text().notNull(),
});

// Compiles to dialect-specific DDL based on runtime platform
const ddl = compileSchema(schema);
```

### Zod bridge

```ts
import { zdb, toTableDefinition } from '@rx-ted/packages-honest-plugins/db';
import { z } from 'zod';

const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
});

const meta = getZodDbMeta(userSchema, 'users');
const tableDef = toTableDefinition(meta);
```

## Supported Dialects

| Dialect | Env var | Package |
|---------|---------|---------|
| MySQL | `DB=mysql` | `mysql2` |
| SQLite | `DB=sqlite` | `better-sqlite3` |
| Cloudflare D1 | `DB=d1` | `@libsql/client` |
| PostgreSQL | `DB=postgres` | `postgres` |

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm test` | Run tests |
| `pnpm build` | Build |
| `pnpm typecheck` | Type check |
