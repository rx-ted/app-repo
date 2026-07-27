<template>
  <div class="friends-page">
    <div class="page-header">
      <div class="header-top">
        <div>
          <h1 class="page-title">{{ t('discover.title') }}</h1>
          <p class="page-subtitle">{{ t('discover.subtitle', { count: filtered.length }) }}</p>
        </div>
        <n-button type="primary" @click="showModal = true">
          {{ t('discover.add') }}
        </n-button>
      </div>
    </div>

    <div class="notice-board">
      <div class="notice-item">
        <span class="notice-icon">🔗</span>
        <span>{{ t('discover.notice.curated') }}</span>
      </div>
      <div class="notice-item">
        <span class="notice-icon">📝</span>
        <span>{{ t('discover.notice.category') }}</span>
      </div>
      <div class="notice-item">
        <span class="notice-icon">➕</span>
        <span>{{ t('discover.notice.submit') }}</span>
      </div>
      <div class="notice-item">
        <span class="notice-icon">✅</span>
        <span>{{ t('discover.notice.check') }}</span>
      </div>
    </div>

    <div class="filter-bar">
      <button
        v-for="cat in categories"
        :key="cat.value"
        class="filter-btn"
        :class="{ active: activeCategory === cat.value }"
        @click="activeCategory = cat.value"
      >
        {{ cat.label }}
      </button>
      <span class="filter-divider" />
      <button
        class="filter-btn"
        :class="{ active: showActiveOnly }"
        @click="showActiveOnly = !showActiveOnly"
      >
        {{ showActiveOnly ? t('discover.filter.active') : t('discover.filter.all') }}
      </button>
    </div>

    <div v-if="loading" class="loading-state">{{ t('discover.loading') }}</div>

    <div v-else-if="!filtered.length" class="empty-state">{{ t('discover.empty') }}</div>

    <div v-else class="links-grid">
      <a
        v-for="link in filtered"
        :key="link.id"
        :href="link.url"
        class="link-card"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div class="card-logo">
          <img v-if="link.logo" :src="link.logo" :alt="link.name">
          <span v-else class="logo-fallback">{{ link.name.charAt(0) }}</span>
        </div>
        <div class="card-body">
          <div class="card-name-row">
            <h3 class="card-name">{{ link.name }}</h3>
            <AppIcon name="tabler:external-link" :width="12" :height="12" class="card-ext-link" />
            <span class="card-category">{{ categoryLabel(link.category) }}</span>
            <span v-if="link.status === 'unreachable'" class="card-badge badge-error">失效</span>
            <span v-else-if="link.status === 'pending'" class="card-badge badge-pending">待检</span>
          </div>
          <p v-if="link.description" class="card-desc">{{ link.description }}</p>
        </div>
      </a>
    </div>

    <n-modal v-model:show="showModal" preset="card" :title="t('discover.add')" style="width:520px">
      <n-form :model="form" :rules="formRules" ref="formRef">
        <n-form-item :label="t('discover.form.name')" path="name">
          <n-input v-model:value="form.name" :placeholder="t('discover.form.name.placeholder')" />
        </n-form-item>
        <n-form-item :label="t('discover.form.url')" path="url">
          <n-input v-model:value="form.url" :placeholder="t('discover.form.url.placeholder')" />
        </n-form-item>
        <n-form-item :label="t('discover.form.logo')" path="logo">
          <n-input v-model:value="form.logo" :placeholder="t('discover.form.logo.placeholder')" />
        </n-form-item>
        <n-form-item :label="t('discover.form.description')" path="description">
          <n-input v-model:value="form.description" type="textarea" :placeholder="t('discover.form.description.placeholder')" />
        </n-form-item>
        <n-form-item :label="t('discover.form.category')" path="category">
          <n-select v-model:value="form.category" :options="categoryOptions" :placeholder="t('discover.form.category.placeholder')" />
        </n-form-item>
        <n-divider />
        <n-form-item :label="t('discover.form.email')" path="email">
          <n-input v-model:value="form.email" :placeholder="t('discover.form.email.placeholder')" />
        </n-form-item>
        <n-form-item :label="t('discover.form.code')" path="code">
          <div class="code-input-row">
            <n-input v-model:value="form.code" :placeholder="t('discover.form.code.placeholder')" maxlength="6" />
            <n-button
              size="small"
              :loading="sendingCode"
              :disabled="!form.email || cooldown > 0"
              @click="handleSendCode"
            >
              {{ cooldown > 0 ? t('discover.cooldown', { seconds: cooldown }) : t('discover.form.sendCode') }}
            </n-button>
          </div>
        </n-form-item>
      </n-form>
      <n-alert v-if="submitError" type="error" :show-icon="false" closable>
        {{ submitError }}
      </n-alert>
      <n-alert v-if="submitSuccess" type="success" :show-icon="false" closable>
        {{ t('discover.success.created') }}
      </n-alert>

      <template #footer>
        <n-button class="friends-cancel" @click="handleReset">{{ t('discover.form.cancel') }}</n-button>
        <n-button type="primary" :loading="submitting" :disabled="submitSuccess" @click="handleSubmit">
          {{ t('discover.form.submit') }}
        </n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { NButton, NModal, NForm, NFormItem, NInput, NSelect, NAlert, NDivider } from 'naive-ui';
