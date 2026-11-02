import { Module } from '@rx-ted/packages-honest';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { CacheInvalidationService } from '@/modules/post/services/cache-invalidation.service';
import AdminPermissionModule from '@/modules/admin-permission/admin-permission.module';
import AnnouncementModule from '@/modules/announcement/announcement.module';

import AuditModule from '@/modules/audit/audit.module';
import AuthModule from '@/modules/auth/auth.module';
import AuthorStatsModule from '@/modules/author-stats/author-stats.module';

import BlogModule from '@/modules/blog/blog.module';

import CategoryModule from '@/modules/category/category.module';
import CommentMapModule from '@/modules/comment-map/comment-map.module';
import CommentModule from '@/modules/comment/comment.module';

import DiscoverModule from '@/modules/discover/discover.module';

import HelloModule from '@/modules/hello/hello.module';
import MailModule from '@/modules/mail/mail.module';

import NotificationModule from '@/modules/notification/notification.module';

import OutboxModule from '@/modules/outbox/outbox.module';
import PermissionModule from '@/modules/permission/permission.module';
import PermissionRequestModule from '@/modules/permission-request/permission-request.module';

import PostModule from '@/modules/post/post.module';
import PostStatsModule from '@/modules/post-stats/post-stats.module';

import RoleModule from '@/modules/role/role.module';
import UserModule from '@/modules/user/user.module';
import SystemModule from '@/modules/system/system.module';
import TagsModule from '@/modules/tags/tags.module';

import UploadModule from '@/modules/upload/upload.module';

import SearchModule from '@/modules/search/search.module';

@Module({
  services: [DbService, CacheInvalidationService],
  imports: [
    AdminPermissionModule,
    AnnouncementModule,

    AuditModule,
    AuthModule,
    AuthorStatsModule,

    BlogModule,

    CategoryModule,
    CommentModule,

    CommentMapModule,

    DiscoverModule,

    HelloModule,
    MailModule,
    NotificationModule,

    OutboxModule,

    PermissionModule,
    PermissionRequestModule,
    PostModule,
    PostStatsModule,
    RoleModule,

    UserModule,
    SearchModule,

    SystemModule,
    TagsModule,

    UploadModule,
  ],
})
class AppModule {}

export default AppModule;
