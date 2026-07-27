# Mail Plugin Extraction & Multi-Provider Redesign

> **Status: IMPLEMENTED** — Mail Plugin 已提取到 `packages/honest-plugins/mail`，支持 Resend/Brevo/SMTP。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the mail plugin from `packages/honest/src/plugins/mail/` into `packages/honest-plugins/mail/` (`@rx-ted/packages-honest-plugins-mail`) with multi-provider support (Resend, Brevo, SMTP, Custom), per-provider daily rate limiting, and daily health checking with retry.

**Architecture:** Single `MailPlugin` accepts `providers: MailProviderConfig[]` (1-2 entries), creates `MailProvider` instances for each, registers them via `ComponentManager` under `'mail:<name>'` keys. Each provider wraps a third-party SDK (Resend, Brevo, nodemailer). A `RateLimiter` utility checks daily quota via cache before sends. A health check runner verifies each provider once/day with 3 retries.

**Tech Stack:** TypeScript, `@rx-ted/packages-honest` (IPlugin, ComponentManager), `resend`, `@getbrevo/brevo`, `nodemailer`

---

## File Structure

### New files

| File | Responsibility |
|---|---|
| `packages/honest-plugins/mail/package.json` | Package manifest |
| `packages/honest-plugins/mail/tsconfig.json` | TypeScript config |
| `packages/honest-plugins/mail/src/index.ts` | Barrel exports |
| `packages/honest-plugins/mail/src/types.ts` | `MailProvider`, `SendMailOptions`, `MailProviderConfig`, `MailPluginOptions` interfaces + `MailQuotaExceededError` |
| `packages/honest-plugins/mail/src/plugin.ts` | `MailPlugin` (IPlugin) — lifecycle, `getClient()`, provider creation |
| `packages/honest-plugins/mail/src/rate-limiter.ts` | `RateLimiter` — daily quota via cache incr/expire |
| `packages/honest-plugins/mail/src/providers/resend.provider.ts` | `ResendMailProvider` |
| `packages/honest-plugins/mail/src/providers/brevo.provider.ts` | `BrevoMailProvider` |
| `packages/honest-plugins/mail/src/providers/smtp.provider.ts` | `SmtpMailProvider` |
| `packages/honest-plugins/mail/src/providers/custom.provider.ts` | `CustomMailProvider` — wraps user-supplied instance |

### Modified files

| File | Change |
|---|---|
| `pnpm-workspace.yaml` | Add `"packages/honest-plugins/mail"` |
| `packages/honest/src/plugins/index.ts` | Remove `export * from './mail'` |
| `packages/honest/src/plugins/mail/` | DELETE entire directory |

---

### Task 1: Scaffold the new package

**Files:**
- Create: `packages/honest-plugins/mail/package.json`
- Create: `packages/honest-plugins/mail/tsconfig.json`
- Modify: `pnpm-workspace.yaml`
- Create: `packages/honest-plugins/mail/src/index.ts`

- [ ] **Step 1: Create `package.json`**

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

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "sourceMap": false,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src"],
  "exclude": ["**/*.test.ts"]
}
```

- [ ] **Step 3: Add to `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/honest-plugins/mail"
```

(Add this entry alongside the existing `"packages/honest-plugins/cache"` and `"packages/honest-plugins/db"` entries.)

- [ ] **Step 4: Create barrel `src/index.ts`**

```ts
export { MailPlugin, MAIL_GLOBAL_KEY } from './plugin';
export type { MailPluginOptions, MailProviderConfig, MailProviderSendOptions } from './plugin';
export type { MailProvider, SendMailOptions, Attachment } from './types';
```

- [ ] **Step 5: Run install and verify**

Run: `pnpm install`
Expected: Linking succeeds. Verify with `ls -la node_modules/@rx-ted/packages-honest-plugins-mail` (should symlink to `packages/honest-plugins/mail`).

- [ ] **Step 6: Commit**

```bash
git add pnpm-workspace.yaml packages/honest-plugins/mail/package.json packages/honest-plugins/mail/tsconfig.json packages/honest-plugins/mail/src/index.ts
git commit -m "feat(mail): scaffold packages/honest-plugins/mail package"
```

---

### Task 2: Define core types

**Files:**
- Create: `packages/honest-plugins/mail/src/types.ts`

- [ ] **Step 1: Write `types.ts`**

```ts
import type { ILogger } from '@rx-ted/packages-logger';

