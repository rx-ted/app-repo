<script setup lang="ts">
import { NButton, NCard, NSpace, NButtonGroup } from 'naive-ui';
import { useI18n } from '@/composables/useI18n';
import { useTheme } from '@/theme/useTheme';
import { THEME } from '@/constants/theme';
import type { App } from '@/theme/app';

const { t, locale, setLocale } = useI18n();
const { isDark, toggleTheme, themeColor, setColor } = useTheme();

const localeOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en' },
];

const brandColorMap: Record<string, string> = {
  blue: '#3B82F6',
  green: '#22C55E',
  orange: '#F97316',
  purple: '#8B5CF6',
  red: '#EF4444',
};
</script>

<template>
  <div class="settings-page">
    <div class="page-header">
      <h2 class="page-title">{{ t('nav.settings') }}</h2>
    </div>

    <!-- Theme Mode -->
    <n-card size="small" class="settings-card" :title="t('theme.appearance')">
      <n-space align="center">
        <span>{{ isDark ? '🌙' : '☀️' }} {{ isDark ? 'Dark' : 'Light' }}</span>
        <n-button size="small" @click="toggleTheme">{{ t('theme.mode.toggle') }}</n-button>
      </n-space>
    </n-card>

    <!-- Theme Color -->
    <n-card size="small" class="settings-card" :title="t('theme.color')">
      <n-space>
        <div
          v-for="color in THEME.BRANDS"
          :key="color"
          class="color-option"
          :class="{ active: color === themeColor }"
          @click="setColor(color)"
        >
          <span class="color-swatch" :style="{ backgroundColor: brandColorMap[color] }"></span>
          <span class="color-label">{{ t(`color.${color}`) }}</span>
        </div>
      </n-space>
    </n-card>

    <!-- Language -->
    <n-card size="small" class="settings-card" :title="t('locale.label')">
      <n-button-group size="small">
        <n-button
          v-for="item in localeOptions"
          :key="item.value"
          :type="item.value === locale ? 'primary' : 'default'"
          ghost
          @click="setLocale(item.value as App.Locale)"
        >
          {{ item.label }}
        </n-button>
      </n-button-group>
    </n-card>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 640px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}

.settings-card {
  border-radius: 12px;
  margin-bottom: 16px;
}

.color-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s;
}

.color-option:hover {
  background: var(--app-bg-muted);
}

.color-option.active {
  background: color-mix(in srgb, var(--app-primary) 12%, transparent);
}

.color-swatch {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.color-label {
  font-size: 13px;
}
</style>
