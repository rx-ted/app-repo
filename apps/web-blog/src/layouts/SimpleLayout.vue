<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useThemeTransition } from '@/theme/useTheme';
import { useLayoutStore } from '@/stores/layout';
import { CONTENT_COMPONENT_REGISTRY } from '@/config/component-registry';
import TopBar from './TopBar.vue';
import SearchModal from '@/components/SearchModal.vue';
import AnnouncementBar from '@/components/AnnouncementBar.vue';
import { useAppNotices } from '@/composables/useAppNotices';
import { normalizeComponents } from '@/theme/slot-utils';

const route = useRoute();
const layoutStore = useLayoutStore();
const searchModalRef = ref<InstanceType<typeof SearchModal> | null>(null);
const year = ref(new Date().getFullYear());

useThemeTransition();
const { show: showNotices } = useAppNotices();
onMounted(() => showNotices());

const regions = computed(() => route.meta.regions);
const isEditor = computed(() => route.path.startsWith('/editor'));

const showBefore = computed(() => {
  const cfg = regions.value?.content?.before;
  if (cfg?.show !== undefined) return cfg.show;
  if (cfg?.components !== undefined) return cfg.components.length > 0;
  return false;
});

const showAfter = computed(() => {
  const cfg = regions.value?.content?.after;
  if (cfg?.show !== undefined) return cfg.show;
  if (cfg?.components !== undefined) return cfg.components.length > 0;
  return false;
});

const beforeComponents = computed(() =>
  normalizeComponents(regions.value?.content?.before?.components)
    .map((cfg) => ({ cfg, entry: CONTENT_COMPONENT_REGISTRY[cfg.name] }))
    .filter((c) => c.entry),
);

const afterComponents = computed(() =>
  normalizeComponents(regions.value?.content?.after?.components)
    .map((cfg) => ({ cfg, entry: CONTENT_COMPONENT_REGISTRY[cfg.name] }))
    .filter((c) => c.entry),
);

function onSearchClick() {
  searchModalRef.value?.openSearch();
}
</script>

<template>
  <div class="simple-root" :class="{ 'simple-root--editor': isEditor }">
    <AnnouncementBar
      v-if="layoutStore.topPinned"
      id="site-maintenance"
      icon="tabler:alert-triangle"
      message="系统将于本周日凌晨 2:00-4:00 进行维护升级"
      :link="{ text: '详情', to: '/changelog' }"
      :closable="true"
    />
    <TopBar show-nav @search-click="onSearchClick" />

    <div class="simple-body" :class="{ 'simple-body--wide': isEditor }">
      <main class="simple-content" :class="{ 'simple-content--wide': isEditor }">
        <div v-if="showBefore" class="content-section content-before">
          <component :is="c.entry.component" v-for="c in beforeComponents" :key="c.cfg.name" />
        </div>
        <slot />
        <div v-if="showAfter" class="content-section content-after">
          <component :is="c.entry.component" v-for="c in afterComponents" :key="c.cfg.name" />
        </div>
      </main>
    </div>

    <footer class="simple-footer">
      <slot name="footer">
        <span>© {{ year }} Blog. All rights reserved.</span>
      </slot>
    </footer>

    <SearchModal ref="searchModalRef" />
  </div>
</template>

<style scoped>
.simple-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  /* min-height: 100vh; */
  min-height: 100dvh;
}

.simple-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
}

.simple-content {
  flex: 1;
  width: 90%;
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 0;
}

.simple-body--wide {
  overflow: hidden;
}

.simple-root--editor {
  /* height: 100vh; */
  height: 100dvh;
}

.simple-root--editor .simple-body {
  overflow: hidden;
}

.simple-root--editor .simple-footer {
  flex-shrink: 0;
}

.simple-content--wide {
  max-width: 1400px;
  width: 80%;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding-bottom: 0;
}

.simple-footer {
  border-top: 1px solid var(--app-border);
  padding: 16px 32px;
  text-align: center;
  font-size: 14px;
  color: var(--app-text-secondary);
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

@media (max-width: 767px) {
  .simple-content {
    width: 100%;
    padding: 16px;
  }
}
</style>
