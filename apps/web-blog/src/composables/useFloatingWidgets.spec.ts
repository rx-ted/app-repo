import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NUMBERS } from '@/constants';

vi.mock('vue', async () => {
  const actual = await vi.importActual('vue');
  return {
    ...actual,
    onMounted: vi.fn((cb: () => void) => cb()),
    onUnmounted: vi.fn(),
  };
});

const mockData: { value: any } = {
  value: {
    floating: {
      enabled: true,
      draggable: true,
      modules: [
        { id: 'music', title: 'Music', icon: 'music-icon' },
        { id: 'notifications', title: 'Notifications', icon: 'bell-icon' },
      ],
      interactions: {},
      secondary: { compact: 'auto' },
    },
  },
};

vi.mock('@/theme/data', () => ({
  useData: () => mockData,
}));

describe('useFloatingWidgets', () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    vi.resetModules();
    storage = new Map();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
      },
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        innerWidth: 1024,
        innerHeight: 768,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('has correct default values for hub size and margin', () => {
    expect(NUMBERS.WIDGET_MARGIN).toBe(24);
    expect(NUMBERS.HUB_SIZE).toBe(64);
    expect(NUMBERS.WIDGET_DRAG_THRESHOLD).toBe(4);
  });

  it('restores dock from localStorage and falls back to config', async () => {
    storage.set(
      'app:storage',
      JSON.stringify({
        floatingWidget: {
          activeId: 'notifications',
          x: 100,
          y: 200,
          dock: 'left',
        },
      }),
    );

    const { useFloatingWidgets } = await import('./useFloatingWidgets');
    const { dock, railOpen } = useFloatingWidgets();

    expect(dock.value).toBe('left');
    expect(railOpen.value).toBe(false);
  });

  it('toggleDock switches between right and left', async () => {
    const { useFloatingWidgets } = await import('./useFloatingWidgets');
    const { dock, toggleDock } = useFloatingWidgets();

    expect(dock.value).toBe('right');
    toggleDock();
    expect(dock.value).toBe('left');
    toggleDock();
    expect(dock.value).toBe('right');
  });

  it('setActive sets activeId and opens rail and panel', async () => {
    const { useFloatingWidgets } = await import('./useFloatingWidgets');
    const { activeId, railOpen, panelOpen, setActive } = useFloatingWidgets();

    setActive('music');

    expect(activeId.value).toBe('music');
    expect(railOpen.value).toBe(true);
    expect(panelOpen.value).toBe(true);
  });

  it('toggleRail toggles rail and closes panel when closing', async () => {
    const { useFloatingWidgets } = await import('./useFloatingWidgets');
    const { railOpen, panelOpen, toggleRail, setActive } = useFloatingWidgets();

    setActive('music');
    expect(railOpen.value).toBe(true);

    toggleRail();
    expect(railOpen.value).toBe(false);
    expect(panelOpen.value).toBe(false);
  });

  it('closeAll closes rail and panel', async () => {
    const { useFloatingWidgets } = await import('./useFloatingWidgets');
    const { railOpen, panelOpen, closeAll, setActive } = useFloatingWidgets();

    setActive('music');
    expect(railOpen.value).toBe(true);
    expect(panelOpen.value).toBe(true);

    closeAll();
    expect(railOpen.value).toBe(false);
    expect(panelOpen.value).toBe(false);
  });

  it('startDragging sets pending drag and acknowledges hint', async () => {
    const { useFloatingWidgets } = await import('./useFloatingWidgets');
    const { startDragging, dragging, showDragHint } = useFloatingWidgets();

    const event = { clientX: 500, clientY: 400 } as PointerEvent;
    startDragging(event);

    expect(showDragHint.value).toBe(false);
    expect(dragging.value).toBe(false);
  });
});
