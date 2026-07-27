<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useThemeTransition } from '@/theme/useTheme';
import { useLayoutStore } from '@/stores/layout';
import { ASIDE_COMPONENT_REGISTRY, CONTENT_COMPONENT_REGISTRY } from '@/config/component-registry';
import TopBar from './TopBar.vue';
import SearchModal from '@/components/SearchModal.vue';
import AnnouncementBar from '@/components/AnnouncementBar.vue';
import { useAppNotices } from '@/composables/useAppNotices';
import { normalizeComponents } from '@/theme/slot-utils';
import type { ComponentConfig } from '@/theme/app';

const props = withDefaults(defineProps<{ forceNoAside?: boolean }>(), { forceNoAside: false });

const route = useRoute();
const layoutStore = useLayoutStore();
const searchModalRef = ref<InstanceType<typeof SearchModal> | null>(null);
const year = ref(new Date().getFullYear());

const hiddenComponents = ref(new Set<string>());

useThemeTransition();
const { show: showNotices } = useAppNotices();
onMounted(() => showNotices());

const options = computed(() => layoutStore.fullOptions);

function pickArr(
  override: (string | ComponentConfig)[] | undefined,
  fallback: string[],
): (string | ComponentConfig)[] {
  return override ?? fallback;
}

const regions = computed(() => route.meta.regions);

const showLeft = computed(() => {
  if (props.forceNoAside) return false;
  const cfg = regions.value?.aside?.left;
  if (cfg?.show !== undefined) return cfg.show;
  return options.value.showAsideLeft;
});

const showRight = computed(() => {
  if (props.forceNoAside) return false;
  const cfg = regions.value?.aside?.right;
  if (cfg?.show !== undefined) return cfg.show;
  return options.value.showAsideRight;
});

const showBefore = computed(() => {
  const cfg = regions.value?.content?.before;
  if (cfg?.show !== undefined) return cfg.show;
  if (cfg?.components !== undefined) return cfg.components.length > 0;
  return options.value.showBeforeContent;
});

const showAfter = computed(() => {
  const cfg = regions.value?.content?.after;
  if (cfg?.show !== undefined) return cfg.show;
  if (cfg?.components !== undefined) return cfg.components.length > 0;
  return options.value.showAfterContent;
});

const leftComponents = computed(() => {
  const left = normalizeComponents(
    pickArr(regions.value?.aside?.left?.components, options.value.asideLeftComponents),
  );
  const rightNames = new Set(
    normalizeComponents(
      pickArr(regions.value?.aside?.right?.components, options.value.asideRightComponents),
    ).map((c) => c.name),
  );
  return left
    .filter((cfg) => !rightNames.has(cfg.name) && !hiddenComponents.value.has(cfg.name))
    .map((cfg) => ({ cfg, entry: ASIDE_COMPONENT_REGISTRY[cfg.name] }))
    .filter((c) => c.entry);
});

const rightComponents = computed(() =>
  normalizeComponents(
    pickArr(regions.value?.aside?.right?.components, options.value.asideRightComponents),
  )
    .map((cfg) => ({ cfg, entry: ASIDE_COMPONENT_REGISTRY[cfg.name] }))
    .filter((c) => c.entry && !hiddenComponents.value.has(c.cfg.name)),
);

const beforeComponents = computed(() =>
  normalizeComponents(
    pickArr(
      regions.value?.content?.before?.components,
      options.value.beforeContentComponents ?? [],
    ),
  )
    .map((cfg) => ({ cfg, entry: CONTENT_COMPONENT_REGISTRY[cfg.name] }))
    .filter((c) => c.entry && !hiddenComponents.value.has(c.cfg.name)),
);

const afterComponents = computed(() =>
  normalizeComponents(
    pickArr(regions.value?.content?.after?.components, options.value.afterContentComponents ?? []),
  )
    .map((cfg) => ({ cfg, entry: CONTENT_COMPONENT_REGISTRY[cfg.name] }))
    .filter((c) => c.entry && !hiddenComponents.value.has(c.cfg.name)),
);

