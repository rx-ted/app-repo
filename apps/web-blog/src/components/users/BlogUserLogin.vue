<script setup lang="ts">
import { computed, reactive, ref, onUnmounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '@/composables/useI18n';
import { httpConfig } from '@/config/http';
import { useSessionStore } from '@/stores/session';
import {
  NAlert,
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NTabs,
  NTabPane,
  type FormRules,
} from 'naive-ui';
import AppIcon from '@/components/AppIcon.vue';
import { useTheme } from '@/theme/useTheme';

const router = useRouter();
const toggleAppearance = inject('toggle-appearance', () => {});
const { isDark } = useTheme();
const route = useRoute();
const redirect = computed(() => {
  const r = route.query.redirect;
  return typeof r === 'string' && r.startsWith('/') ? r : '/';
});
const ssoRedirect = computed(() => encodeURIComponent(redirect.value));
const session = useSessionStore();
const { t } = useI18n();
const form = reactive({
  username: '',
  password: '',
});
const formRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 6, message: '用户名至少 6 位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
};
const emailForm = reactive({
  email: '',
  code: '',
});
const error = ref('');
const success = ref('');
const loginMode = ref<'password' | 'email' | 'sso'>('password');
const showPassword = ref(false);
const cooldownUntil = ref(0);
const remainingSeconds = ref(0);
const sendingCode = ref(false);
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
});

const ssoProviders = [
  {
    key: 'google',
    label: 'Google',
    icon: 'logos:google-icon',
    url: `${httpConfig.baseURL}/auth/oauth/google?redirect=${ssoRedirect.value}`,
  },
  {
    key: 'github',
    label: 'GitHub',
    icon: 'mdi:github',
    url: `${httpConfig.baseURL}/auth/oauth/github?redirect=${ssoRedirect.value}`,
  },
] as const;

async function submit() {
  error.value = '';
  success.value = '';
  try {
    await session.login(form.username, form.password);
    router.push(redirect.value);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('auth.login.failed');
  }
}

async function sendCode() {
  error.value = '';
  success.value = '';
  sendingCode.value = true;
  try {
    const response = await session.sendEmailCode(
      emailForm.email,
      'login',
      session.user?.preferredLocale ?? 'zh-CN',
    );
    sendingCode.value = false;
    cooldownUntil.value = Date.now() + response.data.resendCooldownSeconds * 1000;
    remainingSeconds.value = response.data.resendCooldownSeconds;
    if (cooldownTimer) clearInterval(cooldownTimer);
    cooldownTimer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil.value - Date.now()) / 1000));
      remainingSeconds.value = remaining;
      if (remaining <= 0 && cooldownTimer) {
        clearInterval(cooldownTimer);
        cooldownTimer = null;
      }
    }, 1000);
    success.value = t('auth.email.codeSent');
  } catch (cause) {
    sendingCode.value = false;
    error.value = cause instanceof Error ? cause.message : t('auth.email.codeSendFailed');
  }
}

async function submitEmailLogin() {
  error.value = '';
  success.value = '';
  try {
    await session.loginWithEmailCode(emailForm.email, emailForm.code);
    router.push(redirect.value);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('auth.login.failed');
  }
}

function loginWithSSO(url: string) {
  globalThis.window?.location.assign(url);
}
</script>

<template>
  <div class="auth-shell">
    <n-card class="auth-card" :title="t('auth.login.title')">
      <n-alert v-if="error" type="error" :show-icon="false">
        {{ error }}
      </n-alert>
      <n-alert v-if="success" type="success" :show-icon="false" class="auth-alert">
        {{ success }}
      </n-alert>

      <n-tabs v-model:value="loginMode" animated>
        <n-tab-pane name="password" :tab="t('auth.login.passwordTab')">
          <n-form :model="form" :rules="formRules" @submit.prevent="submit">
            <n-form-item :label="t('auth.login.username')" path="username">
              <n-input
                v-model:value="form.username"
                :placeholder="t('auth.login.usernamePlaceholder')"
              />
            </n-form-item>
            <n-form-item :label="t('auth.login.password')" path="password">
              <n-input
                v-model:value="form.password"
                :type="showPassword ? 'text' : 'password'"
                :placeholder="t('auth.login.passwordPlaceholder')"
              >
                <template #suffix>
                  <AppIcon
                    :name="showPassword ? 'line-md:eye-off' : 'line-md:eye'"
                    :width="18"
                    :height="18"
                    style="cursor:pointer"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </n-input>
            </n-form-item>
            <n-button type="primary" block :loading="session.loading" @click="submit">
              {{ t("auth.login.submit") }}
            </n-button>
          </n-form>
        </n-tab-pane>

        <n-tab-pane name="email" :tab="t('auth.email.loginTab')">
          <n-form @submit.prevent="submitEmailLogin">
            <n-form-item :label="t('auth.email.address')">
              <n-input
                v-model:value="emailForm.email"
                :placeholder="t('auth.email.addressPlaceholder')"
              />
            </n-form-item>
            <n-form-item :label="t('auth.email.code')">
              <div class="code-row">
                <n-input
                  v-model:value="emailForm.code"
                  :placeholder="t('auth.email.codePlaceholder')"
                />
                <n-button
                  secondary
                  type="primary"
                  :disabled="remainingSeconds > 0 || !emailForm.email"
                  :loading="sendingCode"
                  @click="sendCode"
                >
                  {{ remainingSeconds > 0
                      ? `${remainingSeconds}s`
                      : t("auth.email.sendCode") }}
                </n-button>
              </div>
            </n-form-item>
            <n-button type="primary" block :loading="session.loading" @click="submitEmailLogin">
              {{ t("auth.email.loginSubmit") }}
            </n-button>
          </n-form>
        </n-tab-pane>

        <n-tab-pane name="sso" :tab="t('auth.login.sso')">
          <div class="sso-grid">
            <n-button
              v-for="provider in ssoProviders"
              :key="provider.key"
              block
              secondary
              class="sso-button"
              @click="loginWithSSO(provider.url)"
            >
              <template #icon>
                <AppIcon :name="provider.icon" :width="18" :height="18" />
              </template>
              {{ provider.label }}
            </n-button>
          </div>
        </n-tab-pane>
      </n-tabs>

      <div class="auth-links">
        <button class="theme-toggle-btn" @click="toggleAppearance()">
          <AppIcon
            :name="isDark ? 'line-md:sunny-filled-loop-to-moon-filled-transition' : 'line-md:moon-filled-to-sunny-filled-loop-transition'"
            :width="18"
            :height="18"
          />
        </button>
        <RouterLink to="/register">{{ t("auth.login.register") }}</RouterLink>
        <RouterLink to="/forgot-password">{{ t("auth.login.forgot") }}</RouterLink>
      </div>
    </n-card>
  </div>
</template>

<style scoped>
.auth-shell {
  max-width: 480px;
  margin: 64px auto;
}

.auth-card {
  border-radius: 20px;
}

.auth-alert {
  margin-bottom: 12px;
}

.code-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  width: 100%;
}

.sso-grid {
  display: grid;
  gap: 10px;
}

.sso-button {
  justify-content: flex-start;
  min-height: 44px;
}

.auth-links {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 16px;
}

.theme-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: var(--app-text-secondary);
  margin-right: auto;
}
.theme-toggle-btn:hover {
  background: var(--app-bg-soft);
}

@media (max-width: 640px) {
  .code-row {
    grid-template-columns: 1fr;
  }
}
</style>
