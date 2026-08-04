import type { EditorSavePayload } from '../BlogEditorSaveDialog.vue';
import type { EditorTheme } from '../../core/themes';
import type { Locale, MessageSchema } from '../../lang';

export interface BlogEditorProps {
  modelValue: string;
  loading?: boolean;
  isEdit?: boolean;
  tagOptions: { label: string; value: number }[];
  categoryOptions: { label: string; value: number }[];
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
}
