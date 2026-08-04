import { onBeforeUnmount, onMounted, watch } from 'vue';
import type { Ref } from 'vue';
import type MarkdownEditorSaveDialog from '../MarkdownEditorSaveDialog.vue';
import type { EditorSavePayload } from '../MarkdownEditorSaveDialog.vue';
import type { MarkdownEditorProps } from './props';

/**
 * Save flow: Ctrl/Cmd+S, save-file vs save-dialog modes, the debounced draft
 * autosave to localStorage, draft restore on mount and the save on unload.
 */
export function useSave(opts: {
  props: MarkdownEditorProps;
  currentValue: Ref<string>;
  emitValue: (value: string) => void;
  dirty: Ref<boolean>;
  t: Ref<(key: string) => string>;
  dialogRef: Ref<InstanceType<typeof MarkdownEditorSaveDialog> | undefined>;
  emitSave: (payload: EditorSavePayload) => void;
  emitSaveFile: (content: string) => void;
}) {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const draftStorageKey = opts.props.draftStorageKey ?? 'editor:draft';

  watch(opts.currentValue, () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem(draftStorageKey, opts.currentValue.value);
    }, 2000);
  });

  function saveBeforeUnload() {
    localStorage.setItem(draftStorageKey, opts.currentValue.value);
  }

  function onKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      requestSave();
    }
  }

  async function requestSave() {
    try {
      await opts.props.onBeforeSave?.(opts.currentValue.value);
    } catch (cause) {
      console.error('[MarkdownEditor] onBeforeSave aborted save', cause);
      return;
    }
    if (opts.props.saveMode === 'dialog') {
      opts.dialogRef.value?.open(opts.currentValue.value, {
        ...opts.props.initialMeta,
      });
      return;
    }
    opts.emitSaveFile(opts.currentValue.value);
  }

  onMounted(() => {
    const saved = localStorage.getItem(draftStorageKey);
    if (saved && saved !== opts.props.modelValue && !opts.props.isEdit) {
      if (opts.props.autoRestore || window.confirm(opts.t.value('editor.restoreDraft'))) {
        opts.emitValue(saved);
      } else {
        localStorage.removeItem(draftStorageKey);
      }
    }
  });

  watch(
    () => opts.props.loading,
    (newVal, oldVal) => {
      if (oldVal === true && newVal === false) {
        localStorage.removeItem(draftStorageKey);
        opts.dirty.value = false;
      }
    },
  );

  onBeforeUnmount(() => {
    saveBeforeUnload();
    if (saveTimer) clearTimeout(saveTimer);
  });

  return { requestSave, onKeydown };
}
