<script setup lang="ts">
import { computed } from 'vue';
import { type ContentLanguageMode, useContentLanguage } from '@/composables/useContentLanguage';
import { useI18n } from '@/composables/useI18n';
import { NButton, NButtonGroup } from 'naive-ui';
import SettingSection from './SettingSection.vue';

const { mode, setMode } = useContentLanguage();
const { t } = useI18n();

const options = computed(
  () =>
    [
      { value: 'original', label: t('content.mode.original') },
      { value: 'translated', label: t('content.mode.translated') },
      { value: 'bilingual', label: t('content.mode.bilingual') },
    ] as Array<{ value: ContentLanguageMode; label: string }>,
);
</script>

<template>
  <SettingSection :title="t('content.mode')">
    <n-button-group size="small">
      <n-button
        v-for="item in options"
        :key="item.value"
        :type="item.value === mode ? 'primary' : 'default'"
        ghost
        @click="setMode(item.value)"
      >
        {{ item.label }}
      </n-button>
    </n-button-group>
  </SettingSection>
</template>
