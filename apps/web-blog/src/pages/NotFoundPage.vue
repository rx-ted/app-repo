<!-- src/pages/NotFoundPage.vue -->
<template>
  <div class="container">
    <div class="not-found">
      <n-empty description="你什么也找不到">
        <template #extra>
          <n-button tag="a" href="/" type="primary" round> Take me home </n-button>
        </template>
      </n-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NEmpty, NButton } from 'naive-ui';
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
}

.not-found {
  width: auto;
  padding: 20px;
}

.not-found :deep(.n-empty) {
  max-width: 480px;
}
</style>
