import { Module } from '@rx-ted/packages-honest';

import UserController from '@/modules/user/user.controller';
import { AdminUserController } from '@/modules/user/admin-user.controller';
import UserService from '@/modules/user/user.service';
import { UserRepository } from '@/modules/user/repositories/user.repository';

@Module({
  controllers: [UserController, AdminUserController],
  services: [UserService, UserRepository],
})
class UserModule {}

export default UserModule;
