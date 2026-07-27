import { describe, expect, it, vi } from 'vitest';

const naiveMessageMock = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};

vi.mock('naive-ui', () => ({
  useMessage: () => naiveMessageMock,
}));

import { useMessage } from './useMessage';

describe('useMessage', () => {
  it('should call success with defaults', () => {
    const msg = useMessage();
    msg.success('操作成功');
    expect(naiveMessageMock.success).toHaveBeenCalledWith('操作成功', {
      duration: 3000,
      closable: false,
      keepAliveOnHover: true,
    });
  });

  it('should call error with custom duration', () => {
    const msg = useMessage();
    msg.error('操作失败', { duration: 5000 });
    expect(naiveMessageMock.error).toHaveBeenCalledWith('操作失败', {
      duration: 5000,
      closable: false,
      keepAliveOnHover: true,
    });
  });

  it('should call warning with closable', () => {
    const msg = useMessage();
    msg.warning('请确认', { closable: true });
    expect(naiveMessageMock.warning).toHaveBeenCalledWith('请确认', {
      duration: 3000,
      closable: true,
      keepAliveOnHover: true,
    });
  });

  it('should call info with all options', () => {
    const msg = useMessage();
    msg.info('提示信息', {
      duration: 4000,
      closable: true,
      keepAliveOnHover: false,
    });
    expect(naiveMessageMock.info).toHaveBeenCalledWith('提示信息', {
      duration: 4000,
      closable: true,
      keepAliveOnHover: false,
      onLeave: undefined,
    });
  });

  it('should pass through onLeave callback', () => {
    const onLeave = vi.fn();
    const msg = useMessage();
    msg.success('done', { onLeave });
    expect(naiveMessageMock.success).toHaveBeenCalledWith('done', {
      duration: 3000,
      closable: false,
      keepAliveOnHover: true,
      onLeave,
    });
  });
});