import type { FormRules, FormInst } from 'naive-ui';
import { http } from '@/http';
import { API } from '@/constants/api';
import { useI18n } from '@/composables/useI18n';
import AppIcon from '@/components/AppIcon.vue';

const { t } = useI18n();

interface FriendLink {
  id: number;
  name: string;
  url: string;
  logo: string | null;
  description: string | null;
  category: string | null;
  status: string | null;
}

const CATEGORIES = [
  { value: 'blog', label: t('discover.category.blog') },
  { value: 'docs', label: t('discover.category.docs') },
  { value: 'framework', label: t('discover.category.framework') },
  { value: 'mail', label: t('discover.category.mail') },
  { value: 'mall', label: t('discover.category.mall') },
  { value: 'community', label: t('discover.category.community') },
  { value: 'tool', label: t('discover.category.tool') },
  { value: 'other', label: t('discover.category.other') },
];

const loading = ref(false);
const links = ref<FriendLink[]>([]);
const activeCategory = ref('');
const showActiveOnly = ref(false);

const categories = computed(() => [{ value: '', label: t('discover.filter.all') }, ...CATEGORIES]);

const filtered = computed(() => {
  let result = links.value;
  if (activeCategory.value) {
    result = result.filter((l) => l.category === activeCategory.value);
  }
  if (showActiveOnly.value) {
    result = result.filter((l) => l.status === 'active');
  }
  return result;
});

const categoryLabel = (value: string | null) => {
  const cat = CATEGORIES.find((c) => c.value === value);
  return cat?.label ?? value ?? '';
};

const categoryOptions = CATEGORIES;

function categoryColor(cat: string | null): string {
  const colors: Record<string, string> = {
    blog: '#18a058',
    docs: '#2080f0',
    framework: '#d03050',
    mail: '#f0a020',
    mall: '#e060c0',
    community: '#36b',
    tool: '#808080',
  };
  return colors[cat ?? ''] ?? '#808080';
}

onMounted(async () => {
  loading.value = true;
  try {
    const body = await http.get<{ data: FriendLink[] }>(API.DISCOVERIES);
    links.value = Array.isArray(body.data) ? body.data : [];
  } catch {
    links.value = [];
  } finally {
    loading.value = false;
  }
});

const showModal = ref(false);
const sendingCode = ref(false);
const submitting = ref(false);
const cooldown = ref(0);
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

const form = reactive({
  name: '',
  url: '',
  logo: '',
  description: '',
  category: 'other' as string,
  email: '',
  code: '',
});

function handleReset() {
  showModal.value = false;
  form.name = '';
  form.url = '';
  form.logo = '';
  form.description = '';
  form.category = 'other';
  form.email = '';
  form.code = '';
  submitError.value = '';
  submitSuccess.value = false;
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldown.value = 0;
}

const formRef = ref<FormInst | null>(null);

