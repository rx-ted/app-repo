import { defineStore } from 'pinia';
import { ref } from 'vue';
import { http } from '@/http';
import type { ApiResponse } from '@/http/types';
import { ERRORS } from '@/constants';
import { API } from '@/constants';
import { useAuthStore } from '@/stores/auth';

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

type Profile = {
  id: string;
  username: string;
  email: string | null;
  preferredLocale: 'zh-CN' | 'en';
  nickname: string | null;
  avatarUrl: string | null;
  gender: 'Male' | 'Female' | 'Unknown' | null;
  birthday: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
};

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<Profile | null>(null);
  const profileLoading = ref(false);
  const profileError = ref<string | null>(null);

  async function fetchProfile() {
    const auth = useAuthStore();
    if (!auth.token) return;
    profileLoading.value = true;
    profileError.value = null;
    try {
      const response = await http.get<ApiResponse<SessionUser>>(API.USER_ME);
      profile.value = response.data as unknown as Profile;
    } catch {
      profileError.value = ERRORS.LOAD_PROFILE_FAILED;
    } finally {
      profileLoading.value = false;
    }
  }

  return {
    profile,
    profileLoading,
    profileError,
    fetchProfile,
  };
});
