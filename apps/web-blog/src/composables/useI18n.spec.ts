import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { messages } from '@/i18n/messages';

function mockBrowser(options?: { storedLocale?: string; browserLocale?: string }) {
  const state = new Map<string, string>();
  if (options?.storedLocale) {
    state.set('app:storage', JSON.stringify({ locale: options.storedLocale }));
  }

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => state.get(key) ?? null,
      setItem: (key: string, value: string) => {
        state.set(key, value);
      },
    },
  });

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      language: options?.browserLocale ?? 'zh-CN',
    },
  });

  const documentElement = { lang: '' };
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      documentElement,
      createElement: () => ({
        relList: {
          supports: () => false,
        },
      }),
      querySelector: () => null,
    },
  });

  return { state, documentElement };
}

describe('useI18n', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should prefer the stored locale', async () => {
    const { state, documentElement } = mockBrowser({
      storedLocale: 'en',
      browserLocale: 'zh-CN',
    });
    const { useI18n } = await import('./useI18n');

    const i18n = useI18n();

    expect(i18n.locale.value).toBe('en');
    expect(i18n.t('nav.home')).toBe(messages.en['nav.home']);

    i18n.setLocale('zh-CN');

    expect(JSON.parse(state.get('app:storage') || '{}').locale).toBe('zh-CN');
    expect(documentElement.lang).toBe('zh-CN');
  });

  it('should fall back to the browser locale and missing key name', async () => {
    mockBrowser({
      browserLocale: 'zh-CN',
    });
    const { useI18n } = await import('./useI18n');

    const i18n = useI18n();

    expect(i18n.locale.value).toBe('zh-CN');
    expect(i18n.t('missing.translation.key')).toBe('missing.translation.key');
  });
});
