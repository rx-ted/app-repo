<script setup lang="ts">
import { computed, reactive, ref, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@/composables/useI18n';
import { useSessionStore } from '@/stores/session';
import {
  NAlert,
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NTabs,
  NTabPane,
} from 'naive-ui';

const router = useRouter();
const session = useSessionStore();
const { t } = useI18n();
const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  nickname: '',
  avatar_url: '',
  bio: '',
  location: '',
});
const emailForm = reactive({
  email: '',
  code: '',
  username: '',
  preferred_locale: 'zh-CN' as 'zh-CN' | 'en',
  nickname: '',
  avatar_url: '',
  bio: '',
  location: '',
});
const error = ref('');
const success = ref('');
const registerMode = ref<'email' | 'password'>('email');
const cooldownUntil = ref(0);
const remainingSeconds = ref(0);
const sendingCode = ref(false);
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
});

const passwordMismatch = computed(
  () => Boolean(form.confirmPassword) && form.password !== form.confirmPassword,
);

async function submit() {
  error.value = '';
  success.value = '';
  if (passwordMismatch.value) {
    error.value = t('auth.register.passwordMismatch');
    return;
  }
  try {
    await session.register(form.username, form.password, {
      nickname: form.nickname || undefined,
      avatar_url: form.avatar_url || undefined,
      bio: form.bio || undefined,
      location: form.location || undefined,
    });
    router.push('/dashboard');
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('auth.register.failed');
  }
}

async function sendCode() {
  error.value = '';
  success.value = '';
  sendingCode.value = true;
  try {
    const response = await session.sendEmailCode(
      emailForm.email,
      'register',
      emailForm.preferred_locale,
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

async function submitEmailRegister() {
  error.value = '';
  success.value = '';
  try {
    await session.registerWithEmailCode({
      email: emailForm.email,
      code: emailForm.code,
      username: emailForm.username || undefined,
      preferred_locale: emailForm.preferred_locale,
      nickname: emailForm.nickname || undefined,
      avatar_url: emailForm.avatar_url || undefined,
      bio: emailForm.bio || undefined,
      location: emailForm.location || undefined,
    });
    router.push('/dashboard');
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('auth.register.failed');
  }
}
</script>

<template>
  <div class="auth-shell">
    <n-card class="auth-card" :title="t('auth.register.title')">
      <n-alert v-if="error" type="error" :show-icon="false">
        {{ error }}
      </n-alert>
      <n-alert v-if="success" type="success" :show-icon="false" class="auth-alert">
        {{ success }}
      </n-alert>
      <n-tabs v-model:value="registerMode" animated>
        <n-tab-pane name="email" :tab="t('auth.email.registerTab')">
          <n-form @submit.prevent="submitEmailRegister">
            <n-form-item :label="t('auth.email.address')">
              <n-input
                v-model:value="emailForm.email"
                :placeholder="t('auth.email.addressPlaceholder')"
              />
            </n-form-item>
            <n-form-item :label="t('auth.register.username')">
              <n-input
                v-model:value="emailForm.username"
                :placeholder="t('auth.email.registerUsernamePlaceholder')"
              />
            </n-form-item>
            <n-form-item :label="t('auth.register.nickname')">
              <n-input
                v-model:value="emailForm.nickname"
                :placeholder="t('auth.register.nicknamePlaceholder')"
              />
            </n-form-item>
            <n-form-item :label="t('auth.register.avatarUrl')">
              <n-input
                v-model:value="emailForm.avatar_url"
                :placeholder="t('auth.register.avatarUrlPlaceholder')"
              />
            </n-form-item>
            <n-form-item :label="t('auth.register.bio')">
              <n-input
                v-model:value="emailForm.bio"
                type="textarea"
                :placeholder="t('auth.register.bioPlaceholder')"
              />
            </n-form-item>
            <n-form-item :label="t('auth.register.location')">
              <n-input
                v-model:value="emailForm.location"
                :placeholder="t('auth.register.locationPlaceholder')"
              />
            </n-form-item>
            <n-form-item :label="t('locale.label')">
              <n-select
                v-model:value="emailForm.preferred_locale"
                :options="[
                  { label: t('locale.zh-CN'), value: 'zh-CN' },
                  { label: t('locale.en'), value: 'en' },
                ]"
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
            <n-button type="primary" block :loading="session.loading" attr-type="submit">
              {{ t("auth.email.registerSubmit") }}
            </n-button>
          </n-form>
        </n-tab-pane>

        <n-tab-pane name="password" :tab="t('auth.register.passwordTab')">
          <n-form @submit.prevent="submit">
            <n-form-item :label="t('auth.register.username')">
              <n-input
                v-model:value="form.username"
                :placeholder="t('auth.register.usernamePlaceholder')"
              />
            </n-form-item>
            <n-form-item :label="t('auth.register.password')">
              <n-input v-model:value="form.password" type="password" show-password-on="click" />
            </n-form-item>
            <n-form-item
              :label="t('auth.register.confirmPassword')"
              :validation-status="passwordMismatch ? 'error' : undefined"
            >
              <n-input
                v-model:value="form.confirmPassword"
                type="password"
                show-password-on="click"
              />
            </n-form-item>
            <n-form-item :label="t('auth.register.nickname')">
              <n-input
                v-model:value="form.nickname"
                :placeholder="t('auth.register.nicknamePlaceholder')"
              />
            </n-form-item>
            <n-form-item :label="t('auth.register.avatarUrl')">
              <n-input
                v-model:value="form.avatar_url"
                :placeholder="t('auth.register.avatarUrlPlaceholder')"
              />
            </n-form-item>
            <n-form-item :label="t('auth.register.bio')">
              <n-input
                v-model:value="form.bio"
                type="textarea"
                :placeholder="t('auth.register.bioPlaceholder')"
              />
            </n-form-item>
            <n-form-item :label="t('auth.register.location')">
              <n-input
                v-model:value="form.location"
                :placeholder="t('auth.register.locationPlaceholder')"
              />
            </n-form-item>
            <n-button type="primary" block :loading="session.loading" attr-type="submit">
              {{ t("auth.register.submit") }}
            </n-button>
          </n-form>
        </n-tab-pane>
      </n-tabs>

      <div class="auth-links">
        <RouterLink to="/login">{{ t("auth.register.login") }}</RouterLink>
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

.auth-links {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

@media (max-width: 640px) {
  .code-row {
    grid-template-columns: 1fr;
  }
}
</style>
