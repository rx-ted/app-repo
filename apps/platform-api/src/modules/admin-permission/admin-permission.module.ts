import { Module } from '@rx-ted/packages-honest';
import AdminPermissionController from '@/modules/admin-permission/admin-permission.controller';
import AdminPermissionService from '@/modules/admin-permission/admin-permission.service';

@Module({
  controllers: [AdminPermissionController],
  services: [AdminPermissionService],
})
class AdminPermissionModule {}

export default AdminPermissionModule;
