export type AnnouncementAction = {
  label: string;
  icon?: string;
  path?: string;
  target?: '_self' | '_blank';
};

export type AnnouncementItem = {
  icon?: string;
  label: string;
  weak?: boolean;
};

export type AnnouncementPayload = {
  badge?: string;
  title?: string;
  message?: string;
  actions?: AnnouncementAction[];
  items?: AnnouncementItem[];
};

export type AnnouncementView = {
  id: number;
  slot: 'top' | 'footer';
  tone: 'critical' | 'subtle';
  audience: 'ALL' | 'AUTHENTICATED' | 'ADMIN';
  source_locale: 'zh-CN' | 'en';
  original: AnnouncementPayload;
  translated?: AnnouncementPayload | null;
  translation_status: 'none' | 'manual' | 'machine';
  dismissible: boolean;
  enabled: boolean;
  priority: number;
  active_from?: string | null;
  active_until?: string | null;
  frontend_version?: string | null;
  backend_version?: string | null;
  created_at: string;
  updated_at: string;
};

export type ActiveAnnouncementsResponse = {
  top: AnnouncementView[];
  footer: AnnouncementView[];
  meta: {
    frontend_version?: string | null;
    backend_version?: string | null;
    rotation_interval_ms: number;
    generated_at: string;
  };
};
