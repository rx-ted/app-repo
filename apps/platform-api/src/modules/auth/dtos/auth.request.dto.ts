export type LoginRequestDto = {
  username: string;
  password: string;
};

export type RegisterRequestDto =
  | {
      login_type: 'password';
      username: string;
      password: string;
      email?: string;
      nickname?: string;
      avatar_url?: string;
      bio?: string;
      location?: string;
    }
  | {
      login_type: 'email';
      email: string;
      code: string;
      username?: string;
      preferred_locale?: 'zh-CN' | 'en';
      nickname?: string;
      avatar_url?: string;
      bio?: string;
      location?: string;
    }
  | {
      login_type: 'google';
      code: string;
      username?: string;
      preferred_locale?: 'zh-CN' | 'en';
      nickname?: string;
      avatar_url?: string;
      bio?: string;
      location?: string;
    }
  | {
      login_type: 'github';
      code: string;
      username?: string;
      preferred_locale?: 'zh-CN' | 'en';
      nickname?: string;
      avatar_url?: string;
      bio?: string;
      location?: string;
    }
  | {
      login_type: 'wechat';
      code: string;
      username?: string;
      preferred_locale?: 'zh-CN' | 'en';
      nickname?: string;
      avatar_url?: string;
      bio?: string;
      location?: string;
    };

export type LogoutRequestDto = Record<string, never>;

export type GetSessionRequestDto = Record<string, never>;
