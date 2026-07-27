import { Controller, Get, Inject, Query } from '@rx-ted/packages-honest';
import { z } from '@/lib/openapi';
import { SearchResponseDtoSchema } from '@/modules/search/dtos/search.response.dto';
import SearchService from '@/modules/search/search.service';

@Controller('search', {
  tag: { name: 'Search', description: '搜索相关接口' },
})
export class SearchController {
  constructor(@Inject(SearchService) private readonly searchService: SearchService) {}

  @Get('', {
    apiDoc: {
      summary: '搜索文章、标签、分类和作者',
      tags: ['Search'],
      request: {
        query: z.object({
          q: z.string().optional(),
          type: z.string().optional(),
          limit: z.string().optional(),
          offset: z.string().optional(),
        }),
      },
      responses: {
        200: {
          description: '搜索结果',
          schema: SearchResponseDtoSchema,
        },
      },
    },
  })
  async search(
    @Query('q') q: string = '',
    @Query('type') type: string = 'posts',
    @Query('limit') limit: string = '10',
    @Query('offset') offset: string = '0',
  ) {
    const types = type
      .split(',')
      .filter((t): t is 'posts' | 'tags' | 'categories' | 'author' =>
        ['posts', 'tags', 'categories', 'author'].includes(t),
      );

    return this.searchService.search({
      q,
      types,
      limit: Number(limit),
      offset: Number(offset),
    });
  }
}
