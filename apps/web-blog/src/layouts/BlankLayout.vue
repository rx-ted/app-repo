<script setup lang="ts">
import { useThemeTransition } from '@/theme/useTheme';

useThemeTransition();
</script>

<template>
  <div class="blank-root">
    <main class="blank-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.blank-root {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  /* height: 100vh; */
  height: 100dvh;
}

.blank-content {
  width: 100%;
  height: 100%;
}
</style>

<style scoped>
.blank-root {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  /* height: 100vh; */
  height: 100dvh;
}

.blank-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--app-border);
  border-top-color: var(--app-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 14px;
  color: var(--app-text-secondary);
}

.blank-content {
  width: 100%;
  height: 100%;
}
</style>
