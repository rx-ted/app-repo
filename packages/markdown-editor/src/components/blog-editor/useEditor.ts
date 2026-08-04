import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import type { Ref } from 'vue';
import { BLOCK_PREFIXES, END_THRESHOLD, HISTORY_LIMIT, INLINE_PAIRS } from './constants';

/**
 * Core editing state: the document value, undo/redo history and the low-level
 * insert primitives every toolbar feature builds on.
 */
export function useEditor(opts: {
  textareaRef: Ref<HTMLTextAreaElement | null>;
  modelValue: Ref<string>;
  emitUpdate: (value: string) => void;
}) {
  const { textareaRef, modelValue, emitUpdate } = opts;

  const currentValue = ref(modelValue.value);
  const isTyping = ref(false);
  const dirty = ref(false);
  const lastModifiedAt = ref<number | null>(null);

  let typingTimer: ReturnType<typeof setTimeout> | null = null;

  const historyPast = reactive<string[]>([]);
  const historyFuture = reactive<string[]>([]);

  const canUndo = computed(() => historyPast.length > 0);
  const canRedo = computed(() => historyFuture.length > 0);

  watch(modelValue, (v) => {
    currentValue.value = v;
    if (textareaRef.value && textareaRef.value.value !== v) {
      textareaRef.value.value = v;
    }
  });

  onMounted(() => {
    if (textareaRef.value && textareaRef.value.value !== currentValue.value) {
      textareaRef.value.value = currentValue.value;
    }
  });

  function emitValue(v: string) {
    if (v === currentValue.value) return;
    historyPast.push(currentValue.value);
    if (historyPast.length > HISTORY_LIMIT) historyPast.shift();
    historyFuture.length = 0;
    currentValue.value = v;
    emitUpdate(v);
  }

  function restoreValue(v: string) {
    currentValue.value = v;
    emitUpdate(v);
    nextTick(() => {
      const ta = textareaRef.value;
      if (ta) ta.value = v;
    });
  }

  function onInput(v: string) {
    isTyping.value = true;
    dirty.value = true;
    lastModifiedAt.value = Date.now();
    if (typingTimer) clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      isTyping.value = false;
    }, 500);
    emitValue(v);
  }

  function isEditorNearEnd(ta: HTMLTextAreaElement): boolean {
    const totalLines = currentValue.value.split('\n').length;
    const lh = parseFloat(getComputedStyle(ta).lineHeight) || 23.8;
    const currentLine = Math.floor(ta.scrollTop / lh) + 1;
    return totalLines - currentLine <= END_THRESHOLD;
  }

  function onUndo() {
    const prev = historyPast.pop();
    if (prev === undefined) return;
    historyFuture.push(currentValue.value);
    restoreValue(prev);
  }

  function onRedo() {
    const next = historyFuture.pop();
    if (next === undefined) return;
    historyPast.push(currentValue.value);
    restoreValue(next);
  }

  function insertBeforeAfter(before: string, after: string) {
    const ta = textareaRef.value;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = currentValue.value;
    const selected = text.slice(start, end);
    const replaced = before + selected + after;
    emitValue(text.slice(0, start) + replaced + text.slice(end));
    nextTick(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function insertAtCursor(text: string) {
    const ta = textareaRef.value;
    if (!ta) return;
    const start = ta.selectionStart;
    emitValue(currentValue.value.slice(0, start) + text + currentValue.value.slice(start));
    nextTick(() => ta.focus());
  }

  function insertInline(type: string) {
    const p = INLINE_PAIRS[type];
    if (p) insertBeforeAfter(p[0], p[1]);
  }

  function insertBlock(type: string) {
    const ta = textareaRef.value;
    if (!ta) return;
    const text = currentValue.value;
    const start = ta.selectionStart;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const after = text.slice(start);
    const line = text.slice(lineStart, start);

    const prefix = BLOCK_PREFIXES[type];
    if (prefix) {
      emitValue(text.slice(0, lineStart) + prefix + line + after);
    } else if (type === 'codeblock') {
      const insertion = '\n```\n\n```\n';
      emitValue(text.slice(0, start) + insertion + text.slice(start));
    } else if (type === 'hr') {
      emitValue(`${text.slice(0, start)}\n---\n${text.slice(start)}`);
    }
  }

  function insertTable(rows: number, cols: number) {
    const ta = textareaRef.value;
    if (!ta) return;
    const start = ta.selectionStart;
    const text = currentValue.value;
    const header = `| ${Array.from({ length: cols }, () => 'Header').join(' | ')} |\n`;
    const sep = `| ${Array.from({ length: cols }, () => '---').join(' | ')} |\n`;
    const body = Array.from(
      { length: rows - 1 },
      () => `| ${Array.from({ length: cols }, () => 'Cell').join(' | ')} |\n`,
    ).join('');
    const tbl = `\n${header}${sep}${body}\n`;
    emitValue(text.slice(0, start) + tbl + text.slice(start));
    nextTick(() => ta.focus());
  }

  function insertHeading(marker: string) {
    insertBeforeAfter(`${marker} `, '');
  }

  return {
    currentValue,
    isTyping,
    dirty,
    lastModifiedAt,
    canUndo,
    canRedo,
    emitValue,
    restoreValue,
    onInput,
    isEditorNearEnd,
    onUndo,
    onRedo,
    insertBeforeAfter,
    insertAtCursor,
    insertInline,
    insertBlock,
    insertTable,
    insertHeading,
  };
}

export type Editor = ReturnType<typeof useEditor>;