export interface Attachment {
  filename: string;
  content?: string | Uint8Array;
  path?: string;
  contentType?: string;
}

export interface SendMailOptions {
  from: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Attachment[];
  headers?: Record<string, string>;
  tags?: Record<string, string>;
}

export interface SendMailResult {
  id: string;
  provider: string;
}

export interface MailProvider {
  readonly name: string;
  send(options: SendMailOptions): Promise<SendMailResult>;
  healthCheck(): Promise<boolean>;
  close(): Promise<void>;
}

export interface ResendProviderConfig {
  apiKey: string;
}

export interface BrevoProviderConfig {
  apiKey: string;
}

export interface SmtpProviderConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure?: boolean;
}

export type ProviderType = 'resend' | 'brevo' | 'smtp' | 'custom';

export interface MailProviderConfigEntry {
  name: string;
  provider: ProviderType;
  fromEmail: string;
  fromName?: string;
  limits?: {
    dailyQuota?: number;
  };
  resend?: ResendProviderConfig;
  brevo?: BrevoProviderConfig;
  smtp?: SmtpProviderConfig;
  custom?: MailProvider;
}

export interface MailPluginOptions {
  providers: MailProviderConfigEntry[];
  healthCheck?: {
    intervalMs?: number;
    maxRetries?: number;
    retryDelayMs?: number;
  };
  logger?: ILogger;
}

