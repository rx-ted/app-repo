<template>
  <div class="at">
    <div v-if="loading" class="at-message">加载中…</div>
    <div v-else-if="!grouped.length" class="at-message">暂无文章</div>

    <div v-else class="at-body">
      <div
        v-for="year in grouped"
        :key="year.year"
        class="at-year"
        :class="{ 'at-on': activeYear === year.year }"
      >
        <div class="at-head">
          <span class="at-dot" :class="{ fill: activeYear === year.year }" />
          <span class="at-bar" :class="{ fill: activeYear === year.year }" />
          <span class="at-lbl at-lbl-yr">{{ year.year }}</span>
          <span class="at-num">{{ yearTotal(year) }} 篇</span>
          <button class="at-fld" @click="togYear(year.year)">
            {{ foldedYears.has(year.year) ? '展开' : '收起' }}
          </button>
        </div>

        <div v-if="!foldedYears.has(year.year)" class="at-sub">
          <div
            v-for="(month, mi) in year.months"
            :key="month.month"
            class="at-month"
            :class="[
              mi === year.months.length - 1 ? 'at-last' : '',
              { 'at-on': activeYear === year.year && activeMonth === month.month }
            ]"
          >
            <div class="at-head">
              <span
                class="at-dot"
                :class="{ fill: activeYear === year.year && activeMonth === month.month }"
              />
              <span
                class="at-bar"
                :class="{ fill: activeYear === year.year && activeMonth === month.month }"
              />
              <span class="at-lbl at-lbl-mo">{{ month.month }} 月</span>
              <span class="at-num">{{ month.articles.length }} 篇</span>
              <button class="at-fld" @click="togMonth(year.year, month.month)">
                {{ foldedMonths.has(`${year.year}-${month.month}`) ? '展开' : '收起' }}
              </button>
            </div>

            <div v-if="!foldedMonths.has(`${year.year}-${month.month}`)" class="at-sub">
              <div
                v-for="(article, ai) in month.articles"
                :key="article.id"
                class="at-row"
                :class="[
                  ai === month.articles.length - 1 ? 'at-last' : '',
                  { 'at-on': hovered === article.id }
                ]"
                @mouseenter="hovered = article.id"
                @mouseleave="hovered = null"
                @click="$emit('select', article.slug)"
              >
                <span class="at-dot" :class="{ fill: hovered === article.id }" />
                <span class="at-bar" :class="{ fill: hovered === article.id }" />
                <span class="at-tag" :style="{ '--t': tagHue(article) }"
                  >{{ article.categories?.[0] }}</span
                >
                <time class="at-date"
                  >{{ shortDate(article.published_at ?? article.updated_at) }}</time
                >
                <span class="at-title">{{ article.title }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { BlogPostCardVO } from '@/types/blog';

type MonthGroup = { month: number; articles: BlogPostCardVO[] };
type YearGroup = { year: number; months: MonthGroup[] };

const props = defineProps<{
  grouped: YearGroup[];
  loading?: boolean;
}>();

defineEmits<{
  select: [slug: string];
}>();

const hovered = ref<number | null>(null);
const foldedYears = ref<Set<number>>(new Set());
const foldedMonths = ref<Set<string>>(new Set());

const activePath = computed(() => {
  if (hovered.value === null) return null;
  for (const y of props.grouped) {
    for (const m of y.months) {
      if (m.articles.some((a) => a.id === hovered.value)) {
        return { year: y.year, month: m.month };
      }
    }
  }
  return null;
});

const activeYear = computed(() => activePath.value?.year ?? null);
const activeMonth = computed(() => activePath.value?.month ?? null);

function yearTotal(year: YearGroup): number {
  return year.months.reduce((s, m) => s + m.articles.length, 0);
}

function togYear(y: number) {
  const s = new Set(foldedYears.value);
  s.has(y) ? s.delete(y) : s.add(y);
  foldedYears.value = s;
}

function togMonth(y: number, m: number) {
  const k = `${y}-${m}`;
  const s = new Set(foldedMonths.value);
  s.has(k) ? s.delete(k) : s.add(k);
  foldedMonths.value = s;
}

function hash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h);
    h = h & h;
  }
  return ((h % 360) + 360) % 360;
}

