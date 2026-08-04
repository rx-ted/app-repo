import { computed } from 'vue';
import type { Ref } from 'vue';
import type { DropdownOption } from 'naive-ui';
import type { Locale } from '../../lang';

/**
 * Toolbar dropdown option lists (headings, languages) plus their select
 * handlers.
 */
export function useToolbarOptions(opts: {
  t: Ref<(key: string) => string>;
  insertBlock: (type: string) => void;
  localeRef: Ref<Locale>;
  onUpdateLocale: (value: Locale) => void;
}) {
  const headingOptions = computed<DropdownOption[]>(() => [
    { label: opts.t.value('editor.toolbar.h1'), key: 'h1' },
    { label: opts.t.value('editor.toolbar.h2'), key: 'h2' },
    { label: opts.t.value('editor.toolbar.h3'), key: 'h3' },
    { label: opts.t.value('editor.toolbar.h4'), key: 'h4' },
    { label: opts.t.value('editor.toolbar.h5'), key: 'h5' },
    { label: opts.t.value('editor.toolbar.h6'), key: 'h6' },
  ]);

  function onHeadingSelect(key: string | number) {
    const level = String(key);
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(level)) opts.insertBlock(level);
  }

  const languageOptions = computed<DropdownOption[]>(() => [
    { label: opts.t.value('editor.toolbar.language.zhCN'), key: 'zh-CN' },
    { label: opts.t.value('editor.toolbar.language.en'), key: 'en' },
  ]);

  function onLocaleSelect(key: string | number) {
    const value = key as Locale;
    opts.localeRef.value = value;
    opts.onUpdateLocale(value);
  }

  return { headingOptions, onHeadingSelect, languageOptions, onLocaleSelect };
}
