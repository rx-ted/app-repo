export class DomIndex {
  readonly elements = new Map<number, HTMLElement>();
  private sortedPositions: Array<{ id: number; offsetTop: number }> = [];
  private observer: ResizeObserver | null = null;
  private rootEl: HTMLElement | null = null;

  constructor(elements: Map<number, HTMLElement>) {
    this.elements = elements;
  }

  buildPositions(root: HTMLElement): void {
    this.rootEl = root;
    this.sortedPositions = [];
    for (const [id] of this.elements) {
      const el = root.querySelector<HTMLElement>(`[data-node="${id}"]`);
      if (el) {
        this.elements.set(id, el);
        this.sortedPositions.push({ id, offsetTop: el.offsetTop });
      }
    }
    this.sortedPositions.sort((a, b) => a.offsetTop - b.offsetTop);
    this.observe();
  }

  private observe(): void {
    this.destroy();
    if (!this.rootEl) return;
    this.observer = new ResizeObserver(() => {
      this.rebuild();
    });
    this.observer.observe(this.rootEl);
  }

  private rebuild(): void {
    for (const entry of this.sortedPositions) {
      const el = this.elements.get(entry.id);
      if (el) entry.offsetTop = el.offsetTop;
    }
    this.sortedPositions.sort((a, b) => a.offsetTop - b.offsetTop);
  }

  updatePosition(id: number): void {
    const el = this.elements.get(id);
    if (!el) return;
    const entry = this.sortedPositions.find((p) => p.id === id);
    if (entry) entry.offsetTop = el.offsetTop;
  }

  findClosest(scrollTop: number): { id: number; element: HTMLElement } | undefined {
    const arr = this.sortedPositions;
    if (arr.length === 0) return undefined;
    let lo = 0,
      hi = arr.length - 1,
      idx = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid].offsetTop <= scrollTop) {
        idx = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (idx === -1) {
      const first = arr[0];
      return { id: first.id, element: this.elements.get(first.id)! };
    }
    let best = idx;
    if (idx + 1 < arr.length) {
      const distCurr = scrollTop - arr[idx].offsetTop;
      const distNext = arr[idx + 1].offsetTop - scrollTop;
      if (distNext < distCurr) best = idx + 1;
    }
    const entry = arr[best];
    return { id: entry.id, element: this.elements.get(entry.id)! };
  }

  getElement(id: number): HTMLElement | undefined {
    return this.elements.get(id);
  }

  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
