import { Module } from '@rx-ted/packages-honest';

import {
  UserPermissionRequestController,
  AdminPermissionRequestController,
} from '@/modules/permission-request/permission-request.controller';
import PermissionRequestService from '@/modules/permission-request/permission-request.service';

@Module({
  controllers: [UserPermissionRequestController, AdminPermissionRequestController],
  services: [PermissionRequestService],
})
class PermissionRequestModule {}

export default PermissionRequestModule;
