# Environment Variables

All env files are loaded via dotenv and merged in this order:

1. `.env` — base config (committed)
2. `.env.dev` — when `DEBUG=true` (gitignored)
3. `.env.prod` — when `DEBUG=false` or unset (gitignored)

`wrangler.jsonc` vars are used only in Cloudflare Workers runtime and override `.env` values.

---

## Core Runtime

| Variable | Required | Default | Description |
|---|---|---|---|
| `DEBUG` | No | `false` | Enable debug mode. Controls log verbosity, dev server, and API docs. |
| `NODE_ENV` | No | `development` | `development` or `production`. |
| `DB` | No | `d1` | Database dialect: `d1`, `sqlite`, or `mysql`. Set automatically by drizzle config files. |
| `PORT` | No | `3000` | Server listen port (node/bun/deno runtimes). |
| `LOGGER_LEVEL` | No | `info` | Log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal`. |
| `CACHE` | No | `kv` | Cache driver: `kv`, `redis`, or `local`. |

---

## MySQL (when `DB=mysql`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_HOST` | Yes | — | Database host. |
| `DB_PORT` | No | `3306` | Database port. |
| `DB_USER` | Yes | — | Database user. |
| `DB_PASSWORD` | Yes | — | Database password. |
| `DB_DATABASE` | Yes | — | Database name. |
| `DB_SSL` | No | `false` | Enable SSL connection. |

## SQLite (when `DB=sqlite`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_PATH` | No | `data/app.db` | SQLite file path. |

## Cloudflare D1 (when `DB=d1`, used in `wrangler.jsonc`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Yes | — | Cloudflare account ID. |
| `CLOUDFLARE_DATABASE_ID` | Yes | — | D1 database ID. |
| `CLOUDFLARE_D1_TOKEN` | Yes | — | Cloudflare API token. |

---

## Redis (when `CACHE=redis`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `REDIS_URL` | No | — | Full Redis URL (takes precedence over individual fields). |
| `REDIS_HOST` | No | `127.0.0.1` | Redis host. |
| `REDIS_PORT` | No | `6379` | Redis port. |
| `REDIS_USERNAME` | No | — | Redis username. |
| `REDIS_PASSWORD` | No | — | Redis password. |
| `REDIS_DB` | No | `0` | Redis database number. |

---

## Authentication

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | Yes | — | Secret key for JWT signing. |
| `ADMIN_USERS` | No | — | Comma-separated usernames/emails. Auto-grants admin role on registration. |
| `INIT_KEY` | No | — | Initialization key for first-time setup guard. |
| `ANOMALY_DETECTION_MODE` | No | `off` | Session anomaly detection: `off`, `warn`, `reject`. |
| `RATE_LIMIT_ENABLED` | No | `false` | Enable rate limiting middleware. |

---

## OAuth

### GitHub

| Variable | Required | Default | Description |
|---|---|---|---|
| `GITHUB_CLIENT_ID` | Yes | — | GitHub OAuth app client ID. |
| `GITHUB_SECRET` | Yes | — | GitHub OAuth app client secret. |

### Google

| Variable | Required | Default | Description |
|---|---|---|---|
| `OAUTH_GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID. |
| `OAUTH_GOOGLE_CLIENT_SECRET` | No | — | Google OAuth client secret. |

---

## Mail

The `MAILS` env var controls which providers are active (comma-separated list).
Providers are resolved in order: `resend`, `brevo`, `smtp`.

| Variable | Required | Default | Description |
|---|---|---|---|
| `MAILS` | No | `resend,brevo,smtp` | Comma-separated active mail providers. |

### Resend

| Variable | Required | Default | Description |
|---|---|---|---|
| `MAIL_RESEND_API_KEY` | No | — | Resend API key. |
| `MAIL_RESEND_FROM_EMAIL` | No | `noreply@19981204.xyz` | Sender email address. |
| `MAIL_RESEND_FROM_NAME` | No | `noreply` | Sender display name. |

### Brevo

| Variable | Required | Default | Description |
|---|---|---|---|
| `MAIL_BREVO_API_KEY` | No | — | Brevo (Sendinblue) API key. |
| `MAIL_BREVO_FROM_EMAIL` | No | `noreply@19981204.xyz` | Sender email address. |
| `MAIL_BREVO_FROM_NAME` | No | `noreply` | Sender display name. |

### SMTP

| Variable | Required | Default | Description |
|---|---|---|---|
| `MAIL_SMTP_HOST` | No | — | SMTP server host. |
| `MAIL_SMTP_PORT` | No | `587` | SMTP server port. |
| `MAIL_SMTP_USER` | No | — | SMTP username (also used as default from email). |
| `MAIL_SMTP_PASS` | No | — | SMTP password. |
| `MAIL_SMTP_FROM_EMAIL` | No | (same as `MAIL_SMTP_USER`) | Sender email address. Defaults to `MAIL_SMTP_USER` if empty. |
| `MAIL_SMTP_FROM_NAME` | No | `rx-ted` | Sender display name. |

---

## GitHub Integration

| Variable | Required | Default | Description |
|---|---|---|---|
| `GITHUB_REPO_OWNER` | No | — | GitHub repo owner for content fetching. |
| `GITHUB_REPO_NAME` | No | — | GitHub repo name for content fetching. |

---

## Giscus (Comments)

| Variable | Required | Default | Description |
|---|---|---|---|
| `GISCUS_REPO_ID` | No | — | Giscus repository ID. |
| `GISCUS_CATEGORY` | No | — | Giscus discussion category. |
| `GISCUS_CATEGORY_ID` | No | — | Giscus category ID. |

---

## Orama (Search)

| Variable | Required | Default | Description |
|---|---|---|---|
| `ORAMA_PROJECT_ID` | No | — | Orama cloud project ID. |
| `ORAMA_DATA_SOURCE_ID` | No | — | Orama data source ID. |
| `ORAMA_WRITE_API_KEY` | No | — | Orama write API key. |
| `ORAMA_READ_API_KEY` | No | — | Orama read API key. |

---

## Site / Frontend

| Variable | Required | Default | Description |
|---|---|---|---|
| `FRONTEND_DOMAIN` | No | `localhost:3000` | Frontend domain used in OAuth callbacks. |
| `SITE_DOMAIN` | No | `localhost:3000` | Backend/API site domain. |
| `SITE_LICENSE` | No | `CC BY-NC-SA 4.0` | Content license string. |
