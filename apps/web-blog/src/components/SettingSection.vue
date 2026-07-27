<template>
  <div class="section">
    <div class="title">{{ title }}</div>
    <div class="content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<style scoped>
.section {
  padding: 4px 0;
}
.title {
  font-size: 12px;
  color: var(--app-text-secondary);
  margin-bottom: 6px;
}
</style>
