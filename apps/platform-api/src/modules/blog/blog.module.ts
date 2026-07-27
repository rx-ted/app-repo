import { Module } from '@rx-ted/packages-honest';
import BlogController from '@/modules/blog/blog.controller';
import { BlogService } from '@/modules/blog/blog.service';
import { DashboardService } from '@/modules/blog/services/dashboard.service';
import { AuthorService } from '@/modules/blog/services/author.service';

@Module({
  controllers: [BlogController],
  services: [BlogService, DashboardService, AuthorService],
})
export class BlogModule {}

export default BlogModule;
