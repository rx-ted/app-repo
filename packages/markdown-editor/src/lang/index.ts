import zhCN from './zh-CN';
import type { MessageSchema } from './zh-CN';
import en from './en';

export type { MessageSchema } from './zh-CN';
export type { EnMessageSchema } from './en';

export type Locale = 'zh-CN' | 'en';

type MessageTable = Record<string, string>;

const BUILTIN: Record<string, MessageTable> = { 'zh-CN': zhCN, en };
const CUSTOM: Record<string, MessageTable> = {};

export interface I18nOptions {
  locale?: Locale;
  messages?: Partial<MessageSchema>;
}

const DEFAULT_LOCALE: Locale = 'zh-CN';

/**
 * Resolve strategy: overrides → current locale → zh-CN → the key itself.
 */
export function createI18n(options: I18nOptions = {}) {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const table: MessageTable = {
    ...(BUILTIN[DEFAULT_LOCALE] ?? {}),
    ...(locale !== DEFAULT_LOCALE ? (BUILTIN[locale] ?? {}) : {}),
    ...(CUSTOM[locale] ?? {}),
    ...options.messages,
  };
  function t(key: string): string {
    return table[key] ?? key;
  }
  return { locale, t };
}

export function registerLocale(locale: string, dict: MessageTable): void {
  CUSTOM[locale] = { ...CUSTOM[locale], ...dict };
}
