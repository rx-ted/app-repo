# @rx-ted/packages-honest-plugins-mail

Mail plugin for [@rx-ted/packages-honest](https://github.com/rx-ted/honest). Supports multiple email providers with automatic failover, per-provider daily rate limiting, and health checks.

## Features

- **Multi-provider**: Resend, Brevo, SMTP, or custom — up to 2 providers
- **Auto-failover**: tries the next provider if the primary fails
- **Rate limiting**: per-provider daily quota via cache (`incr`/`expire`)
- **Health checks**: verifies each provider once per day with configurable retries
- **Runtime-agnostic**: works on Node.js, Bun, Deno, and Cloudflare Workers
- **Lazy imports**: optional SDKs (`resend`, `@getbrevo/brevo`, `sently`) are loaded only when needed

## Installation

```bash
pnpm add @rx-ted/packages-honest-plugins-mail
```

Peer dependencies: `@rx-ted/packages-honest`, `hono`

Optional SDKs (install only the providers you need):
```bash
pnpm add resend              # for Resend provider
pnpm add sently              # for SMTP provider
pnpm add @getbrevo/brevo     # for Brevo provider
```

## Usage

### Register as a plugin

```ts
import { MailPlugin } from '@rx-ted/packages-honest-plugins-mail';
import type { MailPluginOptions } from '@rx-ted/packages-honest-plugins-mail';

const plugin = new MailPlugin({
  providers: [
    {
      name: 'primary',
      provider: 'resend',
      fromEmail: 'noreply@example.com',
      resend: { apiKey: 're_xxx' },
      limits: { dailyQuota: 100 },
    },
    {
      name: 'fallback',
      provider: 'smtp',
      fromEmail: 'noreply@example.com',
      smtp: {
        host: 'smtp.example.com',
        port: 465,
        user: 'user',
        pass: 'pass',
        secure: true,
      },
    },
  ],
  healthCheck: {
    intervalMs: 300_000,   // check every 5 minutes
    maxRetries: 3,
    retryDelayMs: 1000,
  },
});
```

Then pass the plugin to `Application.create`:

```ts
const { hono } = await Application.create(AppModule, {
  plugins: [plugin],
  // ...
});
```

### Send an email

The primary provider is registered under `'mail'` in `ComponentManager`. Individual providers are registered under `'mail:<name>'`.

```ts
import { ComponentManager } from '@rx-ted/packages-honest';
import type { MailProvider } from '@rx-ted/packages-honest-plugins-mail';

const provider = ComponentManager.getPlugin<MailProvider>('mail');
const result = await provider.send({
  from: 'noreply@example.com',
  to: 'user@example.com',
  subject: 'Hello',
  html: '<h1>Hello</h1>',
  text: 'Hello',
});
// { id: '...', provider: 'primary' }
```

### Get a specific provider

```ts
const provider = mailPlugin.getClient('brevo-provider');
```

## Provider Configuration

### Resend

```ts
{
  name: 'resend',
  provider: 'resend',
  fromEmail: 'noreply@example.com',
  fromName: 'My App',     // optional
  resend: { apiKey: 're_xxx' },
}
```

### Brevo

```ts
{
  name: 'brevo',
  provider: 'brevo',
  fromEmail: 'noreply@example.com',
  brevo: { apiKey: 'xxx' },
}
```

### SMTP

```ts
{
  name: 'smtp',
  provider: 'smtp',
  fromEmail: 'noreply@example.com',
  smtp: {
    host: 'smtp.example.com',
    port: 465,
    user: 'username',
    pass: 'password',
    secure: true,     // false for port 587 (STARTTLS)
  },
}
```

> **Note on Cloudflare Workers:** SMTP uses `sently` which relies on `cloudflare:sockets` TCP API. Port 25 is blocked; use 465 or 587.

### Custom

```ts
import { CustomMailProvider } from '@rx-ted/packages-honest-plugins-mail';

{
  name: 'custom',
  provider: 'custom',
  custom: myCustomMailProvider,  // any MailProvider instance
}
```

## Rate Limiting

When a cache driver is available (e.g., `RedisPlugin`), the `RateLimiter` enforces daily quotas via cache `incr`/`expire`. If no cache is registered, rate limiting is disabled.

```ts
{
  name: 'resend',
  provider: 'resend',
  fromEmail: '...',
  resend: { apiKey: '...' },
  limits: { dailyQuota: 1000 },
}
```

## Health Checks

The plugin runs health checks in `afterModulesRegistered` with configurable retries. Each provider is checked once per day (tracked via cache).

## API

### `MailPlugin`

| Method | Description |
|--------|-------------|
| `getClient(name?)` | Returns the primary provider or a named provider |
| `beforeModulesRegistered(app, hono)` | Registers providers in ComponentManager |
| `afterModulesRegistered(app, hono)` | Runs initial health checks |
| `close()` | Closes all provider connections |

### Types

```ts
interface MailProvider {
  readonly name: string;
  send(options: SendMailOptions): Promise<SendMailResult>;
  healthCheck(): Promise<boolean>;
  close(): Promise<void>;
}

interface SendMailOptions {
  from: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Attachment[];
  headers?: Record<string, string>;
  tags?: Record<string, string>;
}

interface SendMailResult {
  id: string;
  provider: string;
}
```
