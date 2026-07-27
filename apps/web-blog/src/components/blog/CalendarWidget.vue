<template>
  <div class="calendar-widget">
    <div class="cw-header">
      <button class="cw-nav-btn" @click="prevMonth">&lt;</button>
      <span class="cw-nav-label">{{ year }} 年 {{ month }} 月</span>
      <button class="cw-nav-btn" @click="nextMonth">&gt;</button>
    </div>

    <div v-if="loading" class="cw-loading">加载中...</div>

    <div v-else class="cw-grid">
      <div v-for="day in weekDays" :key="day" class="cw-header-cell">{{ day }}</div>
      <div
        v-for="(day, i) in calendarDays"
        :key="i"
        class="cw-cell"
        :class="{
          'cw-cell--empty': !day,
          'cw-cell--today': day === today && month === currentMonth && year === currentYear,
          'cw-cell--has': day && counts[dayKey(day)] > 0,
        }"
        @click="day && handleClick(day)"
      >
        <span v-if="day" class="cw-day-num">{{ day }}</span>
        <span v-if="day && counts[dayKey(day)]" class="cw-day-dot">{{ counts[dayKey(day)] }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { http } from '@/http';
import { API } from '@/constants/api';

const router = useRouter();

const emit = defineEmits<{
  dateClick: [date: string];
}>();

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const today = now.getDate();

const year = ref(currentYear);
const month = ref(currentMonth);
const counts = ref<Record<string, number>>({});
const loading = ref(false);

const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

function dayKey(day: number): string {
  return `${year.value}-${String(month.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const calendarDays = computed(() => {
  const first = new Date(year.value, month.value - 1, 1);
  const last = new Date(year.value, month.value, 0);
  const startDay = first.getDay() || 7;
  const days: (number | null)[] = [];
  for (let i = 1; i < startDay; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
});

async function fetchCounts() {
  loading.value = true;
  try {
    const body = await http.get<{ data: Record<string, number> }>(`${API.POSTS_LIST}/calendar`, {
      query: { year: year.value, month: month.value },
    });
    counts.value = body.data ?? {};
  } catch {
    counts.value = {};
  } finally {
    loading.value = false;
  }
}

function prevMonth() {
  if (month.value === 1) {
    month.value = 12;
    year.value--;
  } else {
    month.value--;
  }
}

function nextMonth() {
  if (month.value === 12) {
    month.value = 1;
    year.value++;
  } else {
    month.value++;
  }
}

function handleClick(day: number) {
  const date = dayKey(day);
  emit('dateClick', date);
  router.push(`/posts?date=${date}`);
}

watch([year, month], fetchCounts, { immediate: true });
</script>

<style scoped>
.calendar-widget {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--app-border);
  background: var(--app-bg-container);
  min-width: 0;
  overflow: hidden;
}

.cw-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cw-nav-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--app-border);
  background: var(--app-bg);
  color: var(--app-text);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.cw-nav-btn:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
}

.cw-nav-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text);
}

.cw-loading {
  padding: 24px 0;
  text-align: center;
  color: var(--app-text-tertiary);
  font-size: 13px;
}

.cw-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.cw-header-cell {
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--app-text-tertiary);
  padding: 6px 0;
}

.cw-cell {
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  transition: background 0.15s;
  min-width: 0;
  min-height: 44px;
  padding: 2px 0;
}

.cw-cell:not(.cw-cell--empty):hover {
  background: color-mix(in srgb, var(--app-primary) 6%, transparent);
}

.cw-cell--empty {
  cursor: default;
}

.cw-cell--today .cw-day-num {
  color: var(--app-primary);
  font-weight: 700;
}

.cw-day-num {
  font-size: 13px;
  color: var(--app-text);
  font-weight: 500;
}

.cw-day-dot {
  font-size: 9px;
  color: #fff;
  background: var(--app-primary);
  border-radius: 999px;
  padding: 1px 5px;
  min-width: 14px;
  max-width: 100%;
  text-align: center;
  font-weight: 600;
  line-height: 1.3;
  box-sizing: border-box;
}
</style>
