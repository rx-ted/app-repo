<script setup lang="ts">
import { NCard } from 'naive-ui';
import AppIcon from '@/components/AppIcon.vue';

export type StatItem = {
  label: string;
  value: number;
  icon: string;
  color: string;
};

defineProps<{
  stats: StatItem[];
}>();
</script>

<template>
  <div class="dashboard-stats">
    <n-card v-for="stat in stats" :key="stat.label" class="stat-card" size="small" :bordered="true">
      <div class="stat-inner">
        <div
          class="stat-icon"
          :style="{
            background: `color-mix(in srgb, ${stat.color} 12%, transparent)`,
            color: stat.color,
          }"
        >
          <AppIcon :name="stat.icon" :width="20" :height="20" />
        </div>
        <div>
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </n-card>
  </div>
</template>

<style scoped>
.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.stat-card {
  border-radius: 12px;
}
.stat-inner {
  display: flex;
  align-items: center;
  gap: 12px;
}
.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}
.stat-label {
  font-size: 13px;
  color: var(--app-text-tertiary);
  margin-top: 4px;
}
@media (max-width: 900px) {
  .dashboard-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .dashboard-stats {
    grid-template-columns: 1fr;
  }
}
</style>
