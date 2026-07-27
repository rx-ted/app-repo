import { describe, expect, it } from 'vitest';
import type { AnnouncementView } from '@/types/announcement';
import { resolveAnnouncementPayload } from './useAnnouncements';

function createAnnouncement(): AnnouncementView {
  return {
    id: 1,
    slot: 'top',
    tone: 'subtle',
    audience: 'ALL',
    source_locale: 'zh-CN',
    translation_status: 'none',
    dismissible: true,
    enabled: true,
    priority: 0,
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
    original: {
      badge: '原文',
      title: '原始标题',
      message: '原始消息',
      actions: [{ label: '查看详情', path: '/about' }],
      items: [{ label: '原始条目', icon: 'i-1' }],
    },
    translated: {
      badge: 'Translation',
      title: 'Translated title',
      message: 'Translated message',
      actions: [{ label: 'View details', path: '/about' }],
      items: [{ label: 'Translated item', icon: 'i-1' }],
    },
  };
}

describe('resolveAnnouncementPayload', () => {
  it('should return original content in original mode', () => {
    const announcement = createAnnouncement();

    expect(resolveAnnouncementPayload(announcement, 'original')).toEqual(announcement.original);
  });

  it('should prefer translated content in translated mode', () => {
    const payload = resolveAnnouncementPayload(createAnnouncement(), 'translated');

    expect(payload).toMatchObject({
      badge: 'Translation',
      title: 'Translated title',
      message: 'Translated message',
      actions: [{ label: 'View details' }],
      items: [{ label: 'Translated item' }],
    });
  });

  it('should merge original and translated content in bilingual mode', () => {
    const payload = resolveAnnouncementPayload(createAnnouncement(), 'bilingual');

    expect(payload).toMatchObject({
      badge: '原文 / Translation',
      title: '原始标题 / Translated title',
      message: '原始消息 / Translated message',
      actions: [{ label: '查看详情 / View details' }],
      items: [{ label: '原始条目 / Translated item' }],
    });
  });

  it('should keep original labels when translated actions are missing', () => {
    const announcement = createAnnouncement();
    announcement.translated = {
      title: 'Translated title',
    };

    const payload = resolveAnnouncementPayload(announcement, 'bilingual');

    expect(payload.actions).toEqual([{ label: '查看详情', path: '/about' }]);
    expect(payload.items).toEqual([{ label: '原始条目', icon: 'i-1' }]);
  });
});
