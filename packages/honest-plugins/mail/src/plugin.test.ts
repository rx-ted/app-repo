import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetPlugin, mockGetPlugins, mockHasPlugin, mockRegisterPlugin } = vi.hoisted(() => ({
  mockGetPlugin: vi.fn(),
  mockGetPlugins: vi.fn(),
  mockHasPlugin: vi.fn(),
  mockRegisterPlugin: vi.fn(),
}));

vi.mock('@rx-ted/packages-honest', () => ({
  ComponentManager: {
    getPlugin: mockGetPlugin,
    getPlugins: mockGetPlugins,
    hasPlugin: mockHasPlugin,
    registerPlugin: mockRegisterPlugin,
  },
  resolvePluginLogger: vi.fn().mockReturnValue({
    child: vi.fn().mockReturnThis(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
  LOGGER_SYMBOL: Symbol('logger'),
}));

vi.mock('./providers/resend.provider', () => ({
  ResendMailProvider: class {
    readonly name: string;
    constructor(name: string) {
      this.name = name;
    }
    send = vi.fn().mockResolvedValue({ id: 'resend-id', provider: 'resend' });
    healthCheck = vi.fn().mockResolvedValue(true);
    close = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('./providers/brevo.provider', () => ({
  BrevoMailProvider: class {
    readonly name: string;
    constructor(name: string) {
      this.name = name;
    }
    send = vi.fn().mockResolvedValue({ id: 'brevo-id', provider: 'brevo' });
    healthCheck = vi.fn().mockResolvedValue(true);
    close = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('./providers/smtp.provider', () => ({
  SmtpMailProvider: class {
    readonly name: string;
    constructor(name: string) {
      this.name = name;
    }
    send = vi.fn().mockResolvedValue({ id: 'smtp-id', provider: 'smtp' });
    healthCheck = vi.fn().mockResolvedValue(true);
    close = vi.fn().mockResolvedValue(undefined);
  },
}));

import { MailPlugin, MAIL_DISABLED_MSG } from './plugin';
import { MailQuotaExceededError } from './types';

describe('MailPlugin', () => {
  const resendOptions = { apiKey: 're_test_key', fromEmail: 'test@example.com' };
  const brevoOptions = { apiKey: 'brevo_test_key', fromEmail: 'test@example.com' };
  const smtpOptions = {
    host: 'smtp.test.com',
    port: 465,
    user: 'user',
    pass: 'pass',
    fromEmail: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlugin.mockReturnValue(null);
    mockHasPlugin.mockReturnValue(false);
  });

  it('creates disabled MailPlugin with no options', () => {
    const plugin = new MailPlugin();
    expect(plugin).toBeInstanceOf(MailPlugin);
  });

  it('getClient returns undefined when disabled', () => {
    const plugin = new MailPlugin();
    expect(plugin.getClient()).toBeUndefined();
  });

  it('send throws when disabled', async () => {
    const plugin = new MailPlugin();
    await expect(
      plugin.send({ from: 'a@b.com', to: 'user@test.com', subject: 'Test' }),
    ).rejects.toThrow(MAIL_DISABLED_MSG);
  });

  it('healthCheck returns false when disabled', async () => {
    const plugin = new MailPlugin();
    const result = await plugin.healthCheck();
    expect(result).toBe(false);
  });

  it('beforeModulesRegistered registers all configured providers', async () => {
    const plugin = new MailPlugin({
      resend: resendOptions,
      brevo: brevoOptions,
      smtp: smtpOptions,
    });
    await plugin.beforeModulesRegistered({} as any, {} as any);

    expect(mockRegisterPlugin).toHaveBeenCalledWith('mail:resend', expect.any(Object));
    expect(mockRegisterPlugin).toHaveBeenCalledWith('mail:brevo', expect.any(Object));
    expect(mockRegisterPlugin).toHaveBeenCalledWith('mail:smtp', expect.any(Object));
    expect(mockRegisterPlugin).toHaveBeenCalledWith('app:mail', plugin);
  });

  it('getClient returns provider by name', async () => {
    const plugin = new MailPlugin({ resend: resendOptions, brevo: brevoOptions });
    await plugin.beforeModulesRegistered({} as any, {} as any);

    expect(plugin.getClient('resend')?.name).toBe('resend');
    expect(plugin.getClient('brevo')?.name).toBe('brevo');
    expect(plugin.getClient()).toBeDefined();
  });

  it('getClient returns undefined for unknown name', async () => {
    const plugin = new MailPlugin({ resend: resendOptions });
    await plugin.beforeModulesRegistered({} as any, {} as any);
    expect(plugin.getClient('nonexistent')).toBeUndefined();
  });

  it('send without providerName tries resend first', async () => {
    const plugin = new MailPlugin({
      resend: resendOptions,
      brevo: brevoOptions,
      smtp: smtpOptions,
    });
    await plugin.beforeModulesRegistered({} as any, {} as any);

    const result = await plugin.send({ to: 'user@test.com', subject: 'Test' });
    expect(result.id).toBe('resend-id');
  });

  it('send with providerName uses that specific provider', async () => {
    const plugin = new MailPlugin({
      resend: resendOptions,
      brevo: brevoOptions,
      smtp: smtpOptions,
    });
    await plugin.beforeModulesRegistered({} as any, {} as any);

    const result = await plugin.send({ to: 'user@test.com', subject: 'Test' }, 'smtp');
    expect(result.id).toBe('smtp-id');
  });

  it('send with unknown providerName throws', async () => {
    const plugin = new MailPlugin({ resend: resendOptions });
    await plugin.beforeModulesRegistered({} as any, {} as any);

    await expect(plugin.send({ to: 'user@test.com', subject: 'Test' }, 'nope')).rejects.toThrow(
      /unknown provider/i,
    );
  });

  it('send falls through to next provider when first fails', async () => {
    const plugin = new MailPlugin({ resend: resendOptions, smtp: smtpOptions });
    await plugin.beforeModulesRegistered({} as any, {} as any);

    const resendProvider = plugin.getClient('resend')!;
    vi.spyOn(resendProvider, 'send').mockRejectedValue(new Error('Resend down'));

    const result = await plugin.send({ to: 'user@test.com', subject: 'Test' });
    expect(result.id).toBe('smtp-id');
  });

  it('send throws when all providers fail', async () => {
    const plugin = new MailPlugin({ resend: resendOptions });
    await plugin.beforeModulesRegistered({} as any, {} as any);

    vi.spyOn(plugin.getClient('resend')!, 'send').mockRejectedValue(new Error('Down'));

    await expect(plugin.send({ to: 'user@test.com', subject: 'Test' })).rejects.toThrow(
      /All providers failed/,
    );
  });

  it('beforeModulesRegistered stays disabled when no config', async () => {
    const plugin = new MailPlugin({});
    await plugin.beforeModulesRegistered({} as any, {} as any);

    expect(plugin.getClient()).toBeUndefined();
    expect(mockRegisterPlugin).toHaveBeenCalledWith('app:mail', plugin);
  });

  it('healthCheck delegates to first provider', async () => {
    const plugin = new MailPlugin({ resend: resendOptions, smtp: smtpOptions });
    await plugin.beforeModulesRegistered({} as any, {} as any);

    const result = await plugin.healthCheck();
    expect(result).toBe(true);
  });

  it('close calls close on all providers', async () => {
    const plugin = new MailPlugin({ resend: resendOptions, brevo: brevoOptions });
    await plugin.beforeModulesRegistered({} as any, {} as any);

    await plugin.close();
  });

  it('MailQuotaExceededError can be thrown and caught', () => {
    const err = new MailQuotaExceededError('daily', 100);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(/daily/i);
    expect(err.name).toBe('MailQuotaExceededError');
  });
});