const formRules: FormRules = {
  name: [
    { required: true, message: '请输入站点名称', trigger: 'blur' },
    { max: 100, message: '名称不超过100字', trigger: 'blur' },
  ],
  url: [
    { required: true, message: '请输入站点链接', trigger: 'blur' },
    { pattern: /^https?:\/\/.+/, message: '请输入有效链接', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码为6位数字', trigger: 'blur' },
  ],
};

const submitError = ref('');
const submitSuccess = ref(false);

async function handleSendCode() {
  if (!form.email) return;
  sendingCode.value = true;
  try {
    await http.post(API.DISCOVERIES_SEND_CODE, { email: form.email });
    cooldown.value = 60;
    cooldownTimer = setInterval(() => {
      cooldown.value--;
      if (cooldown.value <= 0) {
        if (cooldownTimer) clearInterval(cooldownTimer);
      }
    }, 1000);
  } catch {
    submitError.value = t('discover.error.codeFailed');
  } finally {
    sendingCode.value = false;
  }
}

async function handleSubmit() {
  submitError.value = '';
  submitSuccess.value = false;

  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    const body: Record<string, unknown> = {
      name: form.name,
      url: form.url,
      email: form.email,
      code: form.code,
      category: form.category || 'other',
    };
    if (form.logo) body.logo = form.logo;
    if (form.description) body.description = form.description;

    await http.post(API.DISCOVERIES, body);
    submitSuccess.value = true;

    setTimeout(() => {
      handleReset();
    }, 2000);
  } catch (err: any) {
    if (err?.message?.includes('验证码')) {
      submitError.value = t('discover.error.invalidCode');
    } else {
      submitError.value = t('discover.error.createFailed');
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.friends-page {
  padding: 32px 0;
}
.page-header {
  margin-bottom: 20px;
}
.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.page-title {
  font-size: 26px;
  font-weight: 700;
  margin: 0;
}
.page-subtitle {
  font-size: 14px;
  color: var(--app-text-secondary);
  margin: 6px 0 0;
}
.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.filter-btn {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid var(--app-border);
  background: transparent;
  color: var(--app-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.18s ease;
}
.filter-btn:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
}
.filter-btn.active {
  background: var(--app-primary);
  border-color: var(--app-primary);
  color: #fff;
}
.filter-divider {
  width: 1px;
  height: 20px;
  background: var(--app-border);
  align-self: center;
}
.loading-state,
.empty-state {
  padding: 48px 0;
  text-align: center;
  color: var(--app-text-tertiary);
}
.links-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media (max-width: 640px) {
  .links-grid {
    grid-template-columns: 1fr;
  }
}
.link-card {
  display: flex;
  gap: 14px;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-bg-container);
  text-decoration: none;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}
.link-card:hover {
  transform: translateY(-2px);
  border-color: var(--app-primary);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--app-primary) 10%, transparent);
}
.card-logo {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  overflow: hidden;
  background: color-mix(in srgb, var(--app-primary) 8%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.logo-fallback {
  font-size: 20px;
  font-weight: 700;
  color: var(--app-primary);
}
.card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
}
.card-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text);
  margin: 0;
}
.card-ext-link {
  opacity: 0.4;
  flex-shrink: 0;
}
.card-category {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
  color: var(--app-primary);
  white-space: nowrap;
}
.card-badge {
  font-size: 10px;
  padding: 0 6px;
  border-radius: 8px;
  line-height: 1.6;
  white-space: nowrap;
}
.badge-error {
  background: color-mix(in srgb, #e74c3c 12%, transparent);
  color: #e74c3c;
}
.badge-pending {
  background: color-mix(in srgb, #f59e0b 12%, transparent);
  color: #f59e0b;
}
.card-desc {
  font-size: 12px;
  color: var(--app-text-tertiary);
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.code-input-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
.code-input-row .n-input {
  flex: 1;
}
.notice-board {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 20px;
  padding: 14px 16px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--app-primary) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--app-primary) 12%, transparent);
}
@media (max-width: 640px) {
  .notice-board {
    grid-template-columns: 1fr;
  }
}
.notice-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--app-text-secondary);
}
.notice-icon {
  flex-shrink: 0;
  font-size: 14px;
}
.friends-cancel{
  margin-right: 10px;
}

</style>
