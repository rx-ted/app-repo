import { ENV_SYMBOL, type Env, type ILogger } from '@rx-ted/packages-core';
import { ComponentManager, resolvePluginLogger } from '@rx-ted/packages-honest';
import type { Application, IPlugin } from '@rx-ted/packages-honest';
import type { SendMailOptions, SendMailResult } from './types';
import type { MailProvider } from './types';
import { RateLimiter, type MailCacheDriver } from './rate-limiter';
import { ResendMailProvider } from './providers/resend.provider';
import { BrevoMailProvider } from './providers/brevo.provider';
import { SmtpMailProvider } from './providers/smtp.provider';

export const MAIL_GLOBAL_KEY = 'app:mail';

export interface MailPluginOptions {
  resend?: {
    apiKey?: string;
    fromEmail?: string;
    fromName?: string;
    dailyQuota?: number;
  };
  brevo?: {
    apiKey?: string;
    fromEmail?: string;
    fromName?: string;
    dailyQuota?: number;
  };
  smtp?: {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    fromEmail?: string;
    fromName?: string;
    secure?: boolean;
    dailyQuota?: number;
  };
  fromEmail?: string;
  fromName?: string;
  healthCheck?: {
    enabled?: boolean;
    intervalMs?: number;
    maxRetries?: number;
    retryDelayMs?: number;
  };
  warmUpTimeout?: number;
  sendTimeout?: number;
}

export const MAIL_DISABLED_MSG =
  'Mail service is not configured. Configure resend, brevo, or smtp provider.';

export class MailPlugin implements IPlugin, MailProvider {
  readonly name = MAIL_GLOBAL_KEY;
  readonly version = '0.0.1';
  logger?: ILogger;

  private providers: MailProvider[] = [];
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private readonly options: MailPluginOptions;
  private failedProviders = new Set<string>();
  private isWarming = false;

  constructor(options: MailPluginOptions = {}) {
    this.options = options;
  }

  getClient(name?: string): MailProvider | undefined {
    if (name) return this.providers.find((p) => p.name === name);
    return this.providers[0];
  }

