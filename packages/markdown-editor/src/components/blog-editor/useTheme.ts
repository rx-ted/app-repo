import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { Ref } from 'vue';
import {
  applyEditorTheme,
  CODE_THEMES,
  DEFAULT_PREVIEW_THEME,
  getEditorTheme,
  type EditorTheme,
} from '../../core/themes';

export interface ThemePickerProps {
  editorTheme?: EditorTheme;
  previewTheme?: string;
  codeTheme?: string;
}

/**
 * Active editor/preview/code themes, their update plumbing back to the parent
 * and the theme picker modal (draft selection + live preview).
 */
export function useTheme(opts: {
  editorGridRef: Ref<HTMLElement | null>;
  props: ThemePickerProps;
  onUpdateEditorTheme: (value: EditorTheme) => void;
  onUpdatePreviewTheme: (value: string) => void;
  onUpdateCodeTheme: (value: string | undefined) => void;
}) {
  const editorThemeRef = ref<EditorTheme>(opts.props.editorTheme ?? 'light');
  const previewThemeRef = ref<string>(opts.props.previewTheme ?? DEFAULT_PREVIEW_THEME);
  const codeThemeRef = ref<string | undefined>(opts.props.codeTheme);

  watch(
    () => opts.props.editorTheme,
    (v) => {
      if (v) editorThemeRef.value = v;
    },
  );
  watch(
    () => opts.props.previewTheme,
    (v) => {
      if (v) previewThemeRef.value = v;
    },
  );
  watch(
    () => opts.props.codeTheme,
    (v) => {
      codeThemeRef.value = v;
    },
  );
  watch(editorThemeRef, (v) => {
    opts.onUpdateEditorTheme(v);
    applyEditorThemeVars();
  });
  watch(previewThemeRef, (v) => opts.onUpdatePreviewTheme(v));
  watch(codeThemeRef, (v) => opts.onUpdateCodeTheme(v));

  const themeModalOpen = ref(false);
  const themeDraft = reactive<{ editor: EditorTheme; preview: string; code: string | undefined }>({
    editor: 'light',
    preview: DEFAULT_PREVIEW_THEME,
    code: undefined,
  });
  const codeThemeSearch = ref('');

  const editorThemeVarsStyle = computed(() => getEditorTheme(themeDraft.editor).vars);

  const filteredCodeThemes = computed(() => {
    const q = codeThemeSearch.value.trim().toLowerCase();
    return q ? CODE_THEMES.filter((id) => id.toLowerCase().includes(q)) : CODE_THEMES;
  });

  function openThemeModal() {
    themeDraft.editor = editorThemeRef.value;
    themeDraft.preview = previewThemeRef.value;
    themeDraft.code = codeThemeRef.value;
    codeThemeSearch.value = '';
    themeModalOpen.value = true;
  }

  function applyThemeDraft() {
    editorThemeRef.value = themeDraft.editor;
    previewThemeRef.value = themeDraft.preview;
    codeThemeRef.value = themeDraft.code;
    themeModalOpen.value = false;
  }

  function applyEditorThemeVars() {
    if (!opts.editorGridRef.value) return;
    applyEditorTheme(opts.editorGridRef.value, getEditorTheme(editorThemeRef.value));
    opts.editorGridRef.value.style.colorScheme = editorThemeRef.value;
  }

  onMounted(applyEditorThemeVars);

  return {
    editorThemeRef,
    previewThemeRef,
    codeThemeRef,
    themeModalOpen,
    themeDraft,
    codeThemeSearch,
    editorThemeVarsStyle,
    filteredCodeThemes,
    openThemeModal,
    applyThemeDraft,
    applyEditorThemeVars,
  };
}
