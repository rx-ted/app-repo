import { Controller, Get, Injectable, Inject, Query } from '@rx-ted/packages-honest';
import { Public } from '@/common/decorators';
import HelloService from '@/modules/hello/hello.service';

@Injectable()
@Controller('hello', {
  tag: { name: 'Hello', description: 'Hello World' },
})
class HelloController {
  constructor(@Inject(HelloService) private helloService: HelloService) {}

  @Public()
  @Get('', {
    apiDoc: {
      summary: 'Say hello',
      tags: ['Hello'],
      request: { query: { username: { type: 'string', required: false } } },
      responses: { 200: { description: 'Hello message' } },
    },
  })
  async sayHello(@Query('username') username?: string) {
    return this.helloService.greet(username);
  }
}

export default HelloController;
