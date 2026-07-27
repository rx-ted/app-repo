<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import type { BlogPostCardVO } from '@/types/blog';
import {
  buildSearchExcerpt,
  buildSearchMatchChips,
  highlightText,
} from '@/utils/searchPresentation';
import { formatDateTime } from '@/utils/formatDate';

const props = withDefaults(
  defineProps<{
    item: BlogPostCardVO;
    keyword: string;
    compact?: boolean;
    active?: boolean;
    excerptLength?: number;
  }>(),
  {
    compact: false,
    active: false,
    excerptLength: 140,
  },
);

const _emit = defineEmits<{
  (e: 'select', slug: string): void;
  (e: 'hover'): void;
}>();
const { locale, t } = useI18n();

function _getSummary() {
  const excerpt = props.item.excerpt;
  if (excerpt) {
    return buildSearchExcerpt(excerpt, props.keyword, props.excerptLength);
  }
  const source = props.item.title;
  return buildSearchExcerpt(source, props.keyword, props.excerptLength);
}

function _getMatchChips() {
  return buildSearchMatchChips(props.item, props.keyword);
}
</script>

<template>
  <button
    type="button"
    class="search-result-card"
    :class="{ compact, active }"
    @mouseenter="_emit('hover')"
    @click="_emit('select', item.slug)"
  >
    <div class="result-main">
      <div class="result-breadcrumb">
        <span class="breadcrumb-item">{{ t("search.result.article") }}</span>
        <span
          v-if="item.categories?.length"
          class="breadcrumb-item"
          v-html="highlightText(item.categories[0] ?? '', keyword)"
        />
        <span
          v-else-if="item.tags?.length"
          class="breadcrumb-item"
          v-html="highlightText(item.tags[0] ?? '', keyword)"
        />
      </div>
      <div class="result-title-row">
        <component
          :is="compact ? 'h5' : 'h3'"
          class="result-title"
          v-html="highlightText(item.title, keyword)"
        />
        <span v-if="item.is_pinned" class="result-pin" :aria-label="t('search.result.pinned')"
          >{{ t("search.result.pinned") }}</span
        >
      </div>
      <p
        class="result-summary"
        v-html="highlightText(_getSummary() || t('search.result.summaryFallback'), keyword)"
      />
      <div class="result-match" :class="{ compact }">
        <span
          v-for="chip in _getMatchChips()"
          :key="chip.key"
          class="match-chip"
          :class="{ author: chip.type === 'author' }"
          v-html="`${chip.label} · ${highlightText(chip.value, keyword)}`"
        />
      </div>
    </div>
    <div class="result-meta" :class="{ compact }">
      <span v-if="item.author_name || item.author_username" class="author-name">
        {{ item.author_name || item.author_username }}
      </span>
      <span>{{ formatDateTime(item.updated_at, locale) }}</span>
    </div>
  </button>
</template>

<style>
.search-result-card {
  display: grid;
  gap: 8px;
  width: 100%;
  padding: 14px 16px;
  border: 1px solid transparent;
  border-radius: 12px;
  text-align: left;
  background: transparent;
  cursor: pointer;
  transition:
    transform 0.12s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.search-result-card:hover {
  border-color: color-mix(in srgb, var(--app-primary) 16%, transparent);
  background: color-mix(in srgb, var(--app-primary) 6%, transparent);
}

.search-result-card.active {
  border-color: color-mix(in srgb, var(--app-primary) 24%, transparent);
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
}

.search-result-card.compact {
  padding: 12px 14px;
}

.result-main {
  display: grid;
  gap: 6px;
}

.result-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  color: var(--app-text-tertiary);
  font-size: 12px;
}

.breadcrumb-item + .breadcrumb-item::before {
  content: "/";
  margin-right: 6px;
  color: var(--app-text-quaternary);
}

.result-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.result-title {
  margin: 0;
  line-height: 1.3;
  color: var(--app-text);
}

.search-result-card.compact .result-title {
  font-size: 15px;
}

.result-pin {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  padding: 2px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
  color: var(--app-primary);
  font-size: 11px;
  line-height: 16px;
}

.result-summary {
  margin: 0;
  line-height: 1.5;
  color: var(--app-text-secondary);
}

.search-result-card.compact .result-summary {
  font-size: 12px;
}

.result-match {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.match-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--app-text-secondary);
  background: color-mix(in srgb, var(--app-border) 36%, transparent);
}

.match-chip.author {
  color: var(--app-primary);
}

.result-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  color: var(--app-text-tertiary);
  font-size: 12px;
}

.author-name {
  font-weight: 500;
  color: var(--app-text-secondary);
}

.search-highlight {
  padding: 0 2px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--app-primary) 16%, transparent);
  color: inherit;
}
</style>