function onSearchClick() {
  searchModalRef.value?.openSearch();
}

function onComponentClose(name: string) {
  hiddenComponents.value = new Set(hiddenComponents.value).add(name);
}
</script>

<template>
  <div class="app-root">
    <AnnouncementBar
      v-if="layoutStore.topPinned"
      id="site-maintenance"
      icon="tabler:alert-triangle"
      message="系统将于本周日凌晨 2:00-4:00 进行维护升级"
      :link="{ text: '详情', to: '/changelog' }"
      :closable="true"
    />
    <TopBar show-nav @search-click="onSearchClick" />

    <div class="app-body-row">
      <div class="app-content">
        <div class="app-layout-row">
          <aside v-if="showLeft" class="app-aside app-aside-left">
            <div v-for="c in leftComponents" :key="c.cfg.name" class="slot-component-wrapper">
              <button
                v-if="c.cfg.closable"
                class="slot-component-close"
                @click="onComponentClose(c.cfg.name)"
              >
                ×
              </button>
              <component :is="c.entry.component" />
            </div>
          </aside>

          <main class="app-main">
            <div v-if="showBefore" class="content-section content-before">
              <div v-for="c in beforeComponents" :key="c.cfg.name" class="slot-component-wrapper">
                <button
                  v-if="c.cfg.closable"
                  class="slot-component-close"
                  @click="onComponentClose(c.cfg.name)"
                >
                  ×
                </button>
                <component :is="c.entry.component" />
              </div>
            </div>
            <slot />
            <div v-if="showAfter" class="content-section content-after">
              <div v-for="c in afterComponents" :key="c.cfg.name" class="slot-component-wrapper">
                <button
                  v-if="c.cfg.closable"
                  class="slot-component-close"
                  @click="onComponentClose(c.cfg.name)"
                >
                  ×
                </button>
                <component :is="c.entry.component" />
              </div>
            </div>
          </main>

          <aside v-if="showRight" class="app-aside app-aside-right">
            <div v-for="c in rightComponents" :key="c.cfg.name" class="slot-component-wrapper">
              <button
                v-if="c.cfg.closable"
                class="slot-component-close"
                @click="onComponentClose(c.cfg.name)"
              >
                ×
              </button>
              <component :is="c.entry.component" />
            </div>
          </aside>
        </div>
      </div>
    </div>

    <footer class="app-footer">
      <slot name="footer">
        <span>© {{ year }} Blog. All rights reserved.</span>
      </slot>
    </footer>

    <SearchModal ref="searchModalRef" />
  </div>
</template>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  /* min-height: 100vh; */
  min-height: 100dvh;
}

.app-body-row {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-y: auto;
  background: var(--app-bg);
}

.app-layout-row {
  display: flex;
  flex: 1;
  width: 90%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px 0;
  gap: 24px;
}

.app-main {
  flex: 1;
  min-width: 0;
}

.app-aside {
  width: 20%;
  flex-shrink: 0;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.app-aside-left {
  order: -1;
}

.content-section {
  width: 100%;
}

.content-before {
  margin-bottom: 24px;
}

.content-after {
  margin-top: 24px;
}

.app-footer {
  border-top: 1px solid var(--app-border);
  padding: 16px 32px;
  text-align: center;
  font-size: 14px;
  color: var(--app-text-secondary);
}

@media (max-width: 1024px) {
  .app-aside-right {
    display: none;
  }
}

@media (max-width: 768px) {
  .app-aside-left {
    display: none;
  }
  .app-layout-row {
    width: 95%;
  }
}

@media (max-width: 640px) {
  .app-layout-row {
    width: 100%;
    padding: 16px 12px;
  }
}

.slot-component-wrapper {
  position: relative;
}

.slot-component-close {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  opacity: 0.5;
  font-size: 16px;
  color: var(--app-text);
}

.slot-component-close:hover {
  opacity: 1;
}
</style>
