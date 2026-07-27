<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { useSessionStore } from '@/stores/session';

const router = useRouter();
const route = useRoute();
const session = useSessionStore();

function goToLogin() {
  router.push({ name: 'login', query: { redirect: route.fullPath } });
}
</script>

<template>
  <div v-if="session.isAuthenticated" class="auth-zone-authenticated">
    <slot name="authenticated" />
  </div>
  <div
    v-else
    class="auth-zone-guest"
    role="button"
    tabindex="0"
    @click="goToLogin"
    @keydown.enter="goToLogin"
  >
    <slot name="guest" />
  </div>
</template>

<style scoped>
.auth-zone-guest {
  cursor: pointer;
  border: 1px dashed var(--app-border);
  border-radius: 12px;
  padding: 24px;
  transition: all 0.15s;
}
.auth-zone-guest:hover {
  border-color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 4%, transparent);
}
</style>
