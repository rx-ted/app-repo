import { Module } from '@rx-ted/packages-honest';
import MailService from '@/modules/mail/mail.service';

@Module({
  services: [MailService],
})
class MailModule {}

export default MailModule;