export class MailQuotaExceededError extends Error {
  constructor(providerName: string, quota: number) {
    super(`Mail quota exceeded for provider "${providerName}": ${quota}/day`);
    this.name = 'MailQuotaExceededError';
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd packages/honest-plugins/mail && npx tsc --noEmit`
Expected: Pass (no errors).

- [ ] **Step 3: Commit**

```bash
git add packages/honest-plugins/mail/src/types.ts
git commit -m "feat(mail): add core types MailProvider, SendMailOptions, config types"
```

---

### Task 3: Implement rate limiter

**Files:**
- Create: `packages/honest-plugins/mail/src/rate-limiter.ts`

- [ ] **Step 1: Write `rate-limiter.ts`**

```ts
import type { ILogger } from '@rx-ted/packages-logger';

export interface MailCacheDriver {
  incr(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<boolean>;
}

export class RateLimiter {
  constructor(
    private quota: number,
    private providerName: string,
    private cache?: MailCacheDriver | null,
    private logger?: ILogger,
  ) {}

  async checkAndIncrement(): Promise<void> {
    if (!this.cache) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `mail:quota:${this.providerName}:${today}`;
    const count = await this.cache.incr(key);
    if (count === 1) {
      await this.cache.expire(key, 86400);
    }
    if (count > this.quota) {
      this.logger?.warn?.('Daily quota exceeded', { provider: this.providerName, quota: this.quota });
      const { MailQuotaExceededError } = await import('./types');
      throw new MailQuotaExceededError(this.providerName, this.quota);
    }
  }

  async isHealthCheckDue(): Promise<boolean> {
    if (!this.cache) return true;
    const key = `mail:healthcheck:${this.providerName}:${new Date().toISOString().slice(0, 10)}`;
    const { exists: _exists } = await import('node:crypto'); // not using crypto
    // Use cache get to check if key exists — cache.get returns null vs value
    // Simpler: try incr by 0 — but cache may not support that. Use cache.get pattern.
    // We'll use a dedicated method below instead.
    return true; // default to due — overridden by implementation
  }

  async markHealthCheckDone(): Promise<void> {
    if (!this.cache) return;
    const key = `mail:healthcheck:${this.providerName}:${new Date().toISOString().slice(0, 10)}`;
    await this.cache.expire(key, 86400);
    // We use expire as a set-with-ttL — incr to 1 then set ttl
    await this.cache.incr(key);
    await this.cache.expire(key, 86400);
  }

  async wasHealthCheckDone(): Promise<boolean> {
    if (!this.cache) return false;
    const key = `mail:healthcheck:${this.providerName}:${new Date().toISOString().slice(0, 10)}`;
    // Use incr to check — if it returns > 0, we know
    const val = await this.cache.incr(key);
    if (val === 1) {
      // We just created it, mark as not done (decrement back)
      // Actually incr is destructive. We need a different approach.
      return false;
    }
    return val > 1;
  }
}
```

Wait, the `wasHealthCheckDone` approach has a race condition. Let me use a cleaner design.

- [ ] **Step 1 (revised): Write `rate-limiter.ts`**

```ts
import type { ILogger } from '@rx-ted/packages-logger';

export interface MailCacheDriver {
  incr(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<boolean>;
  get?(key: string): Promise<unknown>;
}

export class RateLimiter {
  constructor(
    private quota: number,
    private providerName: string,
    private cache?: MailCacheDriver | null,
    private logger?: ILogger,
  ) {}

  async checkAndIncrement(): Promise<void> {
    if (!this.cache) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `mail:quota:${this.providerName}:${today}`;
    const count = await this.cache.incr(key);
    if (count === 1) {
      await this.cache.expire(key, 86400);
    }
    if (count > this.quota) {
      this.logger?.warn?.('Daily quota exceeded', { provider: this.providerName, quota: this.quota });
      const { MailQuotaExceededError } = await import('./types');
      throw new MailQuotaExceededError(this.providerName, this.quota);
    }
  }

  async markHealthCheckDone(): Promise<void> {
    if (!this.cache) return;
    const key = `mail:healthcheck:${this.providerName}:${today()}`;
    await this.cache.incr(key);
    await this.cache.expire(key, 86400);
  }

  async wasHealthCheckDoneToday(): Promise<boolean> {
    if (!this.cache) return false;
    const key = `mail:healthcheck:${this.providerName}:${today()}`;
    if (typeof this.cache.get === 'function') {
      const val = await this.cache.get(key);
      return val !== null && val !== undefined;
    }
    return false;
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd packages/honest-plugins/mail && npx tsc --noEmit`
Expected: Pass.

- [ ] **Step 3: Commit**

```bash
git add packages/honest-plugins/mail/src/rate-limiter.ts
git commit -m "feat(mail): add RateLimiter with daily quota and health check tracking"
```

---

### Task 4: Implement ResendMailProvider

**Files:**
- Create: `packages/honest-plugins/mail/src/providers/resend.provider.ts`

- [ ] **Step 1: Write `resend.provider.ts`**

```ts
import type { MailProvider, SendMailOptions, SendMailResult, ResendProviderConfig } from '../types';

export class ResendMailProvider implements MailProvider {
  readonly name: string;
  private client: any = null;
  private initPromise: Promise<void> | null = null;

  constructor(
    name: string,
    private config: ResendProviderConfig,
    private fromEmail: string,
    private fromName?: string,
  ) {
    this.name = name;
  }

  private async ensureInit(): Promise<void> {
    if (this.client) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      const mod = 'resend';
      const { Resend } = await import(mod);
      this.client = new Resend(this.config.apiKey);
    })();
    return this.initPromise;
  }

  async send(options: SendMailOptions): Promise<SendMailResult> {
    await this.ensureInit();
    const payload: Record<string, unknown> = {
      from: this.fromName ? `${this.fromName} <${options.from || this.fromEmail}>` : (options.from || this.fromEmail),
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
    };
    if (options.cc) payload.cc = Array.isArray(options.cc) ? options.cc : [options.cc];
    if (options.bcc) payload.bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
    if (options.html) payload.html = options.html;
    if (options.text) payload.text = options.text;
    if (options.attachments?.length) {
      payload.attachments = options.attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        path: a.path,
        content_type: a.contentType,
      }));
    }
    if (options.headers) payload.headers = options.headers;
    if (options.tags) payload.tags = Object.entries(options.tags).map(([key, value]) => ({ name: key, value }));
    const { data, error } = await this.client.emails.send(payload);
    if (error) throw new Error(`Resend send failed: ${error.message}`);
    return { id: data?.id ?? 'unknown', provider: this.name };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureInit();
      await this.client.emails.send({
        from: this.fromName ? `${this.fromName} <${this.fromEmail}>` : this.fromEmail,
        to: [this.fromEmail],
        subject: 'Health check',
        text: 'This is a health check email from Resend provider.',
      });
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    this.client = null;
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd packages/honest-plugins/mail && npx tsc --noEmit`
Expected: Pass.

- [ ] **Step 3: Commit**

```bash
git add packages/honest-plugins/mail/src/providers/resend.provider.ts
git commit -m "feat(mail): add ResendMailProvider"
```

---

### Task 5: Implement BrevoMailProvider

**Files:**
- Create: `packages/honest-plugins/mail/src/providers/brevo.provider.ts`

- [ ] **Step 1: Write `brevo.provider.ts`**

```ts
import type { MailProvider, SendMailOptions, SendMailResult, BrevoProviderConfig } from '../types';

export class BrevoMailProvider implements MailProvider {
  readonly name: string;
  private client: any = null;
  private initPromise: Promise<void> | null = null;

  constructor(
    name: string,
    private config: BrevoProviderConfig,
    private fromEmail: string,
    private fromName?: string,
  ) {
    this.name = name;
  }

  private async ensureInit(): Promise<void> {
    if (this.client) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      const mod = '@getbrevo/brevo';
      const { BrevoClient } = await import(mod);
      this.client = new BrevoClient({ apiKey: this.config.apiKey });
    })();
    return this.initPromise;
  }

  async send(options: SendMailOptions): Promise<SendMailResult> {
    await this.ensureInit();
    const to = (Array.isArray(options.to) ? options.to : [options.to]).map((e) => ({ email: e }));
    const payload: Record<string, unknown> = {
      sender: { name: this.fromName ?? '', email: options.from || this.fromEmail },
      to,
      subject: options.subject,
    };
    if (options.html) payload.htmlContent = options.html;
    if (options.text) payload.textContent = options.text;
    if (options.cc) payload.cc = (Array.isArray(options.cc) ? options.cc : [options.cc]).map((e) => ({ email: e }));
    if (options.bcc) payload.bcc = (Array.isArray(options.bcc) ? options.bcc : [options.bcc]).map((e) => ({ email: e }));
    if (options.attachments?.length) {
      payload.attachment = options.attachments.map((a) => ({
        name: a.filename,
        content: a.content?.toString('base64'),
      }));
    }
    const result = await this.client.transactionalEmails.sendTransacEmail(payload);
    return { id: result?.messageId ?? 'unknown', provider: this.name };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureInit();
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { name: this.fromName ?? '', email: this.fromEmail },
        to: [{ email: this.fromEmail }],
        subject: 'Health check',
        textContent: 'This is a health check email from Brevo provider.',
      });
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    this.client = null;
  }
}
```

Note: Brevo's API changed between v4 and v5. The `sendTransacEmail` method is stable across both. If using v4.x (legacy SDK), the client is created as `new TransactionalEmailsApi()` and API key set via `apiInstance.setApiKey(0, apiKey)`. The implementation above targets v5.x (`@getbrevo/brevo@^5.0.0`). If v4 is installed, adjust accordingly.

- [ ] **Step 2: Verify typecheck**

Run: `cd packages/honest-plugins/mail && npx tsc --noEmit`
Expected: Pass.

- [ ] **Step 3: Commit**

```bash
git add packages/honest-plugins/mail/src/providers/brevo.provider.ts
git commit -m "feat(mail): add BrevoMailProvider"
```

---

### Task 6: Implement SmtpMailProvider and CustomMailProvider

**Files:**
- Create: `packages/honest-plugins/mail/src/providers/smtp.provider.ts`
- Create: `packages/honest-plugins/mail/src/providers/custom.provider.ts`

- [ ] **Step 1: Write `smtp.provider.ts`**

```ts
import type { MailProvider, SendMailOptions, SendMailResult, SmtpProviderConfig } from '../types';

