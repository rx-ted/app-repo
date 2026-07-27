import { ref, readonly } from 'vue';
import { http } from '@/http';
import type { ApiResponse } from '@/http/types';
import { useSessionStore } from '@/stores/session';
import { storeToRefs } from 'pinia';

type NotificationItem = {
  id: number;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

type NotificationSummary = {
  unreadCount: number;
  recent: NotificationItem[];
};

export function useNotification() {
  const session = useSessionStore();
  const { isAuthenticated } = storeToRefs(session);

  const items = ref<NotificationItem[]>([]);
  const unreadCount = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function list(): Promise<NotificationItem[]> {
    if (!isAuthenticated.value) return [];
    loading.value = true;
    error.value = null;
    try {
      const res = await http.get<ApiResponse<NotificationItem[]>>('/notification/me');
      const data = Array.isArray(res.data) ? res.data : (res.data ?? []);
      items.value = data;
      return data;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '加载通知失败';
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function summary(): Promise<NotificationSummary> {
    const result: NotificationSummary = { unreadCount: 0, recent: [] };
    if (!isAuthenticated.value) return result;
    loading.value = true;
    error.value = null;
    try {
      const res = await http.get<ApiResponse<NotificationSummary>>('/notification/me/summary');
      const data = res.data;
      unreadCount.value = data.unreadCount ?? 0;
      result.unreadCount = data.unreadCount ?? 0;
      result.recent = data.recent ?? [];
      return result;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '获取通知摘要失败';
      return result;
    } finally {
      loading.value = false;
    }
  }

  async function markRead(id: number): Promise<void> {
    if (!isAuthenticated.value) return;
    try {
      await http.post(`/notification/${id}/read`);
      const item = items.value.find((n) => n.id === id);
      if (item) item.is_read = true;
      if (unreadCount.value > 0) unreadCount.value--;
    } catch {
      /* silently fail */
    }
  }

  async function markAllRead(): Promise<void> {
    if (!isAuthenticated.value) return;
    try {
      await http.post('/notification/read-all');
      items.value.forEach((n) => (n.is_read = true));
      unreadCount.value = 0;
    } catch {
      /* silently fail */
    }
  }

  return {
    items: readonly(items),
    unreadCount: readonly(unreadCount),
    loading: readonly(loading),
    error: readonly(error),
    list,
    summary,
    markRead,
    markAllRead,
  };
}
