<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useLayoutStore } from '@/stores/layout';
import { useResponsive } from '@/composables/useResponsive';
import FullLayout from './FullLayout.vue';
import DocLayout from './DocLayout.vue';
import SimpleLayout from './SimpleLayout.vue';
import BlankLayout from './BlankLayout.vue';
import type { LayoutType } from '@/types/layout';

const route = useRoute();
const layoutStore = useLayoutStore();
const { forceNoAside } = useResponsive();

onMounted(() => {
  layoutStore.init();
});

const layoutType = computed<LayoutType>(() => {
  const meta = route.meta.layout;
  if (meta === 'full' || meta === 'doc' || meta === 'simple' || meta === 'blank') {
    return meta;
  }
  return 'full';
});

const layoutComponent = computed(() => {
  const map: Record<LayoutType, unknown> = {
    full: FullLayout,
    doc: DocLayout,
    simple: SimpleLayout,
    blank: BlankLayout,
  };
  return map[layoutType.value];
});
</script>

<template>
  <component :is="layoutComponent" :force-no-aside="forceNoAside">
    <router-view />
  </component>
</template>