export class SmtpMailProvider implements MailProvider {
  readonly name: string;
  private transporter: any = null;
  private initPromise: Promise<void> | null = null;

  constructor(
    name: string,
    private config: SmtpProviderConfig,
    private fromEmail: string,
    private fromName?: string,
  ) {
    this.name = name;
  }

  private async ensureInit(): Promise<void> {
    if (this.transporter) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      const mod = 'nodemailer';
      const nodemailer = await import(mod);
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure ?? false,
        auth: {
          user: this.config.user,
          pass: this.config.pass,
        },
      });
    })();
    return this.initPromise;
  }

  async send(options: SendMailOptions): Promise<SendMailResult> {
    await this.ensureInit();
    const payload: Record<string, unknown> = {
      from: this.fromName ? `"${this.fromName}" <${options.from || this.fromEmail}>` : (options.from || this.fromEmail),
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
    };
    if (options.html) payload.html = options.html;
    if (options.text) payload.text = options.text;
    if (options.cc) payload.cc = Array.isArray(options.cc) ? options.cc.join(', ') : options.cc;
    if (options.bcc) payload.bcc = Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc;
    if (options.attachments?.length) {
      payload.attachments = options.attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        path: a.path,
        contentType: a.contentType,
      }));
    }
    const info = await this.transporter.sendMail(payload);
    return { id: info.messageId ?? 'unknown', provider: this.name };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureInit();
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
  }
}
```

- [ ] **Step 2: Write `custom.provider.ts`**

```ts
import type { MailProvider, SendMailOptions, SendMailResult } from '../types';

