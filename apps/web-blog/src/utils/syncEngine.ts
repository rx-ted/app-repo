import type { MarkdownIndex } from './sourcemap';
import type { DomIndex } from './domIndex';

export enum SyncReason {
  None = 0,
  Render,
  Editor,
  Preview,
  Navigation,
  Follow,
}

export interface SyncConfig {
  textarea: HTMLTextAreaElement;
  previewScroll: HTMLElement;
  markdownIndex: MarkdownIndex;
  domIndex: DomIndex;
  endThreshold?: number;
  isTyping: () => boolean;
}

export class SyncEngine {
  reason: SyncReason = SyncReason.None;
  private cfg?: SyncConfig;

  get isSyncing(): boolean {
    return this.reason !== SyncReason.None;
  }

  get currentReason(): SyncReason {
    return this.reason;
  }

  setConfig(cfg: SyncConfig): void {
    this.cfg = cfg;
  }

  private guard(): boolean {
    return this.isSyncing || (this.cfg?.isTyping() ?? false);
  }

  follow(line: number): void {
    if (!this.cfg) return;
    const { markdownIndex, previewScroll, domIndex } = this.cfg;
    const node = markdownIndex.findByLine(line);
    if (!node) return;
    const el = domIndex.getElement(node.id);
    if (!el) return;
    const ratio =
      node.endLine > node.startLine ? (line - node.startLine) / (node.endLine - node.startLine) : 0;
    const elTop = el.offsetTop;
    const elHeight = el.offsetHeight;
    const containerHeight = previewScroll.clientHeight;
    this.reason = SyncReason.Follow;
    previewScroll.scrollTop = Math.max(0, elTop + elHeight * ratio - containerHeight * 0.15);
    requestAnimationFrame(() => {
      this.reason = SyncReason.None;
    });
  }

  followByOffset(offset: number): void {
    if (!this.cfg) return;
    const { markdownIndex, previewScroll, domIndex } = this.cfg;
    const node = markdownIndex.findByOffset(offset);
    if (!node) return;
    const el = domIndex.getElement(node.id);
    if (!el) return;
    const ratio =
      node.endOffset > node.startOffset
        ? (offset - node.startOffset) / (node.endOffset - node.startOffset)
        : 0;
    const elTop = el.offsetTop;
    const elHeight = el.offsetHeight;
    const containerHeight = previewScroll.clientHeight;
    this.reason = SyncReason.Follow;
    previewScroll.scrollTop = Math.max(0, elTop + elHeight * ratio - containerHeight * 0.15);
    requestAnimationFrame(() => {
      this.reason = SyncReason.None;
    });
  }

  navigate(nodeId: number): void {
    if (!this.cfg) return;
    const { domIndex } = this.cfg;
    const el = domIndex.getElement(nodeId);
    if (!el) return;
    this.reason = SyncReason.Navigation;
    el.scrollIntoView({ block: 'start', behavior: 'instant' });
    requestAnimationFrame(() => {
      this.reason = SyncReason.None;
    });
  }

  editorScroll(line: number): void {
    if (this.guard() || !this.cfg) return;
    const { markdownIndex, domIndex } = this.cfg;
    const node = markdownIndex.findByLine(line);
    if (!node) return;
    const el = domIndex.getElement(node.id);
    if (!el) return;
    this.reason = SyncReason.Editor;
    el.scrollIntoView({ block: 'start', behavior: 'instant' });
    requestAnimationFrame(() => {
      this.reason = SyncReason.None;
    });
  }

  editorClick(offset: number): void {
    if (this.isSyncing || !this.cfg) return;
    const { markdownIndex, domIndex } = this.cfg;
    const node = markdownIndex.findByOffset(offset);
    if (!node) return;
    const el = domIndex.getElement(node.id);
    if (!el) return;
    this.reason = SyncReason.Navigation;
    el.scrollIntoView({ block: 'start', behavior: 'instant' });
    requestAnimationFrame(() => {
      this.reason = SyncReason.None;
    });
  }

  previewScroll(): void {
    if (this.guard() || !this.cfg) return;
    const { previewScroll, domIndex, textarea, markdownIndex } = this.cfg;
    const closest = domIndex.findClosest(previewScroll.scrollTop);
    if (!closest) return;
    const node = markdownIndex.findByNodeId(closest.id);
    if (!node) return;
    const lh = parseFloat(getComputedStyle(textarea).lineHeight) || 23.8;
    this.reason = SyncReason.Preview;
    textarea.scrollTop = Math.max(0, (node.startLine - 1) * lh - 20);
    requestAnimationFrame(() => {
      this.reason = SyncReason.None;
    });
  }
}
