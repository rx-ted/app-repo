<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <AppLayout />
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui';
import AppLayout from './layouts/index.vue';
import { naiveThemeOverrides } from './theme/naive';
import { useTheme } from './theme/useTheme';

const { theme } = useTheme();
const themeOverrides = naiveThemeOverrides();
</script>
