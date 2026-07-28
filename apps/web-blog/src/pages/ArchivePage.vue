<template>
  <div class="archive-page">
    <div class="page-header">
      <h1 class="page-title">归档</h1>
      <p v-if="total > 0" class="page-subtitle">共 {{ total }} 篇文章</p>
    </div>

    <div v-if="loading" class="loading-state">加载中...</div>

    <div v-else-if="!grouped.length" class="empty-state">暂无文章</div>

    <div v-else class="accordion">
      <div
        v-for="year in grouped"
        :key="year.year"
        class="acc-year"
      >
        <div class="acc-year-head" @click="toggleYear(year.year)">
          <span class="acc-year-num">{{ year.year }}</span>
          <div class="acc-year-stats">
            <span class="acc-year-stat">
              <strong>{{ yearTotal(year) }}</strong> 篇
            </span>
            <span class="acc-year-stat">
              <strong>{{ year.months.length }}</strong> 月
            </span>
          </div>
          <span class="acc-year-chevron" :class="{ open: expandedYears.has(year.year) }">▾</span>
        </div>

        <div v-if="expandedYears.has(year.year)" class="acc-year-body">
          <div v-for="month in year.months" :key="month.month" class="acc-month">
            <div class="acc-month-label">{{ month.month }} 月</div>
            <div class="acc-articles">
              <div
                v-for="article in month.articles"
                :key="article.id"
                class="acc-article"
                @click="goToPost(article.slug)"
              >
                <div class="acc-a-dot" />
                <span class="acc-a-date">{{ shortDate(article.published_at ?? article.updated_at) }}</span>
                <span class="acc-a-title">{{ article.title }}</span>
                <span
                  v-if="article.categories?.[0]"
                  class="acc-a-cat"
                  :style="catStyle(article.categories[0])"
                >{{ article.categories[0] }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useArchive } from '@/composables/useArchive';
import { getColor } from '@/utils/colors';

const router = useRouter();
const { loading, total, grouped, fetchAll } = useArchive();

const expandedYears = ref<Set<number>>(new Set());

function yearTotal(year: { year: number; months: { articles: unknown[] }[] }): number {
  return year.months.reduce((s, m) => s + m.articles.length, 0);
}

function toggleYear(y: number) {
  const s = new Set(expandedYears.value);
  s.has(y) ? s.delete(y) : s.add(y);
  expandedYears.value = s;
}

function catStyle(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h);
    h = h & h;
  }
  const c = getColor(((h % 360) + 360) % 360);
  return { background: c.light, color: c.solid, borderColor: c.lightBorder };
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function goToPost(slug: string) {
  router.push(`/posts/${slug}`);
}

onMounted(() => {
  fetchAll();
  // auto-expand current year
  const now = new Date().getFullYear();
  const years = grouped.value.map((y) => y.year);
  if (years.includes(now)) {
    expandedYears.value = new Set([now]);
  } else if (years.length) {
    expandedYears.value = new Set([years[0]]);
  }
});
</script>

<style scoped>
.archive-page {
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

.loading-state,
.empty-state {
  padding: 48px 0;
  text-align: center;
  color: var(--app-text-tertiary);
  font-size: 14px;
}

.accordion {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── year card ── */
.acc-year {
  border: 1px solid var(--app-border);
  border-radius: 14px;
  overflow: hidden;
  background: var(--app-bg-container);
  transition: box-shadow 0.2s;
}

.acc-year:hover {
  box-shadow: 0 2px 12px color-mix(in srgb, var(--app-text) 4%, transparent);
}

.acc-year-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  cursor: pointer;
  user-select: none;
  background: color-mix(in srgb, var(--app-text) 2%, transparent);
  border-bottom: 1px solid var(--app-border);
  transition: background 0.15s;
}

.acc-year-head:hover {
  background: color-mix(in srgb, var(--app-primary) 4%, transparent);
}

.acc-year-num {
  font-size: 20px;
  font-weight: 800;
  color: var(--app-text);
}

.acc-year-stats {
  display: flex;
  gap: 12px;
  margin-left: auto;
  font-size: 12px;
  color: var(--app-text-tertiary);
}

.acc-year-stat strong {
  color: var(--app-primary);
  font-weight: 700;
}

.acc-year-chevron {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text-tertiary);
  transition: transform 0.2s;
  font-size: 14px;
}

.acc-year-chevron.open {
  transform: rotate(0deg);
}

.acc-year-body {
  padding: 12px 20px;
}

/* ── month ── */
.acc-month {
  margin-bottom: 12px;
}

.acc-month:last-child {
  margin-bottom: 0;
}

.acc-month-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text-secondary);
  margin-bottom: 6px;
  padding-left: 4px;
}

/* ── article ── */
.acc-articles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.acc-article {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s;
}

.acc-article:hover {
  background: color-mix(in srgb, var(--app-primary) 4%, transparent);
}

.acc-article:hover .acc-a-title {
  color: var(--app-primary);
}

.acc-article:hover .acc-a-dot {
  background: var(--app-primary);
}

.acc-a-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--app-text-tertiary);
  flex-shrink: 0;
  transition: background 0.15s;
}

.acc-a-date {
  font-size: 12px;
  color: var(--app-text-tertiary);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  width: 42px;
}

.acc-a-title {
  font-size: 13px;
  color: var(--app-text);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s;
}

.acc-a-cat {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
  border: 1px solid;
  line-height: 1.6;
}
</style>
