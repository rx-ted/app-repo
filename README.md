# @rx-ted/app

Full-stack blogging platform — API server, blog frontend, and shared packages.

## Stack

- **honest** — DI framework over Hono (NestJS-style modularity, zero lock-in)
- **Drizzle ORM** — type-safe SQL (MySQL, SQLite, D1)
- **Vue 3** — blog frontend (Naive UI, Pinia, Vue Router)
- **Biome** — linting and formatting

## Structure

```
apps/
├── platform-api/       Hono API server (modules, guards, Drizzle ORM)
└── web-blog/           Vue 3 blog frontend (Naive UI, Pinia, markdown editor)
packages/
├── core/               Env, Logger, Platform (cross-runtime)
├── honest/             DI framework (decorators, routing, plugin engine)
└── honest-plugins/
    ├── db/             Database plugin (MySQL/SQLite/D1/PostgreSQL)
    ├── cache/          Cache plugin (Redis/KV/Local)
    ├── mail/           Mail plugin (Resend/Brevo/SMTP)
    ├── s3/             Object storage plugin (AWS S3)
    └── api-doc/        OpenAPI documentation plugin (Scalar/Swagger)
```

## Quick Start

```bash
pnpm install
pnpm build
pnpm dev
```

## Quality Gates

| Hook | Action |
|------|--------|
| `pre-commit` | Biome lint + all tests + typecheck |
| `commit-msg` | Conventional commit validation |
| `pre-push` | Changeset status check |

## License

MIT
