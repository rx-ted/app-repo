<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import type { App } from '@/theme/app';
import { NButton, NButtonGroup } from 'naive-ui';
import SettingSection from './SettingSection.vue';

const { locale, locales, setLocale, t } = useI18n();

function updateLocale(value: App.Locale) {
  setLocale(value);
}
</script>

<template>
  <SettingSection :title="t('locale.label')">
    <n-button-group size="small">
      <n-button
        v-for="item in locales"
        :key="item.value"
        :type="item.value === locale ? 'primary' : 'default'"
        ghost
        @click="updateLocale(item.value)"
      >
        {{ item.label }}
      </n-button>
    </n-button-group>
  </SettingSection>
</template>
