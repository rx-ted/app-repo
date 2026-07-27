<script setup lang="ts">
import { ref, watch } from 'vue';
import AppIcon from '@/components/AppIcon.vue';

const props = defineProps<{
  id: string;
  icon?: string;
  message: string;
  link?: { text: string; to: string };
  closable?: boolean;
}>();

const STORAGE_PREFIX = 'announcement-dismissed';

function storageKey() {
  return `${STORAGE_PREFIX}:${props.id}`;
}

function isDismissed(): boolean {
  try {
    return localStorage.getItem(storageKey()) === '1';
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(storageKey(), '1');
  } catch {
    /* noop */
  }
  visible.value = false;
}

const visible = ref(false);

watch(
  () => props.id,
  () => {
    visible.value = !isDismissed();
  },
  { immediate: true },
);
</script>

<template>
  <div v-if="visible" class="announcement-bar">
    <span v-if="icon" class="announcement-icon">
      <AppIcon :name="icon" :width="14" :height="14" />
    </span>
    <span class="announcement-message">{{ message }}</span>
    <button v-if="link" class="announcement-link" @click="$router.push(link.to)">
      {{ link.text }}
    </button>
    <button v-if="closable === true" class="announcement-close" @click="dismiss">
      <AppIcon name="tabler:x" :width="15" :height="15" />
    </button>
  </div>
</template>

<style scoped>
.announcement-bar {
  display: flex;
  align-items: center;
  /* justify-content: center; */
  gap: 10px;
  padding: 4px 15px;
  background: #fef3c7;
  border-bottom: 1px solid #fde68a;
  font-size: 14px;
  line-height: 1.5;
  color: #92400e;
  position: relative;
}

.announcement-icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #f59e0b;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.announcement-message {
  font-weight: 500;
}

.announcement-link {
  background: #f59e0b;
  border: none;
  color: #fff;
  border-radius: 6px;
  padding: 2px 14px;
  font-size: 13px;
  cursor: pointer;
  line-height: 26px;
  flex-shrink: 0;
  font-weight: 500;
  white-space: nowrap;
}

.announcement-link:hover {
  background: #d97706;
}

.announcement-close {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #b45309;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  flex-shrink: 0;
}

.announcement-close:hover {
  color: #78350f;
}

@media (max-width: 767px) {
  .announcement-bar {
    padding: 8px 40px 8px 16px;
    font-size: 13px;
    flex-wrap: wrap;
  }
}
</style>
