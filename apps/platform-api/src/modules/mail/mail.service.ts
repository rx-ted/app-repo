import { Service } from '@rx-ted/packages-honest';
import { ComponentManager } from '@rx-ted/packages-honest';
import { MAIL_GLOBAL_KEY } from '@rx-ted/packages-honest-plugins/mail';
import type { MailProvider } from '@rx-ted/packages-honest-plugins/mail';

@Service()
class MailService {
  private get provider(): MailProvider {
    return ComponentManager.getPlugin<MailProvider>(MAIL_GLOBAL_KEY);
  }

  async sendVerificationCode(params: {
    to: string;
    code: string;
    purpose: 'login' | 'register' | 'friend-link' | 'discovery';
    ttlSeconds: number;
    locale: 'zh-CN' | 'en';
  }): Promise<void> {
    const { to, code, purpose, ttlSeconds, locale } = params;

    const subject = this.buildSubject(purpose, locale);

    const html = this.buildVerificationEmail(code, ttlSeconds, locale, purpose);

    await this.provider.send({ to, subject, html });
  }

  private purposeLabel(purpose: string, locale: 'zh-CN' | 'en'): string {
    if (locale === 'en') {
      if (purpose === 'friend-link' || purpose === 'discovery') return 'friend link verification';
      if (purpose === 'login') return 'login';
      return 'register';
    }
    if (purpose === 'friend-link' || purpose === 'discovery') return '友情链接申请验证';
    if (purpose === 'login') return '登录';
    return '注册';
  }

  private buildSubject(purpose: string, locale: 'zh-CN' | 'en'): string {
    const label = this.purposeLabel(purpose, locale);
    return locale === 'en' ? `Your verification code for ${label}` : `您的${label}验证码`;
  }

  private buildVerificationEmail(
    code: string,
    ttlSeconds: number,
    locale: 'zh-CN' | 'en',
    purpose: string,
  ): string {
    const ttlMinutes = Math.floor(ttlSeconds / 60);
    const label = this.purposeLabel(purpose, locale);

    if (locale === 'en') {
      return `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2>Verification Code</h2>
          <p style="font-size: 14px; color: #666;">Use the code below for ${label}:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 24px; background: #f5f5f5; border-radius: 8px; margin: 16px 0;">
            ${code}
          </div>
          <p style="font-size: 12px; color: #999;">This code expires in ${ttlMinutes} minutes.</p>
        </div>`;
    }

    return `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2>验证码</h2>
        <p style="font-size: 14px; color: #666;">请使用以下验证码完成${label}：</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 24px; background: #f5f5f5; border-radius: 8px; margin: 16px 0;">
          ${code}
        </div>
        <p style="font-size: 12px; color: #999;">此验证码 ${ttlMinutes} 分钟后过期。</p>
      </div>`;
  }
}

export default MailService;
