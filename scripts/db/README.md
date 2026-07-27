# Database CLI

Unified database management for MySQL, Cloudflare D1, and SQLite via Drizzle ORM.

## Usage

```bash
pnpm db <command> <mysql|d1|sqlite>
```

Environment is controlled by the `DEBUG` env var:

| `DEBUG`          | Environment | Drizzle output   | D1 local                      |
| ---------------- | ----------- | ---------------- | ----------------------------- |
| `true` (default) | dev         | `drizzle/*/dev`  | `wrangler d1 execute --local` |
| `false`          | prod        | `drizzle/*/prod` | `drizzle-kit push` (D1 HTTP)  |

## Commands

| Command    | Description                                |
| ---------- | ------------------------------------------ |
| `generate` | Generate SQL migration from schema         |
| `push`     | Apply migrations to database               |
| `pull`     | Introspect database and pull schema        |
| `migrate`  | Run migrations (same as push for local D1) |
| `studio`   | Open Drizzle Studio                        |
| `drop`     | Drop database                              |

## Examples

```bash
# MySQL dev
pnpm db generate mysql
pnpm db push mysql

# MySQL prod
DEBUG=false pnpm db push mysql

# D1 dev
pnpm db generate d1
DEBUG=true pnpm db migrate d1

# D1 prod
DEBUG=false pnpm db push d1
```

## Architecture

```
scripts/db/
├── index.ts           # CLI entry — arg parsing + dispatch
├── adapter.ts         # DatabaseAdapter interface + Database type
├── registry.ts        # Adapter registry (Map-based)
├── adapters/
│   ├── drizzle.ts     # drizzle-kit command wrapper (passes NODE_ENV)
│   ├── mysql.ts       # MySQL adapter
│   └── d1.ts          # D1 adapter (local: wrangler, prod: drizzle-kit)
│   └── sqlite.ts      # SQLite adapter
├── utils/
│   ├── exec.ts        # execa wrapper
│   └── migration.ts   # Local D1 migration executor
└── README.md
```

Adding a new database dialect requires only a new adapter in `adapters/` and registering it in `registry.ts`.
