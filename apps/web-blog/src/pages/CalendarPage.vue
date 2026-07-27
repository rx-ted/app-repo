<template>
  <div class="calendar-page">
    <div class="page-header">
      <h1 class="page-title">日历</h1>
    </div>
    <CalendarWidget />
  </div>
</template>

<script setup lang="ts">
import CalendarWidget from '@/components/blog/CalendarWidget.vue';
</script>

<style scoped>
.calendar-page {
  max-width: 420px;
  margin: 0 auto;
  padding: 32px 0;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 26px;
  font-weight: 700;
  margin: 0;
}
</style>
