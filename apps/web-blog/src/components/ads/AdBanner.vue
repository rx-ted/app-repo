<script setup lang="ts">
defineProps<{
  label?: string;
}>();
</script>

<template>
  <div class="ad-banner">
    <span class="ab-label">{{ label ?? 'Ad' }}</span>
    <span class="ab-placeholder">广告位 · 728×90</span>
  </div>
</template>

<style scoped>
.ad-banner {
  padding: 20px;
  background: var(--app-bg-container);
  border: 1px dashed var(--app-border);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.ab-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--app-text-tertiary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ab-placeholder {
  font-size: 13px;
  color: var(--app-text-tertiary);
}
</style>
