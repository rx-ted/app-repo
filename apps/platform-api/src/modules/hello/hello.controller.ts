import { Controller, Get, Post, Put, Delete, Options, Inject, Query, Param, Body, Headers } from '@rx-ted/packages-honest';
import { Public } from '@/common/decorators';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiHeader,
} from '@rx-ted/packages-honest-plugins/api-doc';
import HelloService from './hello.service';
import { HelloRequestDto, HelloResponseDto } from './hello.dto';

@ApiTags('Hello')
@Controller('hello', {
  tag: { name: 'Hello', description: 'Hello World' },
})
class HelloController {
  constructor(@Inject(HelloService) private helloService: HelloService) {}

  @Public()
  @Get('', {
    apiDoc: {
      summary: 'Say hello (legacy apiDoc kept for compatibility)',
      tags: ['Hello'],
    },
  })
  @ApiOperation({ summary: 'Say hello', description: 'Returns a greeting message' })
  @ApiQuery({ name: 'username', required: false, type: String, description: 'Username to greet', example: 'world' })
  @ApiOkResponse({ description: 'Hello message', type: HelloResponseDto })
  async sayHello(@Query('username') username?: string) {
    return this.helloService.greet(username);
  }

  @Public()
  @Get('echo/:id', {})
  @ApiOperation({ summary: 'Echo request metadata', description: 'Demonstrates param/query/header decorators' })
  @ApiParam({ name: 'id', type: Number, description: 'Resource id', example: 1 })
  @ApiQuery({ name: 'verbose', required: false, type: Boolean, description: 'Verbose flag' })
  @ApiHeader({ name: 'x-trace-id', required: false, description: 'Trace id', type: String })
  @ApiOkResponse({ description: 'Echo result', type: Object })
  async echo(
    @Param('id') id: number,
    @Query('verbose') verbose?: boolean,
    @Headers('x-trace-id') traceId?: string,
  ) {
    return { id, verbose: Boolean(verbose), traceId: traceId ?? null };
  }

  @Public()
  @Post('', {})
  @ApiOperation({ summary: 'Create hello resource', description: 'Creates a greeting resource' })
  @ApiBody({ type: HelloRequestDto, description: 'Hello payload' })
  @ApiCreatedResponse({ description: 'Created', type: HelloResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid payload' })
  async create(@Body() body: HelloRequestDto) {
    return this.helloService.create(body);
  }

  @Public()
  @Put(':id', {})
  @ApiOperation({ summary: 'Update hello resource', description: 'Updates an existing greeting' })
  @ApiParam({ name: 'id', type: Number, description: 'Resource id', example: 1 })
  @ApiBody({ type: HelloRequestDto, description: 'Updated payload' })
  @ApiOkResponse({ description: 'Updated', type: HelloResponseDto })
  async update(@Param('id') id: number, @Body() body: Partial<HelloRequestDto>) {
    return this.helloService.update(id, body);
  }

  @Public()
  @Delete(':id', {})
  @ApiOperation({ summary: 'Delete hello resource', description: 'Deletes a greeting' })
  @ApiParam({ name: 'id', type: Number, description: 'Resource id', example: 1 })
  @ApiOkResponse({ description: 'Deleted' })
  async remove(@Param('id') id: number) {
    return this.helloService.remove(id);
  }

  @Public()
  @Options('', {})
  @ApiOperation({ summary: 'Hello options', description: 'Allowed methods' })
  @ApiOkResponse({ description: 'Allowed methods' })
  async options() {
    return this.helloService.options();
  }
}

export default HelloController;
