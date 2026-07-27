<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
const router = useRouter();
const layoutStore = useLayoutStore();
const searchModalRef = ref<InstanceType<typeof SearchModal> | null>(null);
const year = ref(new Date().getFullYear());

const { show: showNotices } = useAppNotices();

onMounted(() => {
  showNotices();
});

const options = computed(() => layoutStore.docOptions);

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
const showTopAd = computed(() => !props.forceNoAside && options.value.showTopAd);
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
    .filter((cfg) => !rightNames.has(cfg.name))
    .map((cfg) => ({ cfg, entry: ASIDE_COMPONENT_REGISTRY[cfg.name] }))
    .filter((c) => c.entry);
});

const rightComponents = computed(() =>
  normalizeComponents(
    pickArr(regions.value?.aside?.right?.components, options.value.asideRightComponents),
  )
    .map((cfg) => ({ cfg, entry: ASIDE_COMPONENT_REGISTRY[cfg.name] }))
    .filter((c) => c.entry),
);

const beforeComponents = computed(() =>
  normalizeComponents(
    pickArr(
      regions.value?.content?.before?.components,
      options.value.beforeContentComponents ?? [],
    ),
  )
    .map((cfg) => ({ cfg, entry: CONTENT_COMPONENT_REGISTRY[cfg.name] }))
    .filter((c) => c.entry),
);

const afterComponents = computed(() =>
  normalizeComponents(
    pickArr(regions.value?.content?.after?.components, options.value.afterContentComponents ?? []),
  )
    .map((cfg) => ({ cfg, entry: CONTENT_COMPONENT_REGISTRY[cfg.name] }))
    .filter((c) => c.entry),
);

function onSearchClick() {
  searchModalRef.value?.openSearch();
}
</script>

<template>
  <div class="doc-root">
    <AnnouncementBar
      v-if="layoutStore.topPinned"
      id="site-maintenance"
      icon="tabler:alert-triangle"
      message="系统将于本周日凌晨 2:00-4:00 进行维护升级"
      :link="{ text: '详情', to: '/changelog' }"
      :closable="true"
    />
    <TopBar show-nav @search-click="onSearchClick" />

    <div class="doc-body">
      <div class="doc-layout-row">
        <aside v-if="showLeft" class="doc-aside doc-aside-left">
          <component :is="c.entry.component" v-for="c in leftComponents" :key="c.cfg.name" />
        </aside>

        <main class="doc-content">
          <component
            :is="ASIDE_COMPONENT_REGISTRY['ad-banner']?.component"
            v-if="showTopAd"
            key="top-ad"
          />
          <div v-if="showBefore" class="content-section content-before">
            <component :is="c.entry.component" v-for="c in beforeComponents" :key="c.cfg.name" />
          </div>
          <slot />
          <div v-if="showAfter" class="content-section content-after">
            <div v-for="c in afterComponents" :key="c.cfg.name" class="after-item">
              <component :is="c.entry.component" />
            </div>
          </div>
        </main>

        <aside v-if="showRight" class="doc-aside doc-aside-right">
          <component :is="c.entry.component" v-for="c in rightComponents" :key="c.cfg.name" />
        </aside>
      </div>
    </div>

    <footer class="doc-footer">
      <slot name="footer">
        <span>© {{ year }} Blog. All rights reserved.</span>
      </slot>
    </footer>

    <SearchModal ref="searchModalRef" />
  </div>
</template>

<style scoped>
.doc-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  /* min-height: 100vh; */
  min-height: 100dvh;
}

.doc-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  position: relative; /* anchor for offsetParent chain used by TocTree scroll */
}

.doc-layout-row {
  display: flex;
  flex: 1;
  width: 90%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px 0;
  gap: 24px;
}

.doc-content {
  flex: 1;
  max-width: 860px;
  margin: 0 auto;
  padding: 0 32px;
}

.doc-aside {
  width: 20%;
  flex-shrink: 0;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.doc-aside-left {
  order: -1;
}

.doc-aside-right {
  order: 1;
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

.after-item {
  margin-bottom: 20px;
}

.after-item:last-child {
  margin-bottom: 0;
}

.doc-footer {
  border-top: 1px solid var(--app-border);
  padding: 16px 32px;
  text-align: center;
  font-size: 14px;
  color: var(--app-text-secondary);
}

@media (max-width: 1024px) {
  .doc-aside-right {
    display: none;
  }
}

@media (max-width: 768px) {
  .doc-aside-left {
    display: none;
  }
  .doc-layout-row {
    width: 95%;
  }
}

@media (max-width: 767px) {
  .doc-content {
    padding: 0 16px;
  }
}

@media (max-width: 640px) {
  .doc-layout-row {
    width: 100%;
    padding: 16px 12px;
  }
}
</style>
