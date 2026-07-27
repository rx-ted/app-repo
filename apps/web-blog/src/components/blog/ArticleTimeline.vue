<template>
  <div v-if="loading" class="loading-state">{{ loadingText }}</div>

  <div v-else-if="!articles.length" class="empty-state">{{ emptyText }}</div>

  <div v-else class="timeline" :style="{ '--tl-accent': accentColor }">
    <div
      v-for="article in articles"
      :key="article.id"
      class="timeline-item"
      @click="$emit('select', article.slug)"
    >
      <div class="tl-dot" />
      <div class="tl-content">
        <div class="tl-meta">
          <span class="tl-date">{{ formatDate(article.published_at ?? article.updated_at) }}</span>
          <span v-if="article.reading_time" class="tl-reading">{{ article.reading_time }} min</span>
        </div>
        <h3 class="tl-title">{{ article.title }}</h3>
        <p v-if="article.excerpt" class="tl-excerpt">{{ article.excerpt }}</p>
        <div v-if="showTags && article.tags?.length" class="tl-tags">
          <span
            v-for="t in article.tags"
            :key="t"
            class="tl-tag"
            :class="{ active: t === activeTag }"
            @click.stop="$emit('tag-click', t)"
            >{{ t }}</span
          >
        </div>
      </div>
    </div>
  </div>

  <div v-if="showLoadMore" class="load-more">
    <button class="load-more-btn" @click="$emit('load-more')">加载更多</button>
  </div>
</template>

<script setup lang="ts">
import type { BlogPostCardVO } from '@/types/blog';

defineProps<{
  articles: BlogPostCardVO[];
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  showLoadMore?: boolean;
  showTags?: boolean;
  activeTag?: string;
  accentColor?: string;
}>();

defineEmits<{
  'load-more': [];
  select: [slug: string];
  'tag-click': [name: string];
}>();

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
</script>

<style scoped>
.loading-state,
.empty-state {
  padding: 80px 0;
  text-align: center;
  color: var(--app-text-tertiary);
}
.timeline {
  position: relative;
  padding-left: 24px;
}
.timeline::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 7px;
  width: 2px;
  background: var(--app-border);
}
.timeline-item {
  position: relative;
  padding: 16px 20px;
  margin-bottom: 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.timeline-item:hover {
  background: color-mix(in srgb, var(--tl-accent, var(--app-primary)) 4%, transparent);
}
.tl-dot {
  position: absolute;
  left: -20px;
  top: 22px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--tl-accent, var(--app-primary));
  border: 3px solid var(--app-bg);
}
.tl-content {
  min-width: 0;
}
.tl-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.tl-date {
  font-size: 12px;
  color: var(--app-text-tertiary);
}
.tl-reading {
  font-size: 11px;
  color: var(--app-text-quaternary);
}
.tl-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px;
  color: var(--app-text);
}
.tl-excerpt {
  font-size: 13px;
  color: var(--app-text-secondary);
  margin: 0 0 8px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tl-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tl-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--tl-accent, var(--app-primary)) 8%, transparent);
  color: var(--tl-accent, var(--app-primary));
  cursor: pointer;
  transition: background 0.15s;
}
.tl-tag:hover {
  background: color-mix(in srgb, var(--tl-accent, var(--app-primary)) 18%, transparent);
}
.tl-tag.active {
  background: var(--tl-accent, var(--app-primary));
  color: #fff;
}
.load-more {
  text-align: center;
  padding: 24px 0;
}
.load-more-btn {
  padding: 8px 24px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-bg-container);
  color: var(--app-text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.load-more-btn:hover {
  border-color: var(--tl-accent, var(--app-primary));
  color: var(--tl-accent, var(--app-primary));
}
</style>
