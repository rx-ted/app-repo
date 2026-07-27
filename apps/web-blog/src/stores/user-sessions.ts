import { defineStore } from 'pinia';
import { ref } from 'vue';
import { http } from '@/http';
import type { ApiResponse } from '@/http/types';
import { API } from '@/constants';
import { useAuthStore } from '@/stores/auth';

type SessionInfo = {
  id: string;
  deviceId: string | null;
  ip: string | null;
  userAgent: string | null;
  isCurrent: boolean;
  lastActiveAt: string;
  createdAt: string;
};

export const useUserSessionsStore = defineStore('userSessions', () => {
  const sessions = ref<SessionInfo[]>([]);
  const sessionsLoading = ref(false);

  async function fetchSessions() {
    const auth = useAuthStore();
    if (!auth.token) return;
    sessionsLoading.value = true;
    try {
      const response = await http.get<ApiResponse<{ sessions: SessionInfo[] }>>(API.AUTH_SESSIONS);
      sessions.value = response.data.sessions;
    } finally {
      sessionsLoading.value = false;
    }
  }

  async function revokeSession(sessionId: string) {
    await http.del(`/auth/sessions/${sessionId}`);
    sessions.value = sessions.value.filter((s) => s.id !== sessionId);
  }

  async function revokeOtherSessions() {
    await http.del(API.AUTH_SESSIONS);
    sessions.value = sessions.value.filter((s) => s.isCurrent);
  }

  return {
    sessions,
    sessionsLoading,
    fetchSessions,
    revokeSession,
    revokeOtherSessions,
  };
});
