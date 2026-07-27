<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@/composables/useI18n';
import { http } from '@/http';
import type { ApiResponse } from '@/http/types';
import { useSessionStore } from '@/stores/session';
import type { UserProfileVO } from '@/types/community';
import {
  NSpin,
  NCard,
  NSpace,
  NTag,
  NAlert,
  NSelect,
  NInput,
  NButton,
  NDatePicker,
} from 'naive-ui';
import { API } from '@/constants';

const router = useRouter();
const session = useSessionStore();
const { t, setLocale } = useI18n();
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const success = ref('');

const emailForm = reactive({
  email: '',
  code: '',
});
const sendingEmailCode = ref(false);
const emailCooldownUntil = ref(0);
const emailRemainingSeconds = ref(0);
let emailCooldownTimer: ReturnType<typeof setInterval> | null = null;

const form = reactive({
  preferredLocale: 'zh-CN' as 'zh-CN' | 'en',
  nickname: '',
  avatarUrl: '',
  gender: 'Unknown' as 'Male' | 'Female' | 'Unknown' | null,
  birthday: null as number | null,
  bio: '',
  website: '',
  location: '',
});

const genderOptions = [
  { label: t('profile.gender.unknown'), value: 'Unknown' },
  { label: t('profile.gender.male'), value: 'Male' },
  { label: t('profile.gender.female'), value: 'Female' },
];

async function loadProfile() {
  if (!session.isAuthenticated) {
    router.push('/login');
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    const response = await http.get<ApiResponse<UserProfileVO | null>>(API.USER_ME);
    const profile = response.data;
    form.preferredLocale = profile?.preferredLocale ?? session.user?.preferredLocale ?? 'zh-CN';
    form.nickname = profile?.nickname ?? '';
    form.avatarUrl = profile?.avatarUrl ?? '';
    form.gender = profile?.gender ?? 'Unknown';
    form.birthday = profile?.birthday ? new Date(profile.birthday).getTime() : null;
    form.bio = profile?.bio ?? '';
    form.website = profile?.website ?? '';
    form.location = profile?.location ?? '';
    emailForm.email = profile?.email ?? '';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('profile.loadFailed');
  } finally {
    loading.value = false;
  }
}

async function saveProfile() {
  saving.value = true;
  error.value = '';
  success.value = '';
  try {
    await http.put(API.USER_PROFILE_UPDATE, {
      preferred_locale: form.preferredLocale,
      nickname: form.nickname.trim() || null,
      avatar_url: form.avatarUrl.trim() || null,
      gender: form.gender,
      birthday: form.birthday ? new Date(form.birthday).toISOString().split('T')[0] : null,
      bio: form.bio.trim() || null,
      website: form.website.trim() || null,
      location: form.location.trim() || null,
    });
    await session.syncFromRuntime();
    if (session.user) {
      session.user.preferredLocale = form.preferredLocale;
    }
    setLocale(form.preferredLocale);
    success.value = t('profile.saved');
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('profile.saveFailed');
  } finally {
    saving.value = false;
  }
}

async function bindGitHub() {
  error.value = '';
  success.value = '';
  try {
    const response = await http.get<ApiResponse<{ url: string }>>(
      `${API.OAUTH_GITHUB_BIND}?redirect=/profile`,
    );
    globalThis.window?.location.assign(response.data.url);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('profile.githubBindFailed');
  }
}

async function sendEmailCode() {
  error.value = '';
  success.value = '';
  sendingEmailCode.value = true;
  try {
    await http.post(API.USER_EMAIL_SEND_CODE, { email: emailForm.email });
    emailCooldownUntil.value = Date.now() + 60000;
    emailRemainingSeconds.value = 60;
    if (emailCooldownTimer) clearInterval(emailCooldownTimer);
    emailCooldownTimer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((emailCooldownUntil.value - Date.now()) / 1000));
      emailRemainingSeconds.value = remaining;
      if (remaining <= 0 && emailCooldownTimer) {
        clearInterval(emailCooldownTimer);
        emailCooldownTimer = null;
      }
    }, 1000);
    success.value = t('profile.emailCodeSent');
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('profile.emailCodeFailed');
  } finally {
    sendingEmailCode.value = false;
  }
}

async function updateEmail() {
  error.value = '';
  success.value = '';
  try {
    await http.put(API.USER_EMAIL_UPDATE, {
      email: emailForm.email,
      code: emailForm.code,
    });
    session.user!.email = emailForm.email;
    if (emailCooldownTimer) clearInterval(emailCooldownTimer);
    emailForm.code = '';
    emailRemainingSeconds.value = 0;
    success.value = t('profile.emailUpdated');
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('profile.emailUpdateFailed');
  }
}

