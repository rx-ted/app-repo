import { Module } from '@rx-ted/packages-honest';

import PostController from '@/modules/post/post.controller';
import PostService from '@/modules/post/post.service';
import { PostRepository } from '@/modules/post/repositories/post.repository';

@Module({
  controllers: [PostController],
  services: [PostService, PostRepository],
})
class PostModule {}

export default PostModule;
