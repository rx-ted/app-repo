import { Module } from '@rx-ted/packages-honest';
import HelloController from '@/modules/hello/hello.controller';
import HelloService from '@/modules/hello/hello.service';

@Module({
  controllers: [HelloController],
  services: [HelloService],
})
class HelloModule {}

export default HelloModule;
