<!-- TODO: Layout-2 is currently disabled. Keep this component for future use when both
     layouts are enabled with visual differentiation. See docs/superpowers/plans/ for context. -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useThemeTransition } from '@/theme/useTheme';
import TopBar from './TopBar.vue';
import SideBar from './SideBar.vue';
import SearchModal from '@/components/SearchModal.vue';
import AnnouncementBar from '@/components/AnnouncementBar.vue';
import { useAppNotices } from '@/composables/useAppNotices';

const siderCollapsed = ref(false);
const searchModalRef = ref<InstanceType<typeof SearchModal> | null>(null);

useThemeTransition();
const { show: showNotices } = useAppNotices();
onMounted(() => showNotices());

function onSearchClick() {
  searchModalRef.value?.openSearch();
}
</script>

<template>
  <div class="app-root">
    <AnnouncementBar
      id="site-maintenance"
      icon="tabler:alert-triangle"
      message="系统将于本周日凌晨 2:00-4:00 进行维护升级"
      :link="{ text: '详情', to: '/changelog' }"
    />
    <TopBar @search-click="onSearchClick" />
    <div class="app-body-row">
      <SideBar v-model:collapsed="siderCollapsed" />
      <div class="app-content">
        <main class="app-main">
          <slot />
        </main>
      </div>
    </div>
    <SearchModal ref="searchModalRef" />
  </div>
</template>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  /* height: 100vh; */
  height: 100dvh;
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

.app-main {
  flex: 1;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 32px;
}

@media (max-width: 767px) {
  .app-main {
    padding: 0 16px;
  }
}
</style>
