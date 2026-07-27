import { useMessage as useNaiveMessage } from 'naive-ui';
import type { MessageOptions } from 'naive-ui';

type UseMessageOptions = {
  duration?: number;
  closable?: boolean;
  keepAliveOnHover?: boolean;
  onLeave?: () => void;
};

function toOptions(opts?: UseMessageOptions): MessageOptions {
  return {
    duration: opts?.duration ?? 3000,
    closable: opts?.closable ?? false,
    keepAliveOnHover: opts?.keepAliveOnHover ?? true,
    onLeave: opts?.onLeave,
  };
}

export function useMessage() {
  const m = useNaiveMessage();

  return {
    success: (content: string, options?: UseMessageOptions) =>
      m.success(content, toOptions(options)),
    error: (content: string, options?: UseMessageOptions) => m.error(content, toOptions(options)),
    warning: (content: string, options?: UseMessageOptions) =>
      m.warning(content, toOptions(options)),
    info: (content: string, options?: UseMessageOptions) => m.info(content, toOptions(options)),
  };
}
