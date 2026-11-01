import {
  Body,
  Controller,
  Ctx,
  Delete,
  Get,
  Inject,
  Put,
  Query,
  UseGuards,
} from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { z } from '@/lib/openapi';
import { AuthGuard } from '@/common/guards';
import GitHubService from '@/modules/github/github.service';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBody,
  ApiOkResponse,
  ApiBearerAuth,
  ApiBadRequestResponse,
} from '@rx-ted/packages-honest-plugins-swagger';

const FileBodySchema = z.object({
  owner: z.string(),
  repo: z.string(),
  path: z.string(),
  content: z.string(),
  message: z.string().optional(),
  branch: z.string().optional(),
  sha: z.string().optional(),
});

const DeleteBodySchema = z.object({
  owner: z.string(),
  repo: z.string(),
  path: z.string(),
  sha: z.string(),
  message: z.string().optional(),
  branch: z.string().optional(),
});

@ApiTags('GitHub Repository')
@Controller('github', { tag: { name: 'GitHub Repository', description: 'GitHub 仓库与文件' } })
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class GitHubRepositoryController {
  constructor(@Inject(GitHubService) private readonly githubService: GitHubService) {}

  @Get('files')
  @ApiOperation({ summary: '读取仓库文件' })
  @ApiQuery({ name: 'owner', required: true, type: String })
  @ApiQuery({ name: 'repo', required: true, type: String })
  @ApiQuery({ name: 'path', required: true, type: String })
  @ApiQuery({ name: 'ref', required: false, type: String })
  @ApiOkResponse({ description: '仓库文件内容' })
  async getFile(
    @Ctx() c: Context,
    @Query('owner') owner: string,
    @Query('repo') repo: string,
    @Query('path') path: string,
    @Query('ref') ref?: string,
  ) {
    const user = c.get('user') as { username?: string; userId: string };
    return this.githubService.getFile(user.username ?? user.userId, owner, repo, path, ref);
  }

  @Put('files')
  @ApiOperation({ summary: '新建或更新仓库文件' })
  @ApiBody({ schema: FileBodySchema })
  @ApiOkResponse({ description: '文件写入结果' })
  @ApiBadRequestResponse({ description: '参数错误' })
  async putFile(@Ctx() c: Context, @Body() body: unknown) {
    const parsed = FileBodySchema.parse(body);
    const user = c.get('user') as { username?: string; userId: string };
    return this.githubService.putFile(
      user.username ?? user.userId,
      parsed.owner,
      parsed.repo,
      parsed.path,
      parsed.content,
      parsed.message ?? '',
      parsed.branch,
      parsed.sha,
    );
  }

  @Delete('files')
  @ApiOperation({ summary: '删除仓库文件' })
  @ApiBody({ schema: DeleteBodySchema })
  @ApiOkResponse({ description: '文件删除结果' })
  async deleteFile(@Ctx() c: Context, @Body() body: unknown) {
    const parsed = DeleteBodySchema.parse(body);
    const user = c.get('user') as { username?: string; userId: string };
    return this.githubService.deleteFile(
      user.username ?? user.userId,
      parsed.owner,
      parsed.repo,
      parsed.path,
      parsed.sha,
      parsed.message,
      parsed.branch,
    );
  }
}

export default GitHubRepositoryController;