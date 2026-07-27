<script setup lang="ts">
import { computed } from 'vue';
import type { App } from '@/theme/app';
import { useI18n } from '@/composables/useI18n';
import { NCard } from 'naive-ui';
import AppIcon from '@/components/AppIcon.vue';
import { formatDate } from '@/utils/formatDate';

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    article: App.BlogArticle;
    variant?: 'default' | 'spotlight';
    mode?: 'card' | 'list';
  }>(),
  {
    variant: 'default',
    mode: 'card',
  },
);

const emit = defineEmits<{
  (e: 'open', slug: string): void;
  (e: 'open-author', username?: string): void;
  (e: 'tag-click', tag: string): void;
  (e: 'category-click', category: string): void;
}>();

const primaryCategory = computed(() => props.article.categories?.[0] ?? '');

function getHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return ((hash % 360) + 360) % 360;
}

const catStyle = computed(() => {
  if (!primaryCategory.value) return {};
  const hue = getHue(primaryCategory.value);
  return { '--cat-hue': String(hue) } as Record<string, string>;
});

const displayDesc = computed(() => {
  if (props.article.content) {
    return props.article.content
      .replace(/#{1,6}\s+/g, '')
      .replace(/[*_~`]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      .replace(/\n{2,}/g, ' ')
      .trim();
  }
  return '';
});
</script>

<template>
  <n-card
    hoverable
    class="article-card"
    :class="[
      variant === 'spotlight' ? 'variant-spotlight' : 'variant-default',
      mode === 'list' ? 'mode-list' : 'mode-card',
    ]"
    @click="emit('open', article.slug)"
  >
    <div v-if="article.isPinned" class="pin-badge" :aria-label="t('article.pinned')" />
    <template v-if="mode === 'card' && variant !== 'spotlight'">
      <div class="card-body">
        <div class="card-row top-row">
          <span
            v-if="primaryCategory"
            class="cat-badge"
            :style="catStyle"
            @click.stop="emit('category-click', primaryCategory)"
          >
            {{ primaryCategory }}
          </span>
          <span class="date-text"
            >{{ t('post.updatedAt', { date: formatDate(article.updatedAt) }) }}</span
          >
        </div>
        <h3 class="card-title">{{ article.title }}</h3>
        <p v-if="displayDesc" class="card-desc">{{ displayDesc }}</p>
        <div v-if="article.tags.length" class="card-row tags-row">
          <span
            v-for="tag in article.tags"
            :key="tag"
            class="tag-pill"
            @click.stop="emit('tag-click', tag)"
            >{{ tag }}</span
          >
        </div>
        <div class="card-row bottom-row">
          <span class="author-text" @click.stop="emit('open-author', article.authorUsername)">
            {{ article.author }}
          </span>
          <div class="stats-group">
            <span class="stat-badge">
              <AppIcon name="solar:eye-linear" :width="14" :height="14" />
              {{ article.views ?? 0 }}
            </span>
            <span class="stat-badge">
              <AppIcon name="solar:heart-linear" :width="14" :height="14" />
              {{ article.likes ?? 0 }}
            </span>
            <span class="stat-badge">
              <AppIcon name="solar:chat-round-linear" :width="14" :height="14" />
              {{ article.comments ?? 0 }}
            </span>
          </div>
          <span class="reading-time">{{ t('post.readTime', { min: article.readingTime }) }}</span>
        </div>
      </div>
    </template>

    <template v-else-if="mode === 'list' && variant !== 'spotlight'">
      <div class="list-body">
        <div class="list-content">
          <div class="card-row top-row">
            <span
              v-if="primaryCategory"
              class="cat-badge"
              :style="catStyle"
              @click.stop="emit('category-click', primaryCategory)"
            >
              {{ primaryCategory }}
            </span>
            <span class="date-text"
              >{{ t('post.updatedAt', { date: formatDate(article.updatedAt) }) }}</span
            >
          </div>
          <h3 class="card-title">{{ article.title }}</h3>
          <p v-if="displayDesc" class="card-desc">{{ displayDesc }}</p>
          <div v-if="article.tags.length" class="card-row tags-row">
            <span
              v-for="tag in article.tags"
              :key="tag"
              class="tag-pill"
              @click.stop="emit('tag-click', tag)"
              >{{ tag }}</span
            >
          </div>
          <div class="card-row bottom-row">
            <span class="author-text" @click.stop="emit('open-author', article.authorUsername)">
              {{ article.author }}
            </span>
            <div class="stats-group">
              <span class="stat-badge">
                <AppIcon name="solar:eye-linear" :width="14" :height="14" />
                {{ article.views ?? 0 }}
              </span>
              <span class="stat-badge">
                <AppIcon name="solar:heart-linear" :width="14" :height="14" />
                {{ article.likes ?? 0 }}
              </span>
              <span class="stat-badge">
                <AppIcon name="solar:chat-round-linear" :width="14" :height="14" />
                {{ article.comments ?? 0 }}
              </span>
            </div>
            <span class="reading-time">{{ t('post.readTime', { min: article.readingTime }) }}</span>
          </div>
        </div>
        <div v-if="article.coverImage" class="list-cover">
          <img :src="article.coverImage" :alt="article.title" loading="lazy" decoding="async">
        </div>
      </div>
    </template>

    <template v-else>
      <div
        class="article-surface"
        role="button"
        tabindex="0"
        @keyup.enter="emit('open', article.slug)"
      >
        <div class="article-main">
          <h3 class="article-title">
            <span class="title-link">{{ article.title }}</span>
          </h3>
          <p class="article-desc">{{ displayDesc || t('article.noSummary') }}</p>
          <div class="article-meta meta-top">
            <span class="author-link" @click.stop="emit('open-author', article.authorUsername)">
              {{ article.author }}
            </span>
            <span>{{ t('post.updatedAt', { date: formatDate(article.updatedAt) }) }}</span>
            <span>{{ t('post.readTime', { min: article.readingTime }) }}</span>
          </div>
          <div class="article-meta meta-stats">
            <span
              ><AppIcon name="solar:eye-linear" :width="16" :height="16" />
              {{ article.views || 0 }}</span
            >
            <span
              ><AppIcon name="solar:heart-linear" :width="16" :height="16" />
              {{ article.likes || 0 }}</span
            >
            <span
              ><AppIcon name="solar:chat-round-linear" :width="16" :height="16" />
              {{ article.comments || 0 }}</span
            >
          </div>
        </div>
        <div v-if="article.coverImage" class="cover-panel">
          <img :src="article.coverImage" :alt="article.title" loading="lazy" decoding="async">
        </div>
      </div>
    </template>
  </n-card>
</template>

<style scoped>
.article-card {
  position: relative;
  border-radius: 16px;
  background: var(--app-bg-container);
  box-shadow: var(--app-card-shadow);
  overflow: hidden;
  cursor: pointer;
  transition:
    box-shadow 0.2s,
    transform 0.2s;
}

.article-card:hover {
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.15),
    0 12px 48px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.article-card:hover .pin-badge {
  border-color: var(--app-primary) transparent transparent transparent;
}

.article-card.mode-card {
  height: 100%;
}

:deep(.n-card__content) {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
}

.card-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0;
}

/* ======= Pin Badge ======= */
.pin-badge {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 36px 36px 0 0;
  border-color: var(--app-primary) transparent transparent transparent;
}

.article-card:hover .pin-badge {
  border-color: color-mix(in srgb, var(--app-primary) 70%, #000) transparent transparent transparent;
}

/* ======= Card Mode Layout ======= */
.card-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.top-row {
  margin-bottom: 12px;
}

.cat-badge {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 999px;
  line-height: 1.6;
  background: hsl(var(--cat-hue, 200), 45%, 92%);
  color: hsl(var(--cat-hue, 200), 50%, 30%);
  border: 1px solid hsl(var(--cat-hue, 200), 40%, 82%);
}

.date-text {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--app-text-tertiary);
  margin-left: auto;
}

.card-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-desc {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--app-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tags-row {
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.tag-pill {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  color: var(--app-text-tertiary);
  background: color-mix(in srgb, var(--app-text-tertiary) 10%, transparent);
  line-height: 1.6;
}

.bottom-row {
  font-size: 13px;
  color: var(--app-text-tertiary);
  margin-top: auto;
  padding-top: 12px;
}

.author-text {
  cursor: pointer;
}
.author-text:hover {
  color: var(--app-primary);
}

.reading-time {
  margin-left: auto;
}

.stats-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.stat-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--app-text-tertiary);
}

/* ======= List & Spotlight Layout ======= */
.article-surface {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  outline: none;
}

.article-main {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.mode-card .article-main {
  padding-right: 44px;
}

.article-title {
  margin: 0;
  font-size: 24px;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.title-link {
  position: relative;
  display: inline-block;
}

.title-link::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -4px;
  width: 100%;
  height: 2px;
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.22s ease;
  background: var(--app-primary);
}

.article-card:hover .title-link::after {
  transform: scaleX(1);
}

.article-desc {
  margin: 0;
  color: var(--app-text-secondary);
  line-height: 1.6;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  color: var(--app-text-tertiary);
  font-size: 13px;
}

.meta-stats span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.author-link {
  cursor: pointer;
}
.author-link:hover {
  color: var(--app-primary);
}

.cover-panel {
  width: 220px;
  min-height: 140px;
  border-radius: 16px;
  overflow: hidden;
  background: var(--app-bg-muted);
}

.cover-panel img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.variant-spotlight .cover-panel {
  width: 100%;
  min-height: 184px;
}

.variant-spotlight .article-surface {
  grid-template-columns: 1fr;
}

/* ======= List Mode ======= */
.mode-list .article-card {
  height: 100%;
}

.list-body {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.list-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.list-content .bottom-row {
  margin-top: auto;
  padding-top: 12px;
}

.list-cover {
  width: 180px;
  min-height: 120px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--app-bg-muted);
  flex-shrink: 0;
}

.list-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

@media (max-width: 900px) {
  .article-surface,
  .variant-spotlight .article-surface {
    grid-template-columns: 1fr;
  }

  .list-body {
    flex-direction: column;
  }

  .list-cover {
    width: 100%;
    min-height: 180px;
  }

  .cover-panel,
  .variant-spotlight .cover-panel {
    width: 100%;
    min-height: 180px;
  }
}
</style>
