import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { App } from '@/theme/app';
import { useData } from '@/theme/data';
import {
  FLOATING_WIDGET_STORAGE_KEY,
  FLOATING_DRAG_HINT_KEY,
  resolveFloatingModules,
} from '@/theme/floating';
import { useStorage } from '@/composables/useStorage';
import { NUMBERS } from '@/constants';

type PersistedFloatingState = {
  activeId?: string;
  dock?: App.FloatingWidgetDock;
  railOpen?: boolean;
  x?: number;
  y?: number;
};

const storage = useStorage();
const WIDGET_MARGIN = NUMBERS.WIDGET_MARGIN;
const HUB_SIZE = NUMBERS.HUB_SIZE;

function clampPosition(x: number, y: number) {
  const maxX = Math.max(WIDGET_MARGIN, window.innerWidth - HUB_SIZE - WIDGET_MARGIN);
  const maxY = Math.max(WIDGET_MARGIN, window.innerHeight - HUB_SIZE - WIDGET_MARGIN);

  return {
    x: Math.min(Math.max(x, WIDGET_MARGIN), maxX),
    y: Math.min(Math.max(y, WIDGET_MARGIN), maxY),
  };
}

function getDefaultPosition(dock: App.FloatingWidgetDock) {
  const x = dock === 'right' ? window.innerWidth - HUB_SIZE - WIDGET_MARGIN : WIDGET_MARGIN;
  const y = window.innerHeight - HUB_SIZE - 104;
  return clampPosition(x, y);
}

export function useFloatingWidgets() {
  const data = useData();
  const railOpen = ref(false);
  const panelOpen = ref(false);
  const dragging = ref(false);
  const showDragHint = ref(false);
  const pendingDrag = ref(false);
  const suppressNextToggle = ref(false);
  const position = ref({ x: WIDGET_MARGIN, y: WIDGET_MARGIN });
  const dock = ref<App.FloatingWidgetDock>('right');
  const activeId = ref('');
  const dragOffset = ref({ x: 0, y: 0 });
  const dragStartPoint = ref({ x: 0, y: 0 });
  const dragHintKey = FLOATING_DRAG_HINT_KEY;

  const widgetConfig = computed(() => data.value.floating ?? {});
  const modules = computed(() =>
    resolveFloatingModules(widgetConfig.value.modules).map((module) => ({
      ...module,
      enabled: module.enabled ?? true,
      accent: module.accent ?? 'primary',
    })),
  );

  const activeModule = computed(
    () => modules.value.find((module) => module.id === activeId.value) ?? modules.value[0],
  );

  const draggable = computed(() => widgetConfig.value.draggable !== false);
  const enabled = computed(() => widgetConfig.value.enabled !== false);
  const hoverToOpen = computed(() => widgetConfig.value.interactions?.hoverToOpen !== false);
  const autoCollapseOnLeave = computed(
    () => widgetConfig.value.interactions?.autoCollapseOnLeave !== false,
  );
  const secondaryCompact = computed(() => widgetConfig.value.secondary?.compact ?? 'auto');

  const persist = () => {
    const state: PersistedFloatingState = {
      railOpen: railOpen.value,
      activeId: activeId.value,
      x: position.value.x,
      y: position.value.y,
      dock: dock.value,
    };
    storage.set(FLOATING_WIDGET_STORAGE_KEY, state);
  };

  const acknowledgeDragHint = () => {
    showDragHint.value = false;
    storage.set(dragHintKey, true);
  };

  const restore = () => {
    const configuredDock = widgetConfig.value.position?.dock ?? 'right';
    dock.value = configuredDock;
    railOpen.value = widgetConfig.value.defaultOpen ?? false;
    panelOpen.value = false;
    activeId.value =
      modules.value.find((module) => module.pinned)?.id ?? modules.value[0]?.id ?? '';

    const defaultPosition = getDefaultPosition(configuredDock);
    position.value = defaultPosition;

    const parsed = storage.get<PersistedFloatingState | null>(FLOATING_WIDGET_STORAGE_KEY, null);
    if (!parsed) return;
    dock.value = parsed.dock ?? configuredDock;
    railOpen.value = parsed.railOpen ?? railOpen.value;
    panelOpen.value = false;
    activeId.value = parsed.activeId || activeId.value;
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      position.value = clampPosition(parsed.x, parsed.y);
    } else {
      position.value = getDefaultPosition(dock.value);
    }
  };

  const setActive = (id: string) => {
    activeId.value = id;
    railOpen.value = true;
    panelOpen.value = true;
  };

  const openRail = () => {
    railOpen.value = true;
  };

  const closePanel = () => {
    panelOpen.value = false;
  };

  const closeAll = () => {
    railOpen.value = false;
    panelOpen.value = false;
  };

  const toggleRail = () => {
    railOpen.value = !railOpen.value;
    if (!railOpen.value) {
      panelOpen.value = false;
    }
  };

  const toggleDock = () => {
    dock.value = dock.value === 'right' ? 'left' : 'right';
    position.value = getDefaultPosition(dock.value);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (pendingDrag.value && !dragging.value) {
      const deltaX = Math.abs(event.clientX - dragStartPoint.value.x);
      const deltaY = Math.abs(event.clientY - dragStartPoint.value.y);
      if (deltaX < NUMBERS.WIDGET_DRAG_THRESHOLD && deltaY < NUMBERS.WIDGET_DRAG_THRESHOLD) return;
      dragging.value = true;
      suppressNextToggle.value = true;
    }

    if (!dragging.value) return;
    const next = clampPosition(
      event.clientX - dragOffset.value.x,
      event.clientY - dragOffset.value.y,
    );
    position.value = next;
    dock.value = next.x > window.innerWidth / 2 ? 'right' : 'left';
  };

  const stopDragging = () => {
    pendingDrag.value = false;
    dragging.value = false;
  };

  const startDragging = (event: PointerEvent) => {
    if (!draggable.value) return;
    acknowledgeDragHint();
    pendingDrag.value = true;
    dragStartPoint.value = {
      x: event.clientX,
      y: event.clientY,
    };
    dragOffset.value = {
      x: event.clientX - position.value.x,
      y: event.clientY - position.value.y,
    };
  };

  const consumeToggleGuard = () => {
    if (!suppressNextToggle.value) return true;
    suppressNextToggle.value = false;
    return false;
  };

  const handleResize = () => {
    position.value = clampPosition(position.value.x, position.value.y);
  };

  watch(
    modules,
    (nextModules) => {
      if (!nextModules.some((module) => module.id === activeId.value)) {
        activeId.value = nextModules[0]?.id ?? '';
      }
    },
    { immediate: true },
  );

  watch([railOpen, activeId, position, dock], persist, { deep: true });

  onMounted(() => {
    restore();
    showDragHint.value = !storage.get(dragHintKey, false);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('resize', handleResize);
  });

  onUnmounted(() => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopDragging);
    window.removeEventListener('resize', handleResize);
  });

  return {
    activeId,
    activeModule,
    autoCollapseOnLeave,
    closeAll,
    closePanel,
    dock,
    draggable,
    dragging,
    enabled,
    hoverToOpen,
    modules,
    panelOpen,
    position,
    railOpen,
    secondaryCompact,
    showDragHint,
    acknowledgeDragHint,
    consumeToggleGuard,
    openRail,
    setActive,
    startDragging,
    toggleDock,
    toggleRail,
  };
}
