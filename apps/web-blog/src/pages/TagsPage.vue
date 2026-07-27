<template>
  <div class="tags-page">
    <div class="page-header">
      <h1 class="page-title">标签</h1>
      <p class="page-subtitle">全部标签 · {{ sortedTags.length }} 个标签</p>
    </div>

    <div v-if="tagsLoading" class="loading-state">加载中...</div>

    <div v-else class="tag-list">
      <div v-for="tag in topTags" :key="tag.id" class="tag-row" @click="goToTag(tag.name)">
        <div class="tag-info">
          <span class="tag-name">{{ tag.name }}</span>
          <span class="tag-count">{{ tag.postCount ?? 0 }}</span>
        </div>
        <div class="tag-bar-track">
          <div class="tag-bar-fill" :style="{ width: barWidth(tag) }" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBlogStore } from '@/stores/blog';
import { storeToRefs } from 'pinia';

const router = useRouter();
const blog = useBlogStore();
const { tagsList, tagsLoading } = storeToRefs(blog);

const sortedTags = computed(() =>
  [...tagsList.value].sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0)),
);

const topTags = computed(() => sortedTags.value.slice(0, 10));

const maxCount = computed(() => topTags.value[0]?.postCount ?? 1);

function barWidth(tag: { postCount?: number }): string {
  const pct = ((tag.postCount ?? 0) / maxCount.value) * 100;
  return `${Math.max(pct, 2)}%`;
}

onMounted(() => {
  if (!tagsList.value.length) {
    blog.fetchTags();
  }
});

function goToTag(name: string) {
  router.push(`/tags/${name.toLowerCase()}`);
}
</script>

<style scoped>
.tags-page {
  padding: 32px 0;
}

.page-header {
  margin-bottom: 28px;
}

.page-title {
  font-size: 26px;
  font-weight: 700;
  margin: 0;
}

.page-subtitle {
  font-size: 14px;
  color: var(--app-text-secondary);
  margin: 6px 0 0;
}

.loading-state {
  padding: 48px 0;
  text-align: center;
  color: var(--app-text-tertiary);
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tag-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.tag-row:hover {
  background: color-mix(in srgb, var(--app-primary) 5%, transparent);
}

.tag-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tag-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text);
}

.tag-count {
  font-size: 12px;
  color: var(--app-text-tertiary);
}

.tag-bar-track {
  height: 4px;
  border-radius: 2px;
  background: var(--app-border);
  overflow: hidden;
}

.tag-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(
    90deg,
    var(--app-primary),
    color-mix(in srgb, var(--app-primary) 60%, transparent)
  );
  transition: width 0.3s ease;
}
</style>
