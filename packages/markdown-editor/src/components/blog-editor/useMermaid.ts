import { computed } from 'vue';
import type { Ref } from 'vue';
import type { DropdownOption } from 'naive-ui';
import { MERMAID_TEMPLATES, MERMAID_TEMPLATE_KEYS } from './constants';

/** Mermaid dropdown: builds the template options and inserts the chosen one. */
export function useMermaid(opts: {
  t: Ref<(key: string) => string>;
  insertAtCursor: (text: string) => void;
}) {
  const mermaidOptions = computed<DropdownOption[]>(() =>
    MERMAID_TEMPLATE_KEYS.map((key) => ({
      label: opts.t.value(`editor.toolbar.mermaid.${key}`),
      key,
    })),
  );

  function onMermaidSelect(key: string | number) {
    const template = MERMAID_TEMPLATES[String(key)];
    if (!template) return;
    opts.insertAtCursor(`\`\`\`mermaid\n${template}\n\`\`\`\n`);
  }

  return { mermaidOptions, onMermaidSelect };
}