  async warmUp(): Promise<void> {
    if (this.isWarming) return;
    this.isWarming = true;

    const timeout = this.options.warmUpTimeout ?? 10_000;
    const relevant = this.providers.filter((p) => typeof p.warmUp === 'function');
    if (relevant.length === 0) {
      this.isWarming = false;
      return;
    }

    const results = await Promise.allSettled(
      relevant.map((p) =>
        (async () => {
          try {
            await Promise.race([
              p.warmUp!(),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Warm-up timeout')), timeout),
              ),
            ]);
            this.logger?.info('[mail] Provider warmed up', { provider: p.name });
          } catch (err) {
            this.failedProviders.add(p.name);
            this.logger?.warn('[mail] Provider warm-up failed or timed out', {
              provider: p.name,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        })(),
      ),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    this.logger?.info('[mail] Warm-up completed', { total: relevant.length, succeeded });
    this.isWarming = false;
  }

  async send(options: SendMailOptions, providerName?: string): Promise<SendMailResult> {
    if (this.providers.length === 0) {
      throw new Error(MAIL_DISABLED_MSG);
    }

    if (providerName) {
      const provider = this.providers.find((p) => p.name === providerName);
      if (!provider) throw new Error(`Unknown provider "${providerName}"`);
      if (this.failedProviders.has(providerName)) {
        throw new Error(`Provider "${providerName}" unavailable (warm-up failed)`);
      }
      const limiter = this.rateLimiters.get(providerName);
      if (limiter) await limiter.checkAndIncrement();
      return provider.send(options);
    }

    const errors: Error[] = [];
    for (const provider of this.providers) {
      if (this.failedProviders.has(provider.name)) continue;
      try {
        const limiter = this.rateLimiters.get(provider.name);
        if (limiter) await limiter.checkAndIncrement();
        return await provider.send(options);
      } catch (err) {
        errors.push(err as Error);
        this.logger?.warn?.('Provider failed, trying next', {
          provider: provider.name,
          error: err,
        });
      }
    }
    throw new Error(`All providers failed: ${errors.map((e) => e.message).join('; ')}`);
  }

  healthCheck(): Promise<boolean> {
    if (this.providers.length === 0) return Promise.resolve(false);
    return this.providers[0].healthCheck();
  }

  private tryInitResend(
    cfg: NonNullable<MailPluginOptions['resend']>,
    cacheDrv: MailCacheDriver | null,
    appEnv: Env | undefined,
  ): void {
    const apiKey = cfg.apiKey ?? appEnv?.get('MAIL_RESEND_API_KEY');
    if (!apiKey) return;
    const fromEmail =
      cfg.fromEmail ??
      appEnv?.var('MAIL_RESEND_FROM_EMAIL', 'noreply@19981204.xyz') ??
      'noreply@19981204.xyz';
    const fromName = cfg.fromName ?? appEnv?.var('MAIL_RESEND_FROM_NAME', 'noreply') ?? 'noreply';
    this.providers.push(new ResendMailProvider('resend', { apiKey }, fromEmail, fromName));
    this.rateLimiters.set(
      'resend',
      new RateLimiter(cfg.dailyQuota ?? Infinity, 'resend', cacheDrv, this.logger),
    );
    this.logger?.info('Mail provider registered', { name: 'resend' });
  }

  private tryInitBrevo(
    cfg: NonNullable<MailPluginOptions['brevo']>,
    cacheDrv: MailCacheDriver | null,
    appEnv: Env | undefined,
  ): void {
    const apiKey = cfg.apiKey ?? appEnv?.get('MAIL_BREVO_API_KEY');
    if (!apiKey) return;
    const fromEmail =
      cfg.fromEmail ??
      appEnv?.var('MAIL_BREVO_FROM_EMAIL', 'noreply@19981204.xyz') ??
      'noreply@19981204.xyz';
    const fromName = cfg.fromName ?? appEnv?.var('MAIL_BREVO_FROM_NAME', 'noreply') ?? 'noreply';
    this.providers.push(new BrevoMailProvider('brevo', { apiKey }, fromEmail, fromName));
    this.rateLimiters.set(
      'brevo',
      new RateLimiter(cfg.dailyQuota ?? Infinity, 'brevo', cacheDrv, this.logger),
    );
    this.logger?.info('Mail provider registered', { name: 'brevo' });
  }

  private tryInitSmtp(
    cfg: NonNullable<MailPluginOptions['smtp']>,
    cacheDrv: MailCacheDriver | null,
    appEnv: Env | undefined,
  ): void {
    const host = cfg.host ?? appEnv?.get('MAIL_SMTP_HOST');
    const user = cfg.user ?? appEnv?.get('MAIL_SMTP_USER');
    const pass = cfg.pass ?? appEnv?.get('MAIL_SMTP_PASS');
    const port = cfg.port ?? appEnv?.get('MAIL_SMTP_PORT', 'number') ?? 587;
    if (!host || !user || !pass) return;
    const fromEmail = (cfg.fromEmail ?? appEnv?.var('MAIL_SMTP_FROM_EMAIL')) || user;
    const fromName = cfg.fromName ?? appEnv?.var('MAIL_SMTP_FROM_NAME', 'rx-ted') ?? 'rx-ted';
    this.providers.push(
      new SmtpMailProvider(
        'smtp',
        { host, port, user, pass, secure: cfg.secure },
        fromEmail,
        fromName,
      ),
    );
    this.rateLimiters.set(
      'smtp',
      new RateLimiter(cfg.dailyQuota ?? Infinity, 'smtp', cacheDrv, this.logger),
    );
    this.logger?.info('Mail provider registered', { name: 'smtp' });
  }

  async beforeModulesRegistered(app: Application, _hono: unknown): Promise<void> {
    this.logger ??= resolvePluginLogger(this.name);
    const cacheDrv = this.getCacheDriver(app);
    const appEnv = this.getEnv();

    this.tryInitResend(this.options.resend ?? {}, cacheDrv, appEnv);
    this.tryInitBrevo(this.options.brevo ?? {}, cacheDrv, appEnv);
    this.tryInitSmtp(this.options.smtp ?? {}, cacheDrv, appEnv);

    if (this.providers.length === 0) {
      this.logger.warn(MAIL_DISABLED_MSG);
    } else {
      for (const p of this.providers) {
        ComponentManager.registerPlugin(`mail:${p.name}`, p);
      }
    }

    ComponentManager.registerPlugin(MAIL_GLOBAL_KEY, this);
  }

  async afterModulesRegistered(_app: Application, _hono: unknown): Promise<void> {
    if (this.providers.length === 0 || !this.logger) return;
    if (this.options.healthCheck?.enabled === false) {
      this.logger.info('Health check disabled by config');
      return;
    }
    this.logger.info('Health check deferred to background (will run via waitUntil)');
  }

  async runHealthChecks(): Promise<void> {
    if (this.providers.length === 0 || !this.logger) return;
    if (this.options.healthCheck?.enabled === false) return;

    const maxRetries = this.options.healthCheck?.maxRetries ?? 3;
    const retryDelay = this.options.healthCheck?.retryDelayMs ?? 1000;

    for (const provider of this.providers) {
      const limiter = this.rateLimiters.get(provider.name);
      if (!limiter) continue;
      const done = await limiter.wasHealthCheckDoneToday();
      if (done) {
        this.logger.info('Health check already done today', { provider: provider.name });
        continue;
      }
      let success = false;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        this.logger.info('Running health check', { provider: provider.name, attempt });
        success = await provider.healthCheck();
        if (success) break;
        if (attempt < maxRetries) await sleep(retryDelay);
      }
      if (success) {
        await limiter.markHealthCheckDone();
        this.logger.info('Health check passed', { provider: provider.name });
      } else {
        this.logger.warn('Health check failed after retries', {
          provider: provider.name,
          maxRetries,
        });
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

  private getCacheDriver(_app: Application): MailCacheDriver | null {
    try {
      if (ComponentManager.hasPlugin('cache')) {
        return ComponentManager.getPlugin<MailCacheDriver>('cache');
      }
    } catch {
      return null;
    }
    return null;
  }

  private getEnv(): Env | undefined {
    try {
      if (ComponentManager.hasPlugin(ENV_SYMBOL)) {
        return ComponentManager.getPlugin<Env>(ENV_SYMBOL);
      }
    } catch {
      return undefined;
    }
    return undefined;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
