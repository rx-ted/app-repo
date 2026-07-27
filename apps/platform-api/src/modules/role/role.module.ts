import { Module } from '@rx-ted/packages-honest';
import { RoleController } from '@/modules/role/role.controller';
import { RoleService } from '@/modules/role/role.service';

@Module({
  controllers: [RoleController],
  services: [RoleService],
})
export class RoleModule {}

export default RoleModule;
