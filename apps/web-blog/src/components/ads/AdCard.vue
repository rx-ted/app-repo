<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
}>();
</script>

<template>
  <div class="ad-card">
    <div class="ad-label">Sponsored</div>
    <div class="ad-title">{{ title }}</div>
    <div class="ad-desc">{{ description }}</div>
  </div>
</template>

<style scoped>
.ad-card {
  padding: 20px;
  background: var(--app-bg-container);
  border: 1px dashed var(--app-primary);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.ad-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--app-primary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ad-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text);
}

.ad-desc {
  font-size: 12px;
  color: var(--app-text-secondary);
}
</style>
