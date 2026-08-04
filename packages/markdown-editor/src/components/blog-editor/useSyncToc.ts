import { nextTick, onMounted, ref } from 'vue';
import type { Ref } from 'vue';
import type { ReadyPayload } from '../MarkdownRenderer.vue';
import { HeadingTree, MarkdownIndex } from '../../core/sourcemap';
import { DomIndex } from '../../core/domIndex';
import { SyncEngine, SyncReason } from '../../core/syncEngine';
import type { TocItem } from './constants';

/**
 * Scroll-sync between the textarea and the preview plus the floating TOC
 * panel that navigates both of them. Owns the renderer's ready payload and
 * builds the indexes used for bidirectional navigation.
 */
export function useSyncToc(opts: {
  textareaRef: Ref<HTMLTextAreaElement | null>;
  previewScrollRef: Ref<HTMLElement | null>;
  currentValue: Ref<string>;
  isTyping: () => boolean;
  isEditorNearEnd: (ta: HTMLTextAreaElement) => boolean;
}) {
  const syncEngine = new SyncEngine();
  const headingTree = ref<HeadingTree>();
  const markdownIndexRef = ref<MarkdownIndex>();
  const domIndexRef = ref<DomIndex>();

  const tocItems = ref<TocItem[]>([]);
  const activeTocId = ref<number | null>(null);

  function onReady(payload: ReadyPayload) {
    const elements = new Map<number, HTMLElement>();
    for (const el of payload.rootEl.querySelectorAll<HTMLElement>('[data-node]')) {
      const id = Number(el.getAttribute('data-node'));
      if (!Number.isNaN(id)) elements.set(id, el);
    }
    const mi = new MarkdownIndex(payload.nodes);
    const di = new DomIndex(elements);
    di.buildPositions(payload.rootEl);
    headingTree.value = new HeadingTree(payload.nodes);
    markdownIndexRef.value = mi;
    domIndexRef.value = di;
    syncToc();

    syncEngine.setConfig({
      textarea: opts.textareaRef.value!,
      previewScroll: opts.previewScrollRef.value!,
      markdownIndex: mi,
      domIndex: di,
      isTyping: opts.isTyping,
    });

    syncEngine.reason = SyncReason.Render;
    if (opts.isTyping() && opts.textareaRef.value && opts.previewScrollRef.value) {
      if (opts.isEditorNearEnd(opts.textareaRef.value)) {
        opts.previewScrollRef.value.scrollTop = opts.previewScrollRef.value.scrollHeight;
      } else {
        syncEngine.followByOffset(opts.textareaRef.value.selectionStart);
      }
    }
    requestAnimationFrame(() => {
      syncEngine.reason = SyncReason.None;
    });
  }

  function onEditorScroll() {
    if (syncEngine.isSyncing || opts.isTyping() || !opts.textareaRef.value) return;
    const ta = opts.textareaRef.value;
    const lh = parseFloat(getComputedStyle(ta).lineHeight) || 23.8;
    const line = Math.floor(ta.scrollTop / lh);
    syncEngine.editorScroll(line + 1);
  }

  function onEditorClick() {
    if (syncEngine.isSyncing || !opts.textareaRef.value) return;
    syncEngine.editorClick(opts.textareaRef.value.selectionStart);
    updateActiveToc();
  }

  function onPreviewScroll() {
    updateActiveToc();
    if (syncEngine.isSyncing || opts.isTyping()) return;
    syncEngine.previewScroll();
  }

  function syncToc() {
    const ht = headingTree.value;
    const mi = markdownIndexRef.value;
    if (!ht || !mi) {
      tocItems.value = [];
      return;
    }
    const text = opts.currentValue.value;
    tocItems.value = ht.all.map((h) => {
      const node = mi.nodes.get(h.id);
      const raw = node ? text.slice(node.startOffset, node.endOffset) : '';
      const clean = raw.replace(/^\s*#{1,6}\s*/, '').trim();
      return {
        id: h.id,
        text: clean || '(untitled)',
        depth: h.depth,
        startOffset: node?.startOffset ?? 0,
        startLine: node?.startLine ?? 0,
      };
    });
  }

  function updateActiveToc() {
    const preview = opts.previewScrollRef.value;
    const di = domIndexRef.value;
    if (!preview || !di) return;
    const scrollTop = preview.scrollTop;
    const containerTop = preview.getBoundingClientRect().top;
    let active: number | null = null;
    for (const item of tocItems.value) {
      const el = di.getElement(item.id);
      if (!el) continue;
      const top = el.getBoundingClientRect().top - containerTop + scrollTop;
      if (top <= scrollTop + 8) active = item.id;
      else break;
    }
    activeTocId.value = active;
  }

  function onTocClick(item: TocItem) {
    activeTocId.value = item.id;
    syncEngine.navigate(item.id);
    const ta = opts.textareaRef.value;
    if (ta) {
      ta.focus();
      ta.setSelectionRange(item.startOffset, item.startOffset);
      const lh = parseFloat(getComputedStyle(ta).lineHeight) || 23.8;
      ta.scrollTop = Math.max(0, (item.startLine - 1) * lh - 20);
    }
  }

  function attachScrollListeners() {
    if (opts.textareaRef.value) {
      opts.textareaRef.value.removeEventListener('scroll', onEditorScroll);
      opts.textareaRef.value.addEventListener('scroll', onEditorScroll, { passive: true });
    }
    if (opts.previewScrollRef.value) {
      opts.previewScrollRef.value.removeEventListener('scroll', onPreviewScroll);
      opts.previewScrollRef.value.addEventListener('scroll', onPreviewScroll, { passive: true });
    }
  }

  onMounted(() => {
    nextTick(attachScrollListeners);
  });

  return {
    syncEngine,
    headingTree,
    markdownIndexRef,
    domIndexRef,
    tocItems,
    activeTocId,
    onReady,
    onEditorScroll,
    onEditorClick,
    onPreviewScroll,
    onTocClick,
    attachScrollListeners,
  };
}