function tagHue(article: BlogPostCardVO): string {
  return `${hash(article.categories?.[0] ?? article.title)}`;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
</script>

<style scoped>
/* ── message ── */
.at-message {
  padding: 80px 0;
  text-align: center;
  color: var(--app-text-tertiary);
  font-size: 14px;
}

.at-body {
  display: flex;
  flex-direction: column;
}

/* ── year level ── */
.at-year {
  position: relative;
}

.at-year::before {
  content: "";
  position: absolute;
  left: 15px;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 2px dashed var(--app-border);
  transition:
    border-color 0.15s,
    border-style 0.15s;
}

.at-year.at-on::before {
  border-left-color: var(--app-primary);
  border-left-style: solid;
}

/* ── month level ── */
.at-month {
  position: relative;
  margin-left: 32px;
}

/* month vertical stub (month dot → first article) */
.at-month::before {
  content: "";
  position: absolute;
  left: 15px;
  top: 24px;
  width: 0;
  height: 12px;
  border-left: 2px dashed var(--app-border);
  transition:
    border-color 0.15s,
    border-style 0.15s;
}

.at-month.at-on::before {
  border-left-color: var(--app-primary);
  border-left-style: solid;
}

/* horizontal connector from year line → month line */
.at-month .at-head::after {
  content: "";
  position: absolute;
  left: -17px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 0;
  border-top: 2px dashed var(--app-border);
  transition:
    border-color 0.15s,
    border-style 0.15s;
}

.at-month.at-on .at-head::after {
  border-top-color: var(--app-primary);
  border-top-style: solid;
}

/* year-line segment per month (for per-month hover control) */
.at-month::after {
  content: "";
  position: absolute;
  left: -17px;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 2px dashed var(--app-border);
  transition:
    border-color 0.15s,
    border-style 0.15s;
}

.at-year.at-on .at-month::after {
  border-left-color: var(--app-primary);
  border-left-style: solid;
}

.at-month.at-on ~ .at-month::after {
  border-left-color: var(--app-border);
  border-left-style: dashed;
}

/* ── head / row ── */
.at-head,
.at-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 0 7px 48px;
  min-height: 32px;
}

.at-row {
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s;
}

.at-row:hover {
  background: color-mix(in srgb, var(--app-primary) 4%, transparent);
}

/* ── dot ── */
.at-dot {
  position: absolute;
  left: 8px; /* 15px (line) - 7px (half dot) = 8px */
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--app-border);
  background: transparent;
  z-index: 1;
  transition:
    background 0.15s,
    border-color 0.15s,
    transform 0.15s;
}

.at-dot.fill {
  background: var(--app-primary);
  border-color: var(--app-primary);
  transform: translateY(-50%) scale(1.1);
}

/* ── horizontal bar (dot → content) ── */
.at-bar {
  position: absolute;
  left: 22px; /* 8px (dot) + 14px (dot w) = 22px */
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 0;
  border-top: 2px dashed var(--app-border);
  transition:
    border-color 0.15s,
    border-style 0.15s;
}

.at-bar.fill {
  border-top-color: var(--app-primary);
  border-top-style: solid;
}

/* ── month line segment through each article row ── */
.at-row::before {
  content: "";
  position: absolute;
  left: -17px;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 2px dashed var(--app-border);
  transition:
    border-color 0.15s,
    border-style 0.15s;
}

.at-month.at-on .at-row::before {
  border-left-color: var(--app-primary);
  border-left-style: solid;
}

/* rows below the hovered one stay dashed */
.at-row.at-on ~ .at-row::before {
  border-left-color: var(--app-border);
  border-left-style: dashed;
}

/* last article: └ corner — month line stops at dot level */
.at-row.at-last::before {
  bottom: auto;
  height: 50%;
}

/* ── horizontal branch: month line → each article dot ── */
.at-row::after {
  content: "";
  position: absolute;
  left: -17px;
  top: 50%;
  transform: translateY(-50%);
  width: 25px;
  height: 0;
  border-top: 2px dashed var(--app-border);
  transition:
    border-color 0.15s,
    border-style 0.15s;
}

.at-row.at-on::after {
  border-top-color: var(--app-primary);
  border-top-style: solid;
}

/* ── labels ── */
.at-lbl {
  flex-shrink: 0;
  white-space: nowrap;
}

.at-lbl-yr {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  color: var(--app-text);
}

.at-lbl-mo {
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  color: var(--app-text-secondary);
}

.at-num {
  font-size: 12px;
  color: var(--app-text-tertiary);
  white-space: nowrap;
}

/* ── fold ── */
.at-fld {
  margin-left: auto;
  background: none;
  border: none;
  padding: 0 6px;
  font-size: 12px;
  color: var(--app-text-tertiary);
  cursor: pointer;
  line-height: 1;
  border-radius: 4px;
  transition:
    color 0.15s,
    background 0.15s;
}

.at-fld:hover {
  color: var(--app-text);
  background: color-mix(in srgb, var(--app-text) 6%, transparent);
}

/* ── children (article container) ── */
.at-sub {
  display: flex;
  flex-direction: column;
  padding-left: 32px;
}

/* ── tag ── */
.at-tag {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 999px;
  background: hsl(calc(var(--t, 200)), 45%, 92%);
  color: hsl(calc(var(--t, 200)), 50%, 30%);
  border: 1px solid hsl(calc(var(--t, 200)), 40%, 82%);
  line-height: 1.6;
}

/* ── date ── */
.at-date {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--app-text-tertiary);
  font-variant-numeric: tabular-nums;
  transition: color 0.15s;
}

.at-row:hover .at-date {
  color: var(--app-text-secondary);
}

/* ── title ── */
.at-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 450;
  color: var(--app-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s;
}

.at-row.at-on .at-title {
  color: var(--app-primary);
}
</style>
