import { Module } from '@rx-ted/packages-honest';
import { PermissionController } from '@/modules/permission/permission.controller';
import { PermissionService } from '@/modules/permission/permission.service';

@Module({
  controllers: [PermissionController],
  services: [PermissionService],
})
export class PermissionModule {}

export default PermissionModule;
