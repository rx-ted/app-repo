<template>
  <div class="guestbook-page">
    <div class="page-header">
      <div class="breadcrumb">
        <router-link to="/" class="breadcrumb-link">{{ t('nav.home') }}</router-link>
        <span class="breadcrumb-sep">/</span>
        <span class="breadcrumb-current">{{ t('guestbook.breadcrumb') }}</span>
      </div>
      <h1 class="page-title">{{ t('guestbook.title') }}</h1>
    </div>

    <div class="intro-card">
      <p class="intro-text">{{ t('guestbook.intro.p1') }}</p>
      <p class="intro-text">{{ t('guestbook.intro.p2') }}</p>
      <p class="intro-text">{{ t('guestbook.intro.p3') }}</p>
      <ul class="guidelines">
        <li>{{ t('guestbook.guideline.respect') }}</li>
        <li>{{ t('guestbook.guideline.share') }}</li>
        <li>{{ t('guestbook.guideline.support') }}</li>
      </ul>
    </div>

    <div class="guestbook-form">
      <template v-if="!isAuthenticated">
        <div class="form-row">
          <input
            v-model="authorName"
            class="form-input"
            :placeholder="t('guestbook.form.name')"
            maxlength="50"
          >
          <input
            v-model="authorEmail"
            class="form-input"
            type="email"
            :placeholder="t('guestbook.form.email')"
            maxlength="100"
          >
        </div>
      </template>
      <div v-else class="auth-info">
        {{ t('guestbook.form.postingAs') }} <strong>{{ userDisplayName }}</strong>
      </div>
      <textarea
        v-model="form.content"
        class="form-textarea"
        :placeholder="t('guestbook.form.placeholder')"
        maxlength="2000"
        rows="4"
      ></textarea>
      <div class="form-actions">
        <span v-if="submitError" class="submit-error">{{ t('guestbook.form.error') }}</span>
        <button class="submit-btn" :disabled="submitting || !formValid" @click="submit">
          {{ submitting ? t('guestbook.form.submitting') : t('guestbook.form.submit') }}
        </button>
      </div>
    </div>

    <div v-if="store.loading && !store.comments.length" class="loading-state">
      {{ t('guestbook.loading') }}
    </div>

    <div v-else-if="!store.comments.length && !store.loading" class="empty-state">
      {{ t('guestbook.empty') }}
    </div>

    <div v-else class="messages-list">
      <div v-for="msg in store.comments" :key="msg.id" class="message-item">
        <div class="msg-avatar">{{ msg.author.username.charAt(0) }}</div>
        <div class="msg-body">
          <div class="msg-meta">
            <span class="msg-name">{{ msg.author.displayName || msg.author.username }}</span>
            <span v-if="msg.author.location" class="msg-city">{{ msg.author.location }}</span>
            <span class="msg-date">{{ formatDate(msg.createdAt) }}</span>
          </div>
          <p class="msg-content">{{ msg.content }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useSessionStore } from '@/stores/session';
import { useCommentStore } from '@/stores/comment';

const { t } = useI18n();
const session = useSessionStore();
const store = useCommentStore();

const submitting = ref(false);
const submitError = ref('');

const form = ref({ content: '' });
const authorName = ref('');
const authorEmail = ref('');

const isAuthenticated = computed(() => session.isAuthenticated);
const userDisplayName = computed(() => session.user?.nickname || session.user?.username || '');

const formValid = computed(() => {
  if (!form.value.content.trim().length) return false;
  if (isAuthenticated.value) return true;
  return authorName.value.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail.value);
});

async function submit() {
  if (!formValid.value || submitting.value) return;
  submitting.value = true;
  submitError.value = '';
  try {
    const ok = await store.createComment({
      tag: 'guestbook',
      content: form.value.content.trim(),
      ...(isAuthenticated.value
        ? {}
        : { guestName: authorName.value.trim(), guestEmail: authorEmail.value.trim() }),
    });
    if (ok) {
      form.value = { content: '' };
      authorName.value = '';
      authorEmail.value = '';
    } else {
      submitError.value = t('guestbook.form.error');
    }
  } catch {
    submitError.value = t('guestbook.form.error');
  } finally {
    submitting.value = false;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

onMounted(() => {
  store.fetchComments(undefined, 'guestbook');
});
</script>

<style scoped>
.guestbook-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 0;
}

.page-header {
  margin-bottom: 28px;
}

.breadcrumb {
  font-size: 13px;
  color: var(--app-text-tertiary);
  margin-bottom: 8px;
}

.breadcrumb-link {
  color: var(--app-text-tertiary);
  text-decoration: none;
  transition: color 0.15s;
}

.breadcrumb-link:hover {
  color: var(--app-primary);
}

.breadcrumb-sep {
  margin: 0 6px;
}

.breadcrumb-current {
  color: var(--app-text-secondary);
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
}

.intro-card {
  margin-bottom: 32px;
}

.intro-text {
  font-size: 14px;
  line-height: 1.8;
  color: var(--app-text-secondary);
  margin: 0 0 12px;
}

.intro-text:last-of-type {
  margin-bottom: 16px;
}

.guidelines {
  margin: 0;
  padding-left: 20px;
  list-style: none;
}

.guidelines li {
  font-size: 13px;
  line-height: 1.8;
  color: var(--app-text-tertiary);
  position: relative;
}

.guidelines li::before {
  content: "·";
  position: absolute;
  left: -14px;
  color: var(--app-primary);
  font-weight: 700;
}

.loading-state,
.empty-state {
  padding: 64px 0;
  text-align: center;
  color: var(--app-text-tertiary);
  font-size: 14px;
}

.guestbook-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--app-border);
  background: var(--app-bg-container);
  margin-bottom: 24px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--app-border);
  background: var(--app-bg);
  color: var(--app-text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.form-input:focus {
  border-color: var(--app-primary);
}

.form-textarea {
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--app-border);
  background: var(--app-bg);
  color: var(--app-text);
  font-size: 14px;
  outline: none;
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
  transition: border-color 0.15s;
}

.form-textarea:focus {
  border-color: var(--app-primary);
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.submit-error {
  font-size: 13px;
  color: var(--app-error);
}

.submit-btn {
  padding: 8px 24px;
  border-radius: 8px;
  border: none;
  background: var(--app-primary);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-btn:not(:disabled):hover {
  opacity: 0.85;
}

.auth-info {
  font-size: 14px;
  color: var(--app-text-secondary);
  padding: 6px 0;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-item {
  display: flex;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid var(--app-border);
  background: var(--app-bg-container);
  transition: border-color 0.15s;
}

.message-item:hover {
  border-color: var(--app-border-hover);
}

.msg-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
  color: var(--app-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 600;
  flex-shrink: 0;
}

.msg-body {
  flex: 1;
  min-width: 0;
}

.msg-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.msg-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text);
}

.msg-city {
  font-size: 11px;
  color: var(--app-text-quaternary);
}

.msg-date {
  font-size: 11px;
  color: var(--app-text-quaternary);
}

.msg-content {
  font-size: 14px;
  color: var(--app-text-secondary);
  margin: 0;
  line-height: 1.7;
  white-space: pre-wrap;
}
</style>
