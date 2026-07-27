<template>
  <nav class="breadcrumb" aria-label="面包屑导航">
    <router-link to="/" class="bc-link">首页</router-link>
    <span class="bc-sep">/</span>
    <router-link to="/posts" class="bc-link">{{ category }}</router-link>
    <span class="bc-sep">/</span>
    <span class="bc-current">{{ current }}</span>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePostDetailStore } from '@/stores/postDetail';

const postDetailStore = usePostDetailStore();

const category = computed(() => postDetailStore.item?.categories?.[0] ?? '...');
const current = computed(() => postDetailStore.item?.title ?? '...');
</script>

<style scoped>
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
  font-size: 13px;
  color: var(--app-text-secondary);
}

.bc-link {
  color: var(--app-text-secondary);
  text-decoration: none;
  transition: color 0.15s;
}

.bc-link:hover {
  color: var(--app-primary);
}

.bc-sep {
  color: var(--app-border);
  user-select: none;
}

.bc-current {
  color: var(--app-text);
  font-weight: 500;
}
</style>
