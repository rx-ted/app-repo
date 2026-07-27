<template>
  <div class="update-notice">
    <AppIcon name="solar:info-circle-linear" :width="16" :height="16" />
    <span>本文最后更新于 {{ lastUpdated }}，内容可能已过时。</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from '@/components/AppIcon.vue';
import { usePostDetailStore } from '@/stores/postDetail';

const postDetailStore = usePostDetailStore();

const lastUpdated = computed(() => {
  if (!postDetailStore.item?.updatedAt) return '...';
  return postDetailStore.item.updatedAt.slice(0, 10);
});
</script>

<style scoped>
.update-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--app-warning) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--app-warning) 30%, transparent);
  font-size: 13px;
  color: var(--app-warning);
  margin-bottom: 16px;
}
</style>
