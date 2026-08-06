import type { EditorSavePayload } from '../MarkdownEditorSaveDialog.vue';
import type { EditorTheme } from '../../core/themes';
import type { MarkdownOverflowOptions } from '../../core/overflow';
import type { Locale, MessageSchema } from '../../lang';

export interface MarkdownEditorProps {
  modelValue: string;
  loading?: boolean;
  isEdit?: boolean;
  /** Kept for backwards compatibility; the title-only save dialog no longer uses them. */
  tagOptions?: { label: string; value: number }[];
  categoryOptions?: { label: string; value: number }[];
  initialMeta?: Partial<EditorSavePayload>;
  helpHref?: string;
  draftStorageKey?: string;
  autoRestore?: boolean;
  editorTheme?: EditorTheme;
  previewTheme?: string;
  codeTheme?: string;
  locale?: Locale;
  messages?: Partial<MessageSchema>;
  createdAt?: string | number | null;
  updatedAt?: string | number | null;
  uploadImage?: (file: File) => Promise<string>;
  saveMode?: 'file' | 'dialog';
  onBeforeSave?: (content: string) => void | Promise<void>;
  overflowOptions?: MarkdownOverflowOptions;
}
