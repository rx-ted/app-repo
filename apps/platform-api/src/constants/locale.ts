export const LOCALE = {
  ZH_CN: 'zh-CN',
  EN: 'en',
  DEFAULT: 'zh-CN' as const,
} as const;

export const SUPPORTED_LOCALES = [LOCALE.ZH_CN, LOCALE.EN] as const;
