<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { EditorSavePayload } from '@rx-ted/packages-markdown-editor';
import { http } from '@/http';
import type { ApiResponse } from '@/http/types';
import type { BlogPostDetailVO } from '@/types/blog';
import { fetchCategories, fetchTags } from '@/api/taxonomy';
import { toSelectOptions } from '@/utils/taxonomy';
import { NAlert } from 'naive-ui';
import { MarkdownEditor } from '@rx-ted/packages-markdown-editor';
import { useSessionStore } from '@/stores/session';
import { useThemeStore } from '@/stores/theme';
import { API } from '@/constants';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const themeStore = useThemeStore();
const previewTheme = computed(() => (themeStore.isDark ? 'github-dark' : 'github-light'));
const editorTheme = computed(() => (themeStore.isDark ? 'dark' : 'light'));
const isEdit = computed(() => Boolean(route.params.slug));
const slug = computed(() => String(route.params.slug || ''));
const loading = ref(false);
const error = ref('');
const tagOptions = ref<{ label: string; value: number }[]>([]);
const categoryOptions = ref<{ label: string; value: number }[]>([]);
const draft = reactive({
  content: '',
  meta: {
    cover_image: '',
    is_pinned: false,
    featured_weight: 0,
    status: 'draft' as EditorSavePayload['status'],
    visibility: 'public' as EditorSavePayload['visibility'],
    allow_comment: true,
    tag_ids: [] as number[],
    category_id: null as number | null,
  },
});

async function loadOptions(noCache = false) {
  const [tags, categories] = await Promise.all([fetchTags(100, noCache), fetchCategories(noCache)]);
  tagOptions.value = toSelectOptions(tags);
  categoryOptions.value = toSelectOptions(categories);
}

async function beforeSave(content: string) {
  await loadOptions(true);
  const hasFrontMatter = content.startsWith('---') && /^---\n[\s\S]*\n---(\n|$)/.test(content);
  if (content.trim() && !hasFrontMatter) {
    window.alert(
      '文章缺少 front-matter（---\ntitle: 标题\n---）\n博客系统需要 front-matter 才能保存文章。',
    );
    throw new Error('missing front matter');
  }
}

async function loadPost() {
  if (!isEdit.value) return;
  const response = await http.get<ApiResponse<BlogPostDetailVO>>(`/posts/${slug.value}`);
  const post = response.data;
  draft.content = post.content_md ?? '';
  draft.meta.cover_image = post.cover_image ?? '';
  draft.meta.is_pinned = post.is_pinned ?? false;
  draft.meta.featured_weight = post.featured_weight ?? 0;
  draft.meta.status = post.status;
  draft.meta.visibility = post.visibility ?? 'public';
  draft.meta.allow_comment = post.allow_comment ?? true;
  draft.meta.tag_ids = post.tag_ids ?? [];
  draft.meta.category_id = post.category_ids?.[0] ?? null;
}

async function save(payload: EditorSavePayload) {
  if (!session.isAuthenticated) {
    const ok = window.confirm('需要登录才能保存文章，是否前往登录？');
    const redirectPath = `${route.fullPath + (route.fullPath.includes('?') ? '&' : '?')}restoreDraft=1`;
    if (ok) router.push({ name: 'login', query: { redirect: redirectPath } });
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    const requestBody = {
      title: payload.title,
      cover_image: payload.cover_image,
      is_pinned: payload.is_pinned,
      featured_weight: payload.featured_weight,
      content_md: draft.content,
      status: payload.status,
      visibility: payload.visibility,
      allow_comment: payload.allow_comment,
      tag_ids: payload.tag_ids.map(Number),
      category_ids: payload.category_ids.map(Number),
    };

    if (isEdit.value) {
      await http.put(`/posts/${slug.value}`, requestBody);
      localStorage.removeItem('editor:draft');
      draft.content = '';
      router.push(`/posts/${slug.value}`);
      return;
    }

    const response = await http.post<ApiResponse<{ slug: string }>>(API.POSTS_LIST, requestBody);
    localStorage.removeItem('editor:draft');
    draft.content = '';
    router.push(`/posts/${response.data.slug}`);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '保存失败';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadOptions();
  await loadPost();
});
</script>

<template>
  <div class="editor-shell">
    <n-alert v-if="error" type="error" :show-icon="false">{{ error }}</n-alert>
    <MarkdownEditor
      v-model="draft.content"
      :loading="loading"
      :is-edit="isEdit"
      :tag-options="tagOptions"
      :category-options="categoryOptions"
      :initial-meta="draft.meta"
      :help-href="'/posts/guides-markdown-editor'"
      :auto-restore="route.query.restoreDraft === '1'"
      :save-mode="'dialog'"
      :editor-theme="editorTheme"
      :preview-theme="previewTheme"
      :on-before-save="beforeSave"
      @save="save"
      @cancel="router.push('/dashboard')"
    />
  </div>
</template>

<style scoped>
.editor-shell {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0 8px;
}
</style>
