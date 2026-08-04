import { computed, ref } from 'vue';
import type { Ref } from 'vue';
import type { DropdownOption } from 'naive-ui';

/** Image dropdown: insert inline image or upload a file via the hidden input. */
export function useImagePicker(opts: {
  t: Ref<(key: string) => string>;
  hasUploadImage: () => boolean;
  uploadImage?: (file: File) => Promise<string>;
  insertInline: (type: string) => void;
  insertBeforeAfter: (before: string, after: string) => void;
}) {
  const imageFileRef = ref<HTMLInputElement | null>(null);
  const uploading = ref(false);

  const imageOptions = computed<DropdownOption[]>(() => [
    { label: opts.t.value('editor.toolbar.insertImage'), key: 'insert' },
    {
      label: uploading.value
        ? opts.t.value('editor.imageUploading')
        : opts.t.value('editor.toolbar.uploadImage'),
      key: 'upload',
      disabled: !opts.hasUploadImage() || uploading.value,
    },
  ]);

  function onImageSelect(key: string | number) {
    if (key === 'insert') {
      opts.insertInline('image');
    } else if (key === 'upload') {
      imageFileRef.value?.click();
    }
  }

  async function onImageFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !opts.uploadImage) return;
    uploading.value = true;
    try {
      const url = await opts.uploadImage(file);
      const alt = file.name.replace(/\.[^.]+$/, '');
      opts.insertBeforeAfter(`![${alt}](${url})`, '');
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      uploading.value = false;
    }
  }

  return { imageFileRef, uploading, imageOptions, onImageSelect, onImageFileChange };
}