onMounted(() => {
  const params = new URLSearchParams(globalThis.window?.location.search ?? '');
  if (params.get('github') === 'connected') {
    success.value = t('profile.githubConnected');
    globalThis.window?.history.replaceState(
      {},
      '',
      globalThis.window?.location.pathname ?? '/profile',
    );
  }
  void loadProfile();
});
</script>

<template>
  <div class="profile-shell">
    <n-spin :show="loading">
      <n-card :title="t('profile.title')">
        <template #header-extra>
          <n-space>
            <n-tag v-for="role in session.user?.roles ?? []" :key="role" size="small">
              {{ role }}
            </n-tag>
          </n-space>
        </template>

        <n-alert v-if="error" type="error" :show-icon="false" class="notice">
          {{ error }}
        </n-alert>
        <n-alert v-if="success" type="success" :show-icon="false" class="notice">
          {{ success }}
        </n-alert>

        <div class="field-grid">
          <div class="field">
            <label>{{ t('profile.locale') }}</label>
            <n-select
              v-model:value="form.preferredLocale"
              :options="[
                    { label: '中文', value: 'zh-CN' },
                    { label: 'English', value: 'en' },
                  ]"
            />
          </div>
          <div class="field">
            <label>{{ t('profile.username') }}</label>
            <n-input :value="session.user?.username ?? ''" disabled />
          </div>
          <div class="field">
            <label>{{ t('profile.nickname') }}</label>
            <n-input
              v-model:value="form.nickname"
              :placeholder="t('profile.nicknamePlaceholder')"
            />
          </div>
        </div>

        <div class="field">
          <label>{{ t('profile.email') }}</label>
          <div class="email-row">
            <n-input v-model:value="emailForm.email" :placeholder="t('profile.emailPlaceholder')" />
            <n-button
              secondary
              type="primary"
              :disabled="emailRemainingSeconds > 0 || !emailForm.email"
              :loading="sendingEmailCode"
              @click="sendEmailCode"
            >
              {{ emailRemainingSeconds > 0 ? `${emailRemainingSeconds}s` : t('profile.sendCode') }}
            </n-button>
          </div>
          <div v-if="emailRemainingSeconds > 0" class="code-row">
            <n-input v-model:value="emailForm.code" :placeholder="t('profile.codePlaceholder')" />
            <n-button secondary type="success" :disabled="!emailForm.code" @click="updateEmail">
              {{ t('profile.verifyEmail') }}
            </n-button>
          </div>
        </div>

        <div class="field">
          <label>{{ t('profile.githubStatus') }}</label>
          <div class="bind-row">
            <n-button secondary type="primary" @click="bindGitHub">
              {{ t('profile.githubBind') }}
            </n-button>
          </div>
        </div>

        <div class="field">
          <label>{{ t('profile.avatarUrl') }}</label>
          <n-input v-model:value="form.avatarUrl" placeholder="https://example.com/avatar.png" />
        </div>

        <div class="field-grid">
          <div class="field">
            <label>{{ t('profile.gender') }}</label>
            <n-select v-model:value="form.gender" :options="genderOptions" />
          </div>
          <div class="field">
            <label>{{ t('profile.birthday') }}</label>
            <n-date-picker
              v-model:value="form.birthday"
              type="date"
              :placeholder="t('profile.birthdayPlaceholder')"
              clearable
            />
          </div>
        </div>

        <div class="field">
          <label>{{ t('profile.bio') }}</label>
          <n-input
            v-model:value="form.bio"
            type="textarea"
            :autosize="{ minRows: 4, maxRows: 6 }"
            :placeholder="t('profile.bioPlaceholder')"
          />
        </div>

        <div class="field-grid">
          <div class="field">
            <label>{{ t('profile.website') }}</label>
            <n-input v-model:value="form.website" placeholder="https://your.site" />
          </div>
          <div class="field">
            <label>{{ t('profile.location') }}</label>
            <n-input v-model:value="form.location" placeholder="Shanghai / Remote / ..." />
          </div>
        </div>

        <div class="actions">
          <n-button type="primary" :loading="saving" @click="saveProfile">
            {{ t('profile.save') }}
          </n-button>
        </div>
      </n-card>
    </n-spin>
  </div>
</template>

<style scoped>
.profile-shell {
  max-width: 880px;
  margin: 32px auto;
}

.notice {
  margin-bottom: 16px;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.field {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}

.field label {
  color: var(--app-text-secondary);
  font-size: 13px;
}

.bind-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.email-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  width: 100%;
}

.code-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  width: 100%;
  margin-top: 8px;
}

@media (max-width: 720px) {
  .field-grid {
    grid-template-columns: 1fr;
  }

  .bind-row {
    grid-template-columns: 1fr;
  }

  .email-row {
    grid-template-columns: 1fr;
  }

  .code-row {
    grid-template-columns: 1fr;
  }
}
</style>
