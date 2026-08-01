import { describe, it, expect } from 'vitest';
import { createI18n, registerLocale, type Locale } from './index';
import zhCN from './zh-CN';
import en from './en';

describe('i18n', () => {
  it('defaults to zh-CN', () => {
    const { locale, t } = createI18n();
    expect(locale).toBe('zh-CN');
    expect(t('saveArticle')).toBe('保存文章');
  });

  it('switches to en', () => {
    const { t } = createI18n({ locale: 'en' });
    expect(t('saveArticle')).toBe('Save Article');
  });

  it('falls back to zh-CN for keys missing in a registered locale', () => {
    registerLocale('fr' as Locale, { cancel: 'Annuler' });
    const { t } = createI18n({ locale: 'fr' as Locale });
    expect(t('cancel')).toBe('Annuler');
    expect(t('title')).toBe('标题');
  });

  it('overrides messages per locale', () => {
    const { t } = createI18n({ locale: 'zh-CN', messages: { saveArticle: '自定义' } });
    expect(t('saveArticle')).toBe('自定义');
  });

  it('returns the key when unknown', () => {
    const { t } = createI18n();
    expect(t('nope')).toBe('nope');
  });

  it('zh-CN and en export the same key set', () => {
    const enKeys = Object.keys(en).sort();
    const zhKeys = Object.keys(zhCN).sort();
    expect(enKeys).toEqual(zhKeys);
  });

  it('registerLocale adds an extensible locale', () => {
    registerLocale('ja' as Locale, { saveArticle: '保存する' });
    const { t } = createI18n({ locale: 'ja' as Locale });
    expect(t('saveArticle')).toBe('保存する');
  });
});
