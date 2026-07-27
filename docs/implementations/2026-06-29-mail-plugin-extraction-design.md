# Extract & Redesign Mail Plugin as `@rx-ted/packages-honest-plugins-mail`

> **Status: IMPLEMENTED** — Mail Plugin 已提取到独立包。

## Goal

Extract the built-in mail plugin from `packages/honest/src/plugins/mail/` into a
separate package `@rx-ted/packages-honest-plugins-mail` with redesigned
multi-provider support (Resend, Brevo, SMTP, Custom), per-provider rate
limiting, and daily health checking with retry.

The extraction follows the same pattern as
`@rx-ted/packages-honest-plugins-cache` and
`@rx-ted/packages-honest-plugins-db`.

## Requirements

| # | Requirement |
|---|-------------|
| 1 | Plugin accepts 1 or 2 provider configs in a single `MailPlugin` instance |
| 2 | Supported providers: Resend, Brevo (`@getbrevo/brevo`), SMTP (`nodemailer`), Custom (user-provided implementation) |
| 3 | Per-provider daily send quota enforced via cache |
| 4 | Health check runs once per day per provider; on failure retries up to 3 times; marks degraded if all fail |
| 5 | No inbound/receive webhook — plugin handles send + health check only |
| 6 | Consumer pattern in apps/platform-api calls plugin's `send()`; rate limiting enforced at plugin level automatically |
| 7 | Existing `MailCacheDriver` pattern (minimal incr/expire interface) used for rate limit counting; works with or without a full cache plugin |
| 8 | DB and Cache remain single-instance — only mail gets multi-provider |

## Package Anatomy

| Property | Value |
|---|---|
| Directory | `packages/honest-plugins/mail/` |
| Package name | `@rx-ted/packages-honest-plugins-mail` |
| TypeScript root | `packages/honest-plugins/mail/src/` |
| Build output | `packages/honest-plugins/mail/dist/` |

## Source Structure

```
packages/honest-plugins/mail/src/
  index.ts                  # barrel exports
  types.ts                  # MailProvider, SendMailOptions, etc.
  plugin.ts                 # MailPlugin (IPlugin)
  rate-limiter.ts           # daily quota checker using cache
  providers/
    resend.provider.ts      # ResendMailProvider
    brevo.provider.ts       # BrevoMailProvider
    smtp.provider.ts        # SmtpMailProvider
    custom.provider.ts      # CustomMailProvider (wraps user function)
```

## Core Interfaces

```ts
// types.ts

interface SendMailOptions {
  from: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Attachment[];
  tags?: Record<string, string>;
  headers?: Record<string, string>;
}

interface Attachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

interface MailProvider {
  readonly name: string;
  send(options: SendMailOptions): Promise<{ id: string }>;
  healthCheck(): Promise<boolean>;
  close(): Promise<void>;
}

interface MailProviderConfig {
  name: string;                      // user-defined label e.g. 'primary' | 'secondary'
  provider: 'resend' | 'brevo' | 'smtp' | 'custom';
  fromEmail: string;
  fromName?: string;
  limits?: {
    dailyQuota?: number;             // max sends/day for this provider
  };
  // provider-specific:
  resend?: { apiKey: string };
  brevo?: { apiKey: string };
  smtp?: { host: string; port: number; user: string; pass: string; secure?: boolean };
  custom?: MailProvider;             // user-provided instance
}

interface MailPluginOptions {
  providers: MailProviderConfig[];   // 1 or 2 entries
  healthCheck?: {
    intervalMs?: number;             // default: 24h
    maxRetries?: number;             // default: 3
    retryDelayMs?: number;           // default: 1000
  };
}
```

## Provider Implementations

### ResendMailProvider

- Creates `new Resend(apiKey)` lazily via variable-path `import('resend')`
- `send()`: calls `client.emails.send()` mapping attachment.content as Buffer
- `healthCheck()`: sends a lightweight test email (or uses API key validation endpoint)

### BrevoMailProvider

- Creates `new BrevoClient({ apiKey })` lazily via variable-path `import('@getbrevo/brevo')`
- `send()`: calls `client.transactionalEmails.sendTransacEmail()` mapping fields
- `healthCheck()`: uses account/API key validation endpoint

### SmtpMailProvider

- Creates nodemailer `createTransport()` lazily via variable-path `import('nodemailer')`
- `send()`: calls `transporter.sendMail()`
- `healthCheck()`: calls `transporter.verify()`

### CustomMailProvider

- Wraps a user-supplied `MailProvider` instance
- Pass-through — no additional dependency

## MailPlugin (`IPlugin`)

### Lifecycle

```
beforeModulesRegistered():
  1. Validate provider configs (1 or 2 entries)
  2. For each config, create MailProvider instance
  3. Register each provider via ComponentManager:
     ComponentManager.registerPlugin('mail:primary', primaryProvider)
     ComponentManager.registerPlugin('mail:secondary', secondaryProvider)
     ComponentManager.registerPlugin('mail', primaryProvider) // alias for default

afterModulesRegistered():
  1. For each provider, run healthCheckWithRetry()

close():
  1. Call provider.close() on each
```

