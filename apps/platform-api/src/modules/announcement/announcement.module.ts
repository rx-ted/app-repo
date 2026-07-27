import { Module } from '@rx-ted/packages-honest';
import { AnnouncementController } from '@/modules/announcement/announcement.controller';
import { AnnouncementService } from '@/modules/announcement/announcement.service';

@Module({
  controllers: [AnnouncementController],
  services: [AnnouncementService],
})
export class AnnouncementModule {}

export default AnnouncementModule;
