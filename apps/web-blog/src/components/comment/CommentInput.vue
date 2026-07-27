<template>
  <div class="comment-input-wrapper">
    <div v-if="guestMode" class="guest-fields">
      <input
        v-model="guestName"
        type="text"
        placeholder="昵称（必填）"
        class="guest-input"
        maxlength="50"
      >
      <input
        v-model="guestEmail"
        type="email"
        placeholder="邮箱（必填，用于头像）"
        class="guest-input"
        maxlength="255"
      >
      <input
        v-model="guestWebsite"
        type="url"
        placeholder="网址（可选）"
        class="guest-input"
        maxlength="500"
      >
    </div>
    <textarea
      v-model="content"
      :placeholder="placeholder"
      rows="3"
      class="comment-textarea"
      @keydown.meta.enter="submit"
      @keydown.ctrl.enter="submit"
    />
    <div class="comment-input-footer">
      <span class="markdown-hint">支持 Markdown 语法</span>
      <button class="comment-submit" :disabled="!canSubmit || submitting" @click="submit">
        {{ submitting ? '发布中...' : '发表评论' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = withDefaults(
  defineProps<{
    placeholder?: string;
    submitting?: boolean;
    guestMode?: boolean;
  }>(),
  {
    placeholder: '写下你的评论...',
    submitting: false,
    guestMode: false,
  },
);

const emit = defineEmits<{
  submit: [content: string, guestName?: string, guestEmail?: string, guestWebsite?: string];
}>();

const content = ref('');
const guestName = ref('');
const guestEmail = ref('');
const guestWebsite = ref('');

const canSubmit = computed(() => {
  if (!content.value.trim()) return false;
  if (props.guestMode && !guestName.value.trim()) return false;
  if (props.guestMode && !guestEmail.value.trim()) return false;
  return true;
});

function submit() {
  if (!content.value.trim() || props.submitting) return;
  if (props.guestMode && (!guestName.value.trim() || !guestEmail.value.trim())) return;
  emit(
    'submit',
    content.value.trim(),
    guestName.value.trim() || undefined,
    guestEmail.value.trim() || undefined,
    guestWebsite.value.trim() || undefined,
  );
  content.value = '';
  if (props.guestMode) {
    guestName.value = '';
    guestEmail.value = '';
    guestWebsite.value = '';
  }
}
</script>

<style scoped>
.comment-input-wrapper {
  margin-bottom: 20px;
}

.comment-textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
  background: var(--app-bg);
  color: var(--app-text);
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.comment-textarea:focus {
  outline: none;
  border-color: var(--app-primary);
}

.comment-input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.markdown-hint {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.comment-submit {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  background: var(--app-primary);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.comment-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.comment-submit:not(:disabled):hover {
  opacity: 0.9;
}

.guest-fields {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.guest-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  background: var(--app-bg);
  color: var(--app-text);
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.guest-input:focus {
  outline: none;
  border-color: var(--app-primary);
}
</style>
