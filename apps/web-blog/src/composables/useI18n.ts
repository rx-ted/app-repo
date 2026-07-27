import { computed, ref } from 'vue';
import { messages } from '@/i18n/messages';
import { useStorage } from '@/composables/useStorage';
import type { App } from '@/theme/app';

const storage = useStorage();
const LOCALE_KEY = 'locale';

function resolveInitialLocale(): App.Locale {
  const stored = storage.get<string | null>(LOCALE_KEY, null);
  if (stored === 'zh-CN' || stored === 'en') return stored;

  const browserLocale = navigator.language.toLowerCase();
  return browserLocale.startsWith('zh') ? 'zh-CN' : 'en';
}

const locale = ref<App.Locale>(resolveInitialLocale());

function lookup(key: string, currentLocale: App.Locale) {
  return (messages[currentLocale] ?? messages['zh-CN'])?.[key] ?? key;
}

export function useI18n() {
  function setLocale(next: App.Locale) {
    locale.value = next;
    storage.set(LOCALE_KEY, next);
    document.documentElement.lang = next === 'zh-CN' ? 'zh-CN' : 'en';
  }

  type TranslationParams = Record<string, string | number>;

  function t(key: string, params?: TranslationParams, fallback?: string) {
    let msg = lookup(key, locale.value) || fallback || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        msg = msg.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return msg;
  }

  function text(value?: string | number | null, key?: string, fallback?: string) {
    if (key) return t(key, undefined, fallback ?? String(value ?? ''));
    return value == null ? (fallback ?? '') : String(value);
  }

  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale.value === 'zh-CN' ? 'zh-CN' : 'en';
  }

  return {
    locale: computed(() => locale.value),
    locales: computed(
      () =>
        [
          { value: 'zh-CN', label: t('locale.zh-CN') },
          { value: 'en', label: t('locale.en') },
        ] as Array<{ value: App.Locale; label: string }>,
    ),
    setLocale,
    t,
    text,
  };
}
