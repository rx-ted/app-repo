<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  primary?: {
    message: string;
    icon?: string;
    dismissible?: boolean;
  } | null;
  secondary?: {
    message: string;
    icon?: string;
    time?: string;
  } | null;
}>();

const emit = defineEmits<{
  dismiss: [];
}>();

const primaryIcon = computed(() => props.primary?.icon ?? '📢');
const secondaryIcon = computed(() => props.secondary?.icon ?? '💡');
</script>

<template>
  <div class="notice-area">
    <div v-if="primary" class="notice-primary">
      <span class="np-icon">{{ primaryIcon }}</span>
      <span class="np-message">{{ primary.message }}</span>
      <span v-if="primary.dismissible !== false" class="np-close" @click="emit('dismiss')">✕</span>
    </div>
    <div v-if="secondary" class="notice-secondary">
      <span class="ns-icon">{{ secondaryIcon }}</span>
      <span class="ns-message">{{ secondary.message }}</span>
      <span v-if="secondary.time" class="ns-time">{{ secondary.time }}</span>
    </div>
  </div>
</template>

<style scoped>
.notice-area {
  width: 100%;
}

.notice-primary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 32px;
  background: color-mix(in srgb, var(--app-primary) 8%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--app-primary) 15%, transparent);
}

.np-icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--app-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.np-message {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--app-text);
}

.np-close {
  font-size: 12px;
  color: var(--app-text-tertiary);
  cursor: pointer;
  flex-shrink: 0;
}
.np-close:hover {
  color: var(--app-text);
}

.notice-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 32px;
  border-bottom: 1px solid var(--app-border);
}

.ns-icon {
  font-size: 12px;
  color: var(--app-text-tertiary);
  flex-shrink: 0;
}

.ns-message {
  flex: 1;
  font-size: 12px;
  color: var(--app-text-secondary);
}

.ns-time {
  font-size: 11px;
  color: var(--app-text-tertiary);
  flex-shrink: 0;
}

@media (max-width: 767px) {
  .notice-primary {
    padding: 10px 16px;
  }
  .np-message {
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .notice-secondary {
    padding: 8px 16px;
  }
}
</style>
