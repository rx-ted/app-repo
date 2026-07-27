<script setup lang="ts">
import { NAvatar, NCard } from 'naive-ui';

const props = defineProps<{
  kicker: string;
  name: string;
  subtitle?: string;
  description?: string;
  bio?: string;
  avatarUrl?: string | null;
  avatarText: string;
}>();
</script>

<template>
  <n-card class="person-card">
    <div class="person-backdrop" />
    <div class="person-hero">
      <n-avatar v-if="props.avatarUrl" class="avatar" round :size="72" :src="props.avatarUrl" />
      <n-avatar v-else class="avatar" round :size="72">
        {{ props.avatarText }}
      </n-avatar>
      <div class="person-primary">
        <h3>{{ props.name }}</h3>
        <p v-if="props.subtitle" class="person-subtitle">{{ props.subtitle }}</p>
      </div>
    </div>

    <p v-if="props.description" class="person-description">{{ props.description }}</p>
    <p v-if="props.bio" class="person-bio">{{ props.bio }}</p>

    <slot />
  </n-card>
</template>

<style scoped>
.person-card {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--app-primary) 10%, transparent),
      transparent 42%
    ),
    var(--app-bg-container);
  border: 1px solid var(--app-border);
  color: var(--app-text);
  border-radius: 24px;
}

.person-backdrop {
  position: absolute;
  inset: 0 0 auto 0;
  height: 120px;
  pointer-events: none;
}

.person-hero {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding-top: 18px;
}

.person-primary {
  display: grid;
  gap: 4px;
  text-align: left;
}

.avatar {
  position: relative;
  border: 1px solid color-mix(in srgb, var(--app-border) 70%, transparent);
  background: color-mix(in srgb, var(--app-bg-container) 45%, transparent);
  color: var(--app-text);
  font-weight: 700;
  backdrop-filter: blur(12px);
  box-shadow: var(--app-shadow-base);
}

h3 {
  margin: 0;
  font-size: 22px;
  text-align: left;
}

.person-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--app-text-secondary);
  text-align: left;
}

.person-description {
  margin: 0;
  line-height: 1.7;
  text-align: left;
}

.person-bio {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--app-bg-elevated) 72%, transparent);
  color: var(--app-text-secondary);
  line-height: 1.7;
  border: 1px solid color-mix(in srgb, var(--app-border) 88%, transparent);
}

@media (max-width: 640px) {
  .person-hero {
    align-items: flex-start;
  }
}
</style>
