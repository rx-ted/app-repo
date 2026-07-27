<script setup lang="ts">
import { useFloatingWidgets } from '@/composables/useFloatingWidgets';
import AppIcon from '@/components/AppIcon.vue';

const {
  activeId,
  activeModule,
  modules,
  enabled,
  draggable,
  dragging,
  railOpen,
  panelOpen,
  position,
  setActive,
  toggleRail,
  closeAll,
  startDragging,
  consumeToggleGuard,
} = useFloatingWidgets();

function handleHubClick() {
  if (!consumeToggleGuard()) return;
  toggleRail();
}

function handleModuleClick(id: string) {
  if (activeId.value === id && panelOpen.value) {
    closeAll();
    return;
  }
  setActive(id);
}
</script>

<template>
  <div
    v-if="enabled"
    class="floating-widget-root"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
  >
    <Transition name="hub-rail">
      <div v-if="railOpen" class="hub-rail">
        <button
          v-for="m in modules"
          :key="m.id"
          class="hub-module-btn"
          :class="{ active: m.id === activeId && panelOpen }"
          :style="{ '--accent': `var(--app-${m.accent})` }"
          :title="m.title"
          @click="handleModuleClick(m.id)"
        >
          <AppIcon v-if="m.icon" :name="m.icon" :width="20" :height="20" />
          <span v-else class="module-letter">{{ m.title[0] }}</span>
          <span v-if="m.badge" class="module-badge">{{ m.badge }}</span>
        </button>
      </div>
    </Transition>

    <button
      class="hub-btn"
      :class="{ open: railOpen }"
      @pointerdown="startDragging"
      @click="handleHubClick"
      aria-label="Floating widgets"
    >
      <AppIcon name="solar:widget-5-linear" :width="22" :height="22" />
    </button>

    <Transition name="hub-panel">
      <div v-if="panelOpen && activeModule" class="hub-panel">
        <div class="panel-header">
          <AppIcon v-if="activeModule.icon" :name="activeModule.icon" :width="18" :height="18" />
          <span class="panel-title">{{ activeModule.title }}</span>
          <button class="panel-close" @click="closeAll" aria-label="Close">
            <AppIcon name="line-md:close" :width="16" :height="16" />
          </button>
        </div>
        <div class="panel-body">
          <p class="panel-placeholder">{{ activeModule.description }}</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.floating-widget-root {
  position: fixed;
  z-index: 200;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.hub-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid var(--app-border);
  background: var(--app-bg-elevated);
  color: var(--app-text-secondary);
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.hub-btn:hover {
  color: var(--app-primary);
  border-color: var(--app-primary);
  box-shadow: 0 6px 28px color-mix(in srgb, var(--app-primary) 15%, transparent);
}
.hub-btn:active {
  cursor: grabbing;
}
.hub-btn.open {
  color: var(--app-primary);
  border-color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 8%, var(--app-bg-elevated));
}

.hub-rail {
  display: flex;
  gap: 6px;
  padding: 6px;
  border-radius: 40px;
  background: var(--app-bg-elevated);
  border: 1px solid var(--app-border);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.hub-module-btn {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid transparent;
  background: transparent;
  color: var(--app-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s ease;
}
.hub-module-btn:hover {
  background: color-mix(in srgb, var(--accent, var(--app-primary)) 10%, transparent);
  color: var(--accent, var(--app-primary));
}
.hub-module-btn.active {
  background: color-mix(in srgb, var(--accent, var(--app-primary)) 14%, transparent);
  color: var(--accent, var(--app-primary));
  border-color: color-mix(in srgb, var(--accent, var(--app-primary)) 30%, transparent);
}

.module-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  background: var(--app-warning, #f59e0b);
  color: var(--app-text-inverse);
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.module-letter {
  font-size: 14px;
  font-weight: 600;
}

.hub-panel {
  position: absolute;
  top: 56px;
  left: 0;
  width: 260px;
  border-radius: 12px;
  background: var(--app-bg-elevated);
  border: 1px solid var(--app-border);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--app-border);
  color: var(--app-text-primary);
}
.panel-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
}
.panel-close {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--app-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.panel-close:hover {
  background: var(--app-bg-container);
  color: var(--app-text-primary);
}

.panel-body {
  padding: 14px;
}
.panel-placeholder {
  margin: 0;
  font-size: 13px;
  color: var(--app-text-secondary);
  line-height: 1.5;
}

.hub-rail-enter-active,
.hub-rail-leave-active {
  transition: all 0.2s ease;
}
.hub-rail-enter-from,
.hub-rail-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

.hub-panel-enter-active,
.hub-panel-leave-active {
  transition: all 0.2s ease;
}
.hub-panel-enter-from,
.hub-panel-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
