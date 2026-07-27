import { compileSchema } from '@rx-ted/packages-honest-plugins/db';
import { dialect } from '@/utils';
import {
  UsersSchema,
  UserAuthSchema,
  UserProfilesSchema,
  UserOauthSchema,
} from '@/modules/user/entities/user.entity';
import { RolesSchema, UserRoleMappingsSchema } from '@/modules/role/entities/role.entity';
import {
  PermissionsSchema,
  UserPermissionMappingsSchema,
  RolePermissionMappingsSchema,
} from '@/modules/permission/entities/permission.entity';
import { PermissionRequestsSchema } from '@/modules/permission-request/entities/permission-request.entity';
import { PermissionRequestItemsSchema } from '@/modules/permission-request/entities/permission-request-items.entity';
import {
  PostCoreSchema,
  PostContentSchema,
  PostRevisionsSchema,
  PostStatsSchema,
  PostTagMappingsSchema,
  PostCategoryMappingsSchema,
} from '@/modules/post/entities/post.entity';
import { PostTagsSchema } from '@/modules/tags/entities/tags.entity';
import { PostCategoriesSchema } from '@/modules/category/entities/category.entity';
import {
  CommentsSchema,
  CommentLikesSchema,
  CommentReportsSchema,
  PostCommentThreadsSchema,
} from '@/modules/comment/entities/comment.entity';
import { NotificationsSchema } from '@/modules/notification/entities/notification.entity';
import { AuditLogsSchema } from '@/modules/audit/entities/audit.entity';
import { AuthorStatsSchema } from '@/modules/author-stats/entities/author-stats.entity';
import { AnnouncementsSchema } from '@/modules/announcement/entities/announcement.entity';
import { DiscoveriesSchema } from '@/modules/discover/entities/discover.entity';
import { SystemMetaSchema } from '@/modules/system/entities/system-meta.entity';
const _compiled = compileSchema(dialect, {
  systemMeta: SystemMetaSchema,
  users: UsersSchema,
  userAuth: UserAuthSchema,
  userProfiles: UserProfilesSchema,
  userOauth: UserOauthSchema,
  roles: RolesSchema,
  userRoleMappings: UserRoleMappingsSchema,
  permissions: PermissionsSchema,
  userPermissionMappings: UserPermissionMappingsSchema,
  rolePermissionMappings: RolePermissionMappingsSchema,
  permissionRequests: PermissionRequestsSchema,
  permissionRequestItems: PermissionRequestItemsSchema,
  postCore: PostCoreSchema,
  postContent: PostContentSchema,
  postRevisions: PostRevisionsSchema,
  postStats: PostStatsSchema,
  postTagMappings: PostTagMappingsSchema,
  postCategoryMappings: PostCategoryMappingsSchema,
  postTags: PostTagsSchema,
  postCategories: PostCategoriesSchema,
  comments: CommentsSchema,
  commentLikes: CommentLikesSchema,
  commentReports: CommentReportsSchema,
  postCommentThreads: PostCommentThreadsSchema,
  notifications: NotificationsSchema,
  auditLogs: AuditLogsSchema,
  authorStats: AuthorStatsSchema,
  announcements: AnnouncementsSchema,
  discoveries: DiscoveriesSchema,
});

export const systemMeta = _compiled.systemMeta;
export const users = _compiled.users;
export const userAuth = _compiled.userAuth;
export const userProfiles = _compiled.userProfiles;
export const userOauth = _compiled.userOauth;
export const roles = _compiled.roles;
export const userRoleMappings = _compiled.userRoleMappings;
export const permissions = _compiled.permissions;
export const userPermissionMappings = _compiled.userPermissionMappings;
export const rolePermissionMappings = _compiled.rolePermissionMappings;
export const permissionRequests = _compiled.permissionRequests;
export const permissionRequestItems = _compiled.permissionRequestItems;
export const postCore = _compiled.postCore;
export const postContent = _compiled.postContent;
export const postRevisions = _compiled.postRevisions;
export const postStats = _compiled.postStats;
export const postTagMappings = _compiled.postTagMappings;
export const postCategoryMappings = _compiled.postCategoryMappings;
export const postTags = _compiled.postTags;
export const postCategories = _compiled.postCategories;
export const comments = _compiled.comments;
export const commentLikes = _compiled.commentLikes;
export const commentReports = _compiled.commentReports;
export const postCommentThreads = _compiled.postCommentThreads;
export const notifications = _compiled.notifications;
export const auditLogs = _compiled.auditLogs;
export const authorStats = _compiled.authorStats;
export const announcements = _compiled.announcements;
export const discoveries = _compiled.discoveries;