### Client Accessor

Plugin exposes `getClient(name?: string): MailProvider`:
- If `name` is specified, returns the provider registered under that name
- If omitted, returns the first (primary) provider
- Consumers call `provider.send(options)` directly after getting the client

Each provider is registered via `ComponentManager.registerPlugin('mail:<name>', provider)` so it can also be retrieved without a reference to the plugin instance.

Before each `send()`, the provider checks daily quota via `rate-limiter`. After successful send, the daily counter is incremented.

## Rate Limiting

### `rate-limiter.ts`

Uses `MailCacheDriver` (minimal interface with `incr()` and `expire()`) — a
subset of `CacheDriver` from the cache plugin, but also works standalone.

**Daily quota flow:**

1. Before `send()`, call `cache.incr('mail:quota:<name>:<YYYY-MM-DD>')`
2. If returned value `> dailyQuota`, reject with `MailQuotaExceededError`
3. On first incr of the day, set `expire(key, 86400)` so key auto-clears
4. Uses UTC date to avoid timezone drift

The rate limiter is resilient: if no cache is available, it logs a warning and
allows the send (fail-open).

### Cache Key Namespace

| Key | Purpose | TTL |
|---|---|---|
| `mail:quota:<name>:<YYYY-MM-DD>` | Daily send counter per provider | 86400s |
| `mail:healthcheck:<name>:<YYYY-MM-DD>` | Health check completion marker | 86400s |

## Health Check

### `health.ts` (internal to plugin)

```
healthCheckWithRetry(provider, options):
  1. Check cache key 'mail:healthcheck:<name>:<today>' exists
  2. If exists → skip (already checked today)
  3. If not → run provider.healthCheck()
  4. If success → set cache key with 86400s TTL, return
  5. If fail → retry up to maxRetries times with retryDelayMs between
  6. After all retries fail → log warning, mark provider as degraded
     (does NOT block sends, but logged for monitoring)
```

Retries use a simple 1s delay between attempts. No exponential backoff needed
for 3 retries.

## Dependencies

### `packages/honest-plugins/mail/package.json`

```json
{
  "name": "@rx-ted/packages-honest-plugins-mail",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json"
  },
  "dependencies": {
    "@rx-ted/packages-logger": "workspace:^"
  },
  "peerDependencies": {
    "@rx-ted/packages-honest": "workspace:^",
    "hono": "^4.12.18"
  },
  "optionalDependencies": {
    "resend": "^6.14.0",
    "@getbrevo/brevo": "^5.0.4",
    "nodemailer": "^6.9.16"
  }
}
```

Providers use `optionalDependencies` — only the import for the configured
provider is loaded via variable-path dynamic `import()`. Missing optional deps
throw a clear error at provider construction time, not at package install.

## Changes to Honest Core

### Remove `packages/honest/src/plugins/mail/`

Delete the entire `mail/` directory from the honest package.

### Update `packages/honest/src/plugins/index.ts`

Remove `export * from './mail'`.

### No re-export backward compat

Unlike the db extraction, mail is **not** re-exported from `@rx-ted/packages-honest`.
Consumers must explicitly import from `@rx-ted/packages-honest-plugins-mail`.

(Reason: the provider model and config shape changed significantly — backward
compat via re-export would add confusion. The plugin is currently commented out
in apps/platform-api anyway.)

## Changes to Workspace

### `pnpm-workspace.yaml`

Add `"packages/honest-plugins/mail"`.

### Root `tsconfig.json` (if paths are stored here)

Add `@rx-ted/packages-honest-plugins-mail` path mapping.

## Consumer Impact (apps/platform-api)

### Old (current, commented out)

```ts
import { MailPlugin } from '@rx-ted/packages-honest';

new MailPlugin({
  provider: 'resend',
  fromEmail: '...',
  resend: { apiKey: '...' },
})
```

### New

```ts
import { MailPlugin } from '@rx-ted/packages-honest-plugins-mail';

new MailPlugin({
  providers: [
    {
      name: 'primary',
      provider: 'resend',
      fromEmail: 'noreply@example.com',
      resend: { apiKey: '...' },
      limits: { dailyQuota: 500 },
    },
  ],
  healthCheck: {
    maxRetries: 3,
    retryDelayMs: 1000,
  },
})
```

### Mail Consumer

The existing `MailConsumer` in `apps/platform-api/src/modules/mail/` remains.
It should get the mail provider via `ComponentManager.getPlugin<MailProvider>('mail')`
(or `'mail:primary'` / `'mail:secondary'` for a specific instance).

Rate limiting is enforced at the provider level — the consumer does not need
separate quota logic.

## Verification

1. `pnpm install` — workspace linking succeeds
2. `cd packages/honest-plugins/mail && npx tsc --noEmit` — typecheck passes
3. `cd packages/honest && npx tsc --noEmit` — typecheck passes (mail removed)
4. `cd apps/platform-api && npx tsc --noEmit` — typecheck passes
5. `pnpm wrangler dev` — starts successfully (mail plugin still commented out initially)
