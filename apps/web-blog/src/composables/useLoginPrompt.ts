import { useSessionStore } from '@/stores/session';
import { storeToRefs } from 'pinia';
import { useMessage } from '@/composables/useMessage';
import { useStorage } from '@/composables/useStorage';

const PROMPT_KEY = 'loginPromptShown';

export function useLoginPrompt() {
  const session = useSessionStore();
  const { isAuthenticated } = storeToRefs(session);
  const message = useMessage();
  const storage = useStorage();

  function show() {
    if (isAuthenticated.value) return;
    if (storage.getSession(PROMPT_KEY, false)) return;
    storage.setSession(PROMPT_KEY, true);

    message.info('登录后可以管理文章、查看数据、快速编辑', {
      duration: 5000,
      closable: true,
    });
  }

  return { show };
}