export class CustomMailProvider implements MailProvider {
  readonly name: string;

  constructor(
    name: string,
    private impl: MailProvider,
  ) {
    this.name = name;
  }

  async send(options: SendMailOptions): Promise<SendMailResult> {
    return this.impl.send(options);
  }

  async healthCheck(): Promise<boolean> {
    if (typeof this.impl.healthCheck === 'function') {
      return this.impl.healthCheck();
    }
    return true;
  }

  async close(): Promise<void> {
    if (typeof this.impl.close === 'function') {
      await this.impl.close();
    }
  }
}
```

- [ ] **Step 3: Verify typecheck**

Run: `cd packages/honest-plugins/mail && npx tsc --noEmit`
Expected: Pass.

- [ ] **Step 4: Commit**

```bash
git add packages/honest-plugins/mail/src/providers/smtp.provider.ts packages/honest-plugins/mail/src/providers/custom.provider.ts
git commit -m "feat(mail): add SmtpMailProvider and CustomMailProvider"
```

---

### Task 7: Implement MailPlugin

**Files:**
- Create: `packages/honest-plugins/mail/src/plugin.ts`
- Modify: `packages/honest-plugins/mail/src/index.ts` (add exports if needed)

- [ ] **Step 1: Write `plugin.ts`**

```ts
import type { Application, IPlugin } from '@rx-ted/packages-honest';
import { ComponentManager } from '@rx-ted/packages-honest';
import type { ILogger } from '@rx-ted/packages-logger';
import type { MailProvider, MailProviderConfigEntry, MailPluginOptions } from './types';
import { RateLimiter, type MailCacheDriver } from './rate-limiter';
import { ResendMailProvider } from './providers/resend.provider';
import { BrevoMailProvider } from './providers/brevo.provider';
import { SmtpMailProvider } from './providers/smtp.provider';
import { CustomMailProvider } from './providers/custom.provider';

