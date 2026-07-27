import { defineStore } from 'pinia';
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { http } from '@/http';
import type { ApiResponse } from '@/http/types';
import { useBlogStore } from '@/stores/blog';
import type { BlogDashboardVO } from '@/types/blog';
import { DASHBOARD_DEFAULTS } from '@/constants/dashboard';
import { API } from '@/constants';
import { tokenStorage } from '@/lib/http/tokenStorage';
import {
  sendHeartbeat,
  HEARTBEAT_INTERVAL_MS,
  ONLINE_THRESHOLD_MS,
} from '@/composables/useHeartbeat';

type SessionUser = {
  id: string;
  username: string;
  email: string | null;
  preferredLocale: 'zh-CN' | 'en';
  roles: string[];
  permissions: string[];
  tokenVersion: number;
  lastLoginAt?: string | null;
  nickname?: string | null;
  avatarUrl?: string | null;
};

type AuthResponse = {
  accessToken: string;
  expiresIn: string;
  sessionId: string;
};

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(tokenStorage.token);
  const user = ref<SessionUser | null>(null);
  const loading = ref(false);

  const dashboardName = ref<string>(DASHBOARD_DEFAULTS.name);
  const dashboardTitle = ref<string>(DASHBOARD_DEFAULTS.title);
  const dashboardDescription = ref('Content / Auth / Permissions / Search');
  const dashboardBio = ref(
    'Writing is not one-time output, but a process of continuously organizing cognition.',
  );
  const dashboardStats = ref({ posts: 0, links: 0, days: 0, views: 0 });
  const dashboardAvatarUrl = ref('');
  const dashboardWebsite = ref('');
  const dashboardLoading = ref(false);

  const lastHeartbeatAt = ref(0);
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  const isOnline = computed(() => {
    if (!lastHeartbeatAt.value) return false;
    return Date.now() - lastHeartbeatAt.value < ONLINE_THRESHOLD_MS;
  });

  async function handleHeartbeat() {
    await sendHeartbeat();
    lastHeartbeatAt.value = Date.now();
  }

  function startHeartbeat() {
    stopHeartbeat();
    handleHeartbeat();
    heartbeatInterval = setInterval(handleHeartbeat, HEARTBEAT_INTERVAL_MS);
  }

  function stopHeartbeat() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  }

  let unsubscribe: (() => void) | null = null;
  try {
    onMounted(() => {
      unsubscribe = tokenStorage.subscribe((t: string | null) => {
        token.value = t;
      });
    });
    onUnmounted(() => {
      unsubscribe?.();
    });
  } catch {
    /* not in component context (e.g., test) */
  }

  const isAuthenticated = computed(() => Boolean(token.value && user.value));

  function applyLocale(preferredLocale: 'zh-CN' | 'en') {
    const { setLocale } = useI18n();
    setLocale(preferredLocale);
  }

  function clearSession() {
    token.value = null;
    user.value = null;
    tokenStorage.token = null;
    stopHeartbeat();
  }

  let _resolveReady: () => void;
  const ready = new Promise<void>((resolve) => {
    _resolveReady = resolve;
  });

  async function bootstrap() {
    let currentToken = token.value;
    if (!currentToken) {
      try {
        const response = await http.post<ApiResponse<{ accessToken: string; expiresIn: string }>>(
          API.AUTH_REFRESH,
        );
        const accessToken = response.data?.accessToken;
        if (accessToken) {
          tokenStorage.token = accessToken;
          currentToken = accessToken;
          token.value = currentToken;
        }
      } catch {
        /* no refresh possible */
      }
    }
    if (!currentToken) {
      _resolveReady();
      return;
    }
    try {
      const response = await http.get<ApiResponse<SessionUser>>(API.AUTH_ME);
      user.value = response.data;
      applyLocale(response.data.preferredLocale);
      startHeartbeat();
    } catch {
      clearSession();
    } finally {
      _resolveReady();
    }
  }

  async function login(username: string, password: string) {
    loading.value = true;
    try {
      const response = await http.post<ApiResponse<AuthResponse>>(API.AUTH_LOGIN, {
        username,
        password,
      });
      token.value = response.data.accessToken;
      tokenStorage.token = response.data.accessToken;
      const userResponse = await http.get<ApiResponse<SessionUser>>(API.USER_ME);
      user.value = userResponse.data;
      applyLocale(userResponse.data.preferredLocale);
      startHeartbeat();
    } finally {
      loading.value = false;
    }
  }

  async function register(
    username: string,
    password: string,
    profile?: {
      nickname?: string;
      avatar_url?: string;
      bio?: string;
      location?: string;
    },
  ) {
    loading.value = true;
    try {
      const response = await http.post<ApiResponse<AuthResponse>>(API.AUTH_REGISTER, {
        login_type: 'password',
        username,
        password,
        nickname: profile?.nickname,
        avatar_url: profile?.avatar_url,
        bio: profile?.bio,
        location: profile?.location,
      });
      token.value = response.data.accessToken;
      tokenStorage.token = response.data.accessToken;
      const userResponse = await http.get<ApiResponse<SessionUser>>(API.USER_ME);
      user.value = userResponse.data;
      applyLocale(userResponse.data.preferredLocale);
      startHeartbeat();
    } finally {
      loading.value = false;
    }
  }

  async function sendEmailCode(
    email: string,
    purpose: 'login' | 'register' | 'reset',
    locale?: 'zh-CN' | 'en',
  ) {
    return http.post<ApiResponse<{ ttlSeconds: number; resendCooldownSeconds: number }>>(
      API.AUTH_EMAIL_SEND_CODE,
      { email, purpose, locale },
    );
  }

  async function loginWithEmailCode(email: string, code: string) {
    loading.value = true;
    try {
      const response = await http.post<ApiResponse<AuthResponse>>(API.AUTH_EMAIL_LOGIN, {
        email,
        code,
      });
      token.value = response.data.accessToken;
      tokenStorage.token = response.data.accessToken;
      const userResponse = await http.get<ApiResponse<SessionUser>>(API.USER_ME);
      user.value = userResponse.data;
      applyLocale(userResponse.data.preferredLocale);
      startHeartbeat();
    } finally {
      loading.value = false;
    }
  }

  async function registerWithEmailCode(input: {
    email: string;
    code: string;
    username?: string;
    preferred_locale?: 'zh-CN' | 'en';
    nickname?: string;
    avatar_url?: string;
    bio?: string;
    location?: string;
  }) {
    loading.value = true;
    try {
      const response = await http.post<ApiResponse<AuthResponse>>(API.AUTH_REGISTER, {
        login_type: 'email',
        ...input,
      });
      token.value = response.data.accessToken;
      tokenStorage.token = response.data.accessToken;
      const userResponse = await http.get<ApiResponse<SessionUser>>(API.USER_ME);
      user.value = userResponse.data;
      applyLocale(userResponse.data.preferredLocale);
      startHeartbeat();
    } finally {
      loading.value = false;
    }
  }

  async function resetPasswordWithEmailCode(input: {
    email: string;
    code: string;
    password: string;
  }) {
    loading.value = true;
    try {
      return await http.post<ApiResponse<{ success: boolean }>>(
        API.AUTH_EMAIL_RESET_PASSWORD,
        input,
      );
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    try {
      if (token.value) {
        await http.post(API.AUTH_LOGOUT);
      }
    } finally {
      clearSession();
    }
  }

  async function syncFromRuntime() {
    const blog = useBlogStore();

    dashboardName.value = DASHBOARD_DEFAULTS.name;
    dashboardTitle.value = DASHBOARD_DEFAULTS.title;
    dashboardDescription.value =
      blog.hero?.description ?? 'Write long-term, build a system piece by piece.';
    dashboardBio.value = 'Building the content system, permission system, cache, and search.';
    dashboardStats.value = { posts: 0, links: 0, days: 0, views: 0 };
    dashboardAvatarUrl.value = '';
    dashboardWebsite.value = '';

    if (!user.value) return;

    dashboardLoading.value = true;
    try {
      const response = await http.get<ApiResponse<BlogDashboardVO>>(API.BLOG_DASHBOARD);
      const dashboard = response.data;
      dashboardName.value = dashboard.me.nickname || dashboard.me.username;
      dashboardTitle.value = `Hi, ${dashboard.me.username}`;
      dashboardDescription.value =
        dashboard.me.bio || 'Keep writing or organize your content and profile.';
      dashboardBio.value = dashboard.me.bio || '';
      dashboardStats.value = {
        posts: dashboard.posts.total,
        links: dashboard.me.website ? 1 : 0,
        days: dashboard.stats.days,
        views: dashboard.stats.views,
      };
      dashboardAvatarUrl.value = dashboard.me.avatar_url ?? '';
      dashboardWebsite.value = dashboard.me.website ?? '';
    } finally {
      dashboardLoading.value = false;
    }
  }

  return {
    token,
    user,
    loading,
    isAuthenticated,
    isOnline,
    dashboardName,
    dashboardTitle,
    dashboardDescription,
    dashboardBio,
    dashboardStats,
    dashboardAvatarUrl,
    dashboardWebsite,
    dashboardLoading,
    ready,
    clearSession,
    bootstrap,
    login,
    register,
    sendEmailCode,
    loginWithEmailCode,
    registerWithEmailCode,
    resetPasswordWithEmailCode,
    logout,
    syncFromRuntime,
  };
});
