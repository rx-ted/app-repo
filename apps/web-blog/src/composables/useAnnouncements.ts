import { computed, onMounted, ref } from 'vue';
import { http, HttpError } from '@/http';
import type { ApiResponse } from '@/http/types';
import type {
  ActiveAnnouncementsResponse,
  AnnouncementPayload,
  AnnouncementView,
} from '@/types/announcement';
import { API, ERRORS } from '@/constants';

const data = ref<ActiveAnnouncementsResponse | null>(null);
const loaded = ref(false);
const error = ref<string | null>(null);

export function useAnnouncements() {
  async function load() {
    try {
      const response = await http.get<ApiResponse<ActiveAnnouncementsResponse>>(
        API.ANNOUNCEMENT_ACTIVE,
      );
      data.value = response.data;
      error.value = null;
    } catch (cause) {
      data.value = null;
      error.value =
        cause instanceof HttpError
          ? (cause.userMessage ?? ERRORS.LOAD_ANNOUNCEMENT_FAILED)
          : ERRORS.LOAD_ANNOUNCEMENT_FAILED;
    } finally {
      loaded.value = true;
    }
  }

  onMounted(() => {
    if (!loaded.value) {
      void load();
    }
  });

  return {
    announcements: computed(() => data.value),
    loaded: computed(() => loaded.value),
    error: computed(() => error.value),
    reload: load,
  };
}

export function resolveAnnouncementPayload(
  announcement: AnnouncementView,
  mode: 'original' | 'translated' | 'bilingual',
): AnnouncementPayload {
  const original = announcement.original ?? {};
  const translated = announcement.translated ?? null;

  if (!translated || mode === 'original') {
    return original;
  }

  if (mode === 'translated') {
    return {
      badge: translated.badge || original.badge,
      title: translated.title || original.title,
      message: translated.message || original.message,
      actions: translated.actions?.length ? translated.actions : original.actions,
      items: translated.items?.length ? translated.items : original.items,
    };
  }

  const join = (a?: string, b?: string) => {
    if (a && b && a !== b) return `${a} / ${b}`;
    return b || a;
  };

  return {
    badge: join(original.badge, translated.badge),
    title: join(original.title, translated.title),
    message: join(original.message, translated.message),
    actions: (original.actions?.length ? original.actions : (translated.actions ?? [])).map(
      (item, index) => ({
        ...item,
        label: join(item.label, translated.actions?.[index]?.label) ?? item.label,
      }),
    ),
    items: (original.items?.length ? original.items : (translated.items ?? [])).map(
      (item, index) => ({
        ...item,
        label: join(item.label, translated.items?.[index]?.label) ?? item.label,
      }),
    ),
  };
}
