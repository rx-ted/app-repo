import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';

export function useAuthGuard() {
  const session = useSessionStore();
  const router = useRouter();
  const route = useRoute();

  const isAuthenticated = computed(() => session.isAuthenticated);

  function requireAuth(): boolean {
    if (isAuthenticated.value) return true;
    router.push({ name: 'login', query: { redirect: route.fullPath } });
    return false;
  }

  return { isAuthenticated, requireAuth };
}
