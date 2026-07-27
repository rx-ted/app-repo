<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import BlogUserLogin from '@/components/users/BlogUserLogin.vue';
import { AUTH } from '@/constants/auth';
import { tokenStorage } from '@/lib/http/tokenStorage';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const checking = ref(true);
const stolenAlert = ref(sessionStorage.getItem(AUTH.SESSION_STORAGE_STOLEN_KEY) === '1');

onMounted(async () => {
  sessionStorage.removeItem('auth:redirecting');

  const token = typeof route.query.token === 'string' ? route.query.token : '';
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';

  if (stolenAlert.value) {
    sessionStorage.removeItem(AUTH.SESSION_STORAGE_STOLEN_KEY);
  }

  // SSO callback / magic link token flow
  if (token) {
    tokenStorage.token = token;
    session.$patch({ token });
    try {
      await session.bootstrap();
      await router.replace(redirect.startsWith('/') ? redirect : '/');
    } catch {
      session.clearSession();
      await router.replace('/login');
    }
    return;
  }

  // Check/auth: if session still valid, redirect away
  if (session.isAuthenticated) {
    await router.replace(redirect.startsWith('/') ? redirect : '/');
    return;
  }

  // Try silent refresh via httpOnly cookie
  try {
    await session.bootstrap();
    if (session.isAuthenticated) {
      await router.replace(redirect.startsWith('/') ? redirect : '/');
      return;
    }
  } catch {
    // Not authenticated — show login form
  }

  checking.value = false;
});
</script>

<template>
  <div class="auth-page">
    <div v-if="stolenAlert" class="stolen-alert">
      {{ AUTH.STOLEN_MESSAGE }}
    </div>
    <BlogUserLogin v-if="!checking" />
  </div>
</template>

<style scoped>
.auth-page {
  position: relative;
}

.stolen-alert {
  margin: 16px auto;
  padding: 12px 16px;
  max-width: 400px;
  background: var(--app-danger-bg, #fff0f0);
  border: 1px solid var(--app-danger-border, #ffc0c0);
  border-radius: 8px;
  color: var(--app-danger-text, #c00);
  font-size: 14px;
  text-align: center;
}
</style>

<style scoped>
.auth-page {
  position: relative;
}
</style>
