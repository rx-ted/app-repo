<template>
  <SettingSection :title="t('theme.color')">
    <n-grid :cols="5" :x-gap="8" :y-gap="8">
      <n-grid-item v-for="color in THEME.BRANDS" :key="color">
        <div
          class="color-dot"
          :class="{ active: color === themeColor }"
          :style="{ backgroundColor: color }"
          @click="setColor(color)"
        />
      </n-grid-item>
    </n-grid>
  </SettingSection>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { useTheme } from '@/theme/useTheme';
import { NGrid, NGridItem } from 'naive-ui';
import SettingSection from './SettingSection.vue';
import { THEME } from '@/constants/theme';

const { themeColor, setColor } = useTheme();
const { t } = useI18n();
</script>

<style scoped>
.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  border: 1px solid var(--app-border);
  transition: all 0.2s ease;
}

.color-dot.active {
  transform: scale(1);
  box-shadow:
    0 0 0 2px var(--app-bg),
    0 0 0 4px var(--app-primary);
}
</style>
