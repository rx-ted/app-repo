import { Module } from '@rx-ted/packages-honest';
import UploadController from '@/modules/upload/upload.controller';
import UploadService from '@/modules/upload/upload.service';

@Module({
  controllers: [UploadController],
  services: [UploadService],
})
class UploadModule {}

export default UploadModule;