export const MAIL_GLOBAL_KEY = 'mail';

export interface MailProviderSendOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: import('./types').Attachment[];
  headers?: Record<string, string>;
  tags?: Record<string, string>;
}

export class MailPlugin implements IPlugin {
  readonly name = 'mail-plugin';
  readonly version = '0.0.1';
  logger?: ILogger;

  private providers: MailProvider[] = [];
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private options: MailPluginOptions;

  constructor(options: MailPluginOptions) {
    if (!options.providers || options.providers.length === 0) {
      throw new Error('MailPlugin requires at least one provider');
    }
    if (options.providers.length > 2) {
      throw new Error('MailPlugin supports at most 2 providers');
    }
    this.options = options;
  }

  getClient(name?: string): MailProvider | undefined {
    if (name) {
      return this.providers.find((p) => p.name === name);
    }
    return this.providers[0];
  }

  async beforeModulesRegistered(app: Application, _hono: any): Promise<void> {
    const cacheDrv = this.getCacheDriver(app);
    for (const cfg of this.options.providers) {
      const provider = this.createProvider(cfg);
      this.providers.push(provider);

      const rateLimiter = new RateLimiter(
        cfg.limits?.dailyQuota ?? Infinity,
        cfg.name,
        cacheDrv,
        this.logger,
      );
      this.rateLimiters.set(cfg.name, rateLimiter);

      ComponentManager.registerPlugin(`mail:${cfg.name}`, provider);
      if (cfg === this.options.providers[0]) {
        ComponentManager.registerPlugin(MAIL_GLOBAL_KEY, provider);
      }
      this.logger?.info?.('Mail provider registered', { name: cfg.name, provider: cfg.provider });
    }
  }

