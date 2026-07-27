<script setup lang="ts">
import { computed } from 'vue';
import type { App } from '@/theme/app';
import { mockAds } from '@/config/ads';

const props = withDefaults(
  defineProps<{
    slotName: string;
  }>(),
  {},
);

function pickWeighted(creatives: App.AdCreative[]): App.AdCreative | null {
  if (!creatives.length) return null;
  const total = creatives.reduce((sum, c) => sum + c.weight, 0);
  let r = Math.random() * total;
  for (const c of creatives) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return creatives[creatives.length - 1];
}

const creative = computed<App.AdCreative | null>(() => {
  const slot = (mockAds as Record<string, App.AdSlot>)[props.slotName];
  if (!slot) return null;
  return pickWeighted(slot.creatives);
});
</script>

<template>
  <a v-if="creative" :href="creative.url" target="_blank" rel="noopener noreferrer" class="ad-card">
    <img
      v-if="creative.image"
      :src="creative.image"
      :alt="creative.title"
      class="ad-image"
      loading="lazy"
      decoding="async"
    >
    <span class="ad-label">{{ creative.title }}</span>
  </a>
</template>

<style scoped>
.ad-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: var(--app-bg-container);
  border: 1px solid var(--app-border);
  text-decoration: none;
  transition: border-color 0.2s;
}
.ad-card:hover {
  border-color: var(--app-primary);
}
.ad-image {
  width: 100%;
  height: auto;
  border-radius: 8px;
}
.ad-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--app-text-secondary);
  text-align: center;
}
</style>
