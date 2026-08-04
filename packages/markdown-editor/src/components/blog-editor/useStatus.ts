import { computed, reactive } from 'vue';
import type { Ref } from 'vue';

/**
 * Status bar stats (chars/words/lines), the textarea cursor position and
 * timestamp formatting.
 */
export function useStatus(opts: {
  textareaRef: Ref<HTMLTextAreaElement | null>;
  currentValue: Ref<string>;
}) {
  const cursor = reactive({ row: 1, col: 1 });

  const stats = computed(() => {
    const text = opts.currentValue.value;
    return {
      chars: text.length,
      words: (text.match(/\S+/g) || []).length,
      lines: text ? text.split('\n').length : 0,
    };
  });

  function onTextareaCursor() {
    const ta = opts.textareaRef.value;
    if (!ta) return;
    const pos = ta.selectionStart;
    const upTo = opts.currentValue.value.slice(0, pos);
    const lineIdx = upTo.lastIndexOf('\n');
    cursor.col = pos - lineIdx;
    cursor.row = upTo.split('\n').length;
  }

  function formatTime(value: string | number): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  }

  return { cursor, stats, onTextareaCursor, formatTime };
}
