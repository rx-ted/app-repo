<template>
  <div class="tags-page">
    <div class="page-header">
      <h1 class="page-title">标签</h1>
      <p class="page-subtitle">全部标签 · {{ sortedTags.length }} 个标签</p>
    </div>

    <div v-if="tagsLoading" class="loading-state">加载中...</div>

    <div v-else class="tag-cloud">
      <span
        v-for="(tag, i) in sortedTags"
        :key="tag.id"
        class="tag"
        :style="tagStyle(i)"
        @click="goToTag(tag.name)"
      >
        {{ tag.name }}
        <span class="tag-count">{{ tag.postCount ?? 0 }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBlogStore } from '@/stores/blog';
import { storeToRefs } from 'pinia';
import { getColor } from '@/utils/colors';

const FONT_MIN = 12;
const FONT_MAX = 20;

const router = useRouter();
const blog = useBlogStore();
const { tagsList, tagsLoading } = storeToRefs(blog);

const sortedTags = computed(() =>
  [...tagsList.value].sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0)),
);

const maxCount = computed(() => sortedTags.value[0]?.postCount ?? 1);
const minCount = computed(() => sortedTags.value[sortedTags.value.length - 1]?.postCount ?? 0);

function fontSize(tag: { postCount?: number }): number {
  const count = tag.postCount ?? 0;
  if (maxCount.value === minCount.value) return (FONT_MIN + FONT_MAX) / 2;
  const ratio = (count - minCount.value) / (maxCount.value - minCount.value);
  return Math.round(FONT_MIN + ratio * (FONT_MAX - FONT_MIN));
}

function tagStyle(index: number) {
  const c = getColor(index);
  const tag = sortedTags.value[index];
  return {
    fontSize: `${fontSize(tag)}px`,
    color: c.solid,
    background: c.light,
    borderColor: c.lightBorder,
  };
}

onMounted(() => {
  if (!tagsList.value.length) {
    blog.fetchTags();
  }
});

function goToTag(name: string) {
  router.push(`/tags/${encodeURIComponent(name.toLowerCase())}`);
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

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  align-items: center;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 6px 16px;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1.5px solid;
  line-height: 1.4;
}

.tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  filter: brightness(1.08);
}

.tag-count {
  margin-left: 5px;
  font-size: 0.65em;
  font-weight: 400;
  opacity: 0.55;
}
</style>
