<template>
  <div class="sort-bar">
    <button
      v-for="option in sortOptions"
      :key="option.value"
      class="sort-btn"
      :class="{ active: modelValue === option.value }"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { CommentSort } from '@/types/community';

defineProps<{
  modelValue: CommentSort;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: CommentSort];
}>();

const sortOptions: { value: CommentSort; label: string }[] = [
  { value: 'newest', label: '最新' },
  { value: 'hottest', label: '最热' },
];
</script>

<style scoped>
.sort-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
}

.sort-btn {
  padding: 4px 12px;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: transparent;
  color: var(--n-text-color-3);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.sort-btn.active {
  background: var(--app-primary);
  color: #fff;
  border-color: var(--app-primary);
}

.sort-btn:not(.active):hover {
  color: var(--app-primary);
  border-color: var(--app-primary);
}
</style>
