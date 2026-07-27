<script setup lang="ts">
import { computed, reactive, ref, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@/composables/useI18n';
import { useSessionStore } from '@/stores/session';
import { NCard, NAlert, NInput, NButton } from 'naive-ui';

const router = useRouter();
const session = useSessionStore();
const { t } = useI18n();
const form = reactive({
  email: '',
  code: '',
  password: '',
  confirmPassword: '',
});
const error = ref('');
const success = ref('');
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

async function sendCode() {
  error.value = '';
  success.value = '';
  sendingCode.value = true;
  try {
    const response = await session.sendEmailCode(form.email, 'reset', 'zh-CN');
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

async function submit() {
  error.value = '';
  success.value = '';
  if (passwordMismatch.value) {
    error.value = t('auth.register.passwordMismatch');
    return;
  }
  try {
    await session.resetPasswordWithEmailCode({
      email: form.email,
      code: form.code,
      password: form.password,
    });
    success.value = t('auth.forgot.success');
    setTimeout(() => {
      router.push('/login');
    }, 800);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('auth.forgot.failed');
  }
}
</script>

<template>
  <div class="auth-page">
    <RouterLink to="/" class="back-home">{{ t('nav.backHome') }}</RouterLink>
    <div class="forgot-shell">
      <n-card :title="t('auth.forgot.title')">
        <p>{{ t("auth.forgot.description") }}</p>
        <n-alert v-if="error" type="error" :show-icon="false" class="notice">
          {{ error }}
        </n-alert>
        <n-alert v-if="success" type="success" :show-icon="false" class="notice">
          {{ success }}
        </n-alert>
        <div class="field">
          <n-input v-model:value="form.email" :placeholder="t('auth.forgot.emailPlaceholder')" />
        </div>
        <div class="field code-row">
          <n-input v-model:value="form.code" :placeholder="t('auth.email.codePlaceholder')" />
          <n-button
            secondary
            type="primary"
            :disabled="remainingSeconds > 0 || !form.email"
            :loading="sendingCode"
            @click="sendCode"
          >
            {{ remainingSeconds > 0
                  ? `${remainingSeconds}s`
                  : t("auth.email.sendCode") }}
          </n-button>
        </div>
        <div class="field">
          <n-input
            v-model:value="form.password"
            type="password"
            show-password-on="click"
            :placeholder="t('auth.forgot.passwordPlaceholder')"
          />
        </div>
        <div class="field">
          <n-input
            v-model:value="form.confirmPassword"
            type="password"
            show-password-on="click"
            :placeholder="t('auth.forgot.confirmPasswordPlaceholder')"
          />
        </div>
        <div class="actions">
          <n-button type="primary" :loading="session.loading" @click="submit">
            {{ t("auth.forgot.submit") }}
          </n-button>
          <RouterLink to="/login">{{ t("auth.forgot.back") }}</RouterLink>
        </div>
      </n-card>
    </div>
  </div>
</template>

<style scoped>
.forgot-shell {
  max-width: 520px;
  margin: 64px auto;
}

.notice,
.field {
  margin-bottom: 14px;
}

.code-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}

.actions {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 640px) {
  .code-row {
    grid-template-columns: 1fr;
  }
}

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
