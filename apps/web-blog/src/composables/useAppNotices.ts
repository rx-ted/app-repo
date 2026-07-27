import { useMessage } from '@/composables/useMessage';
import { useStorage } from '@/composables/useStorage';

const storage = useStorage();
const DISMISSED_KEY = 'noticesDismissed';

function isDismissed(id: string): boolean {
  const dismissed = storage.get<string[]>(DISMISSED_KEY, []);
  return dismissed.includes(id);
}

function markDismissed(id: string) {
  const dismissed = storage.get<string[]>(DISMISSED_KEY, []);
  dismissed.push(id);
  storage.set(DISMISSED_KEY, dismissed);
}

export function useAppNotices() {
  const message = useMessage();

  function show() {
    if (!isDismissed('redesign-launch')) {
      message.info('博客全新改版上线，新增搜索、暗色模式与更多功能', {
        duration: 4000,
        closable: true,
        onLeave: () => markDismissed('redesign-launch'),
      });
    }

    if (!isDismissed('search-shortcut')) {
      message.info('点击 ⌘K 快速搜索文章', {
        duration: 3000,
        closable: true,
        onLeave: () => markDismissed('search-shortcut'),
      });
    }
  }

  return { show };
}
