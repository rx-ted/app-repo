import { Module } from '@rx-ted/packages-honest';
import { SystemInfoController } from '@/modules/system/system.controller';
import SystemInitService from '@/modules/system/system-init.service';
import SystemInfoService from '@/modules/system/system-info.service';

@Module({
  controllers: [SystemInfoController],
  services: [SystemInitService, SystemInfoService],
})
export class SystemModule {}

export default SystemModule;