  async afterModulesRegistered(_app: Application, _hono: any): Promise<void> {
    const maxRetries = this.options.healthCheck?.maxRetries ?? 3;
    const retryDelay = this.options.healthCheck?.retryDelayMs ?? 1000;

    for (const provider of this.providers) {
      const limiter = this.rateLimiters.get(provider.name);
      if (!limiter) continue;
      const done = await limiter.wasHealthCheckDoneToday();
      if (done) {
        this.logger?.info?.('Health check already done today', { provider: provider.name });
        continue;
      }
      let success = false;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        this.logger?.info?.('Running health check', { provider: provider.name, attempt });
        success = await provider.healthCheck();
        if (success) break;
        if (attempt < maxRetries) {
          await sleep(retryDelay);
        }
      }
      if (success) {
        await limiter.markHealthCheckDone();
        this.logger?.info?.('Health check passed', { provider: provider.name });
      } else {
        this.logger?.warn?.('Health check failed after retries', { provider: provider.name, maxRetries });
      }
    }
  }

  async close(): Promise<void> {
    for (const provider of this.providers) {
      try {
        await provider.close();
      } catch (e) {
        this.logger?.error?.('Error closing provider', { provider: provider.name, error: e });
      }
    }
  }

  private createProvider(cfg: MailProviderConfigEntry): MailProvider {
    switch (cfg.provider) {
      case 'resend': {
        if (!cfg.resend) throw new Error(`Resend config required for provider "${cfg.name}"`);
        return new ResendMailProvider(cfg.name, cfg.resend, cfg.fromEmail, cfg.fromName);
      }
      case 'brevo': {
        if (!cfg.brevo) throw new Error(`Brevo config required for provider "${cfg.name}"`);
        return new BrevoMailProvider(cfg.name, cfg.brevo, cfg.fromEmail, cfg.fromName);
      }
      case 'smtp': {
        if (!cfg.smtp) throw new Error(`SMTP config required for provider "${cfg.name}"`);
        return new SmtpMailProvider(cfg.name, cfg.smtp, cfg.fromEmail, cfg.fromName);
      }
      case 'custom': {
        if (!cfg.custom) throw new Error(`Custom MailProvider required for provider "${cfg.name}"`);
        return new CustomMailProvider(cfg.name, cfg.custom);
      }
      default:
        throw new Error(`Unknown provider type: ${(cfg as any).provider}`);
    }
  }

  private getCacheDriver(app: Application): MailCacheDriver | null {
    try {
      if (ComponentManager.hasPlugin('cache')) {
        return ComponentManager.getPlugin<any>('cache');
      }
    } catch {
      // no cache available
    }
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

- [ ] **Step 2: Update barrel `src/index.ts`**

```ts
export { MailPlugin, MAIL_GLOBAL_KEY } from './plugin';
export type { MailPluginOptions, MailProviderConfigEntry, MailProviderSendOptions } from './plugin';
export type { MailProvider, SendMailOptions, SendMailResult, Attachment } from './types';
export { MailQuotaExceededError } from './types';
```

- [ ] **Step 3: Verify typecheck**

Run: `cd packages/honest-plugins/mail && npx tsc --noEmit`
Expected: Pass.

- [ ] **Step 4: Commit**

```bash
git add packages/honest-plugins/mail/src/plugin.ts packages/honest-plugins/mail/src/index.ts
git commit -m "feat(mail): add MailPlugin with provider lifecycle, health check, rate limiting"
```

---

### Task 8: Remove old mail plugin from honest core

**Files:**
- Delete: `packages/honest/src/plugins/mail/` (entire directory)
- Modify: `packages/honest/src/plugins/index.ts`

- [ ] **Step 1: Remove mail export from `plugins/index.ts`**

Current:
```ts
export * from './api-doc';
export * from './s3';
export * from './mail';
```

After:
```ts
export * from './api-doc';
export * from './s3';
```

- [ ] **Step 2: Delete old mail plugin directory**

Run: `rm -rf packages/honest/src/plugins/mail`

- [ ] **Step 3: Verify typecheck for honest package**

Run: `cd packages/honest && npx tsc --noEmit`
Expected: Pass (no more mail imports).

- [ ] **Step 4: Commit**

```bash
git rm -r packages/honest/src/plugins/mail
git add packages/honest/src/plugins/index.ts
git commit -m "refactor(honest): remove built-in mail plugin (extracted to packages/honest-plugins/mail)"
```

---

### Task 9: Verify full project typechecks and wrangler dev

- [ ] **Step 1: Install dependencies**

Run: `pnpm install`
Expected: Succeeds without errors.

- [ ] **Step 2: Typecheck the new mail plugin**

Run: `cd packages/honest-plugins/mail && npx tsc --noEmit`
Expected: Pass.

- [ ] **Step 3: Typecheck the honest package**

Run: `cd packages/honest && npx tsc --noEmit`
Expected: Pass.

- [ ] **Step 4: Typecheck the platform-api**

Run: `cd apps/platform-api && npx tsc --noEmit`
Expected: Pass (mail plugin is commented out, but imports of `MailPlugin` type from `@rx-ted/packages-honest` would now fail if any file still imports from there).

Check for any remaining imports of `MailPlugin` from `@rx-ted/packages-honest`:

Run: `rg -n "from '@rx-ted/packages-honest'" apps/platform-api/src | grep -i mail`
Expected: No matches. If any exist, they need to be updated to import from `@rx-ted/packages-honest-plugins-mail` instead.

- [ ] **Step 5: Run wrangler dev**

Run: `cd /app && timeout 20 pnpm wrangler dev`
Expected: Starts successfully on `http://localhost:8787`.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: update workspace deps and finalize mail plugin extraction"
```
