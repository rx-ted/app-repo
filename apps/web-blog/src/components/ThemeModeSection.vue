<script setup lang="ts">
import { inject } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useTheme } from '@/theme/useTheme';
import { NButton } from 'naive-ui';
import AppIcon from '@/components/AppIcon.vue';
import SettingSection from './SettingSection.vue';

const { isDark, toggleTheme } = useTheme();
const { t } = useI18n();

const toggleAppearance = inject('toggle-appearance', (_event: MouseEvent) => {
  toggleTheme();
});
</script>

<template>
  <SettingSection :title="t('theme.appearance')">
    <n-button
      tertiary
      type="primary"
      size="small"
      circle
      bordered
      :aria-label="t('theme.mode.toggle')"
      @click="toggleAppearance($event)"
    >
      <template #icon>
        <AppIcon name="line-md:moon-filled-to-sunny-filled-loop-transition" v-if="!isDark" />
        <AppIcon name="line-md:sunny-filled-loop-to-moon-filled-transition" v-else />
      </template>
    </n-button>
  </SettingSection>
</template>
