<script setup lang="ts">
import BlogUserRegister from '@/components/users/BlogUserRegister.vue';
</script>

<template>
  <div class="auth-page">
    <RouterLink to="/" class="back-home">← 返回首页</RouterLink>
    <BlogUserRegister />
  </div>
</template>

<style scoped>
.auth-page {
  position: relative;
}
.back-home {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  font-size: 13px;
  color: var(--app-text-secondary);
  text-decoration: none;
  transition: color 0.18s ease;
}
.back-home:hover {
  color: var(--app-primary);
}
</style>
