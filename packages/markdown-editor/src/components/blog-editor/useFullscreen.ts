import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Ref } from 'vue';

/**
 * Window/screen fullscreen, the show/hide preview and preview-only toggles,
 * and the overlay teleport target used by dropdowns/popovers/modals so they
 * stay inside the editor grid during screen fullscreen.
 */
export function useFullscreen(opts: {
  editorGridRef: Ref<HTMLElement | null>;
  onPreviewLayoutChange: () => void;
}) {
  const showPreview = ref(true);
  const previewOnly = ref(false);
  const windowFullscreen = ref(false);
  const screenFullscreen = ref(false);
  const showToc = ref(false);

  const overlayTarget = computed<HTMLElement>(() => opts.editorGridRef.value ?? document.body);

  function toggleWindowFullscreen() {
    windowFullscreen.value = !windowFullscreen.value;
  }

  async function toggleScreenFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (opts.editorGridRef.value?.requestFullscreen) {
      await opts.editorGridRef.value.requestFullscreen();
    }
  }

  function onFullscreenChange() {
    screenFullscreen.value = Boolean(document.fullscreenElement);
  }

  function togglePreviewOnly() {
    previewOnly.value = !previewOnly.value;
    if (previewOnly.value) showPreview.value = true;
    nextTick(opts.onPreviewLayoutChange);
  }

  function toggleShowPreview() {
    if (previewOnly.value) return;
    showPreview.value = !showPreview.value;
  }

  function toggleToc() {
    showToc.value = !showToc.value;
  }

  watch(showPreview, () => {
    nextTick(opts.onPreviewLayoutChange);
  });

  onMounted(() => {
    document.addEventListener('fullscreenchange', onFullscreenChange);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', onFullscreenChange);
  });

  return {
    showPreview,
    previewOnly,
    windowFullscreen,
    screenFullscreen,
    showToc,
    overlayTarget,
    toggleWindowFullscreen,
    toggleScreenFullscreen,
    togglePreviewOnly,
    toggleShowPreview,
    toggleToc,
  };
}
