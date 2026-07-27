<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useBlogStore } from '@/stores/blog';
import { usePostDetailStore } from '@/stores/postDetail';
import { NButton } from 'naive-ui';
import AppIcon from '@/components/AppIcon.vue';

const router = useRouter();
const blog = useBlogStore();
const postDetailStore = usePostDetailStore();
const { featured, latest } = storeToRefs(blog);

const maxVisible = 3;
const daySeed = Math.floor(Date.now() / 86400000);

const currentSlug = computed(() => postDetailStore.item?.slug);

const recommendations = computed(() => {
  const seen = new Set<string>();
  const pool = [...featured.value, ...latest.value].filter((item) => {
    if (!item.slug || item.slug === currentSlug.value) return false;
    if (seen.has(item.slug)) return false;
    seen.add(item.slug);
    return true;
  });

  if (!pool.length) return [];

  const sorted = [...pool].sort((a, b) => {
    const scoreA = (a.view_count ?? 0) + (a.like_count ?? 0);
    const scoreB = (b.view_count ?? 0) + (b.like_count ?? 0);
    const noiseA = 1 + ((hashCode(a.slug) ^ daySeed) % 100) / 100;
    const noiseB = 1 + ((hashCode(b.slug) ^ daySeed) % 100) / 100;
    return scoreB * noiseB - scoreA * noiseA;
  });

  return sorted.slice(0, maxVisible).map((r) => ({
    slug: r.slug,
    title: r.title,
    description: r.excerpt ?? '',
    views: r.view_count ?? 0,
  }));
});

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickRandom() {
  const all = [...featured.value, ...latest.value].filter(Boolean);
  if (!all.length) return;
  const slug = all[Math.floor(Math.random() * all.length)].slug;
  if (slug) router.push(`/posts/${slug}`);
}
</script>

<template>
  <div class="recommended">
    <div class="rec-header">
      <div class="header-left">
        <svg
          class="header-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <h4 class="widget-title">推荐阅读</h4>
      </div>
      <n-button text size="tiny" class="random-btn" @click="pickRandom">
        <AppIcon name="solar:shuffle-linear" :width="14" :height="14" />
        随机
      </n-button>
    </div>
    <ul class="rec-list">
      <li v-for="item in recommendations" :key="item.slug" class="rec-item">
        <router-link :to="`/posts/${item.slug}`" class="rec-link">
          <span class="rec-title">{{ item.title }}</span>
          <span v-if="item.description" class="rec-desc">{{ item.description }}</span>
        </router-link>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.recommended {
  padding: 16px 20px;
  background: var(--app-bg-container);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  box-shadow: var(--app-card-shadow);
}

.rec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-icon {
  color: var(--app-primary);
  flex-shrink: 0;
}

.widget-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text);
  margin: 0;
}

.random-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--app-text-tertiary) !important;
  font-size: 12px !important;
}

.random-btn:hover {
  color: var(--app-primary) !important;
}

.rec-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.rec-item {
  margin-bottom: 2px;
}

.rec-link {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-decoration: none;
  padding: 8px 10px;
  border-radius: 8px;
  transition: background 0.15s;
}

.rec-link:hover {
  border-color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 4%, transparent);
}

.rec-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--app-text);
}

.rec-desc {
  font-size: 12px;
  color: var(--app-text-secondary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
