import { Module } from '@rx-ted/packages-honest';
import { NotificationController } from '@/modules/notification/notification.controller';
import { NotificationService } from '@/modules/notification/notification.service';

@Module({
  controllers: [NotificationController],
  services: [NotificationService],
})
export class NotificationModule {}

export default NotificationModule;
