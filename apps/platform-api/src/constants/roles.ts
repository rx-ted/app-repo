export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export const PERMISSIONS = {
  POST_ACCESS_ANY: 'post:access:any',
  POST_CREATE: 'post:create',
  POST_EDIT: 'post:edit',
  POST_DELETE: 'post:delete',
  USER_MANAGE: 'user:manage',
  ROLE_MANAGE: 'role:manage',
  COMMENT_MODERATE: 'comment:moderate',
  SYSTEM_CONFIG: 'system:config',
  CATEGORY_ACCESS_ANY: 'category:access:any',
  TAGS_ACCESS_ANY: 'tags:access:any',
  ROLE_ACCESS_ANY: 'role:access:any',
  PERMISSION_REQUEST_ACCESS_ANY: 'permission_request:access:any',
  AUDIT_ACCESS_ANY: 'audit:access:any',
  ANNOUNCEMENT_ACCESS_ANY: 'announcement:access:any',
  USERS_ACCESS_ANY: 'users:access:any',

  COMMENT_DELETE_ANY: 'comment:delete:any',
  DISCOVER_ACCESS_ANY: 'discover:access:any',
  DISCOVER_MANAGE: 'discover:manage',
  MAIL_SEND_ANY: 'mail:send:any',
  PERMISSION_ACCESS_ANY: 'permission:access:any',
  TAGS_APPROVE: 'tags:approve',
  CATEGORY_APPROVE: 'category:approve',
} as const;

export const LOGIN_TYPES = {
  PASSWORD: 'password',
  EMAIL: 'email',
  GOOGLE: 'google',
  GITHUB: 'github',
  WECHAT: 'wechat',
} as const;

export const USER_STATUS = {
  NORMAL: 'NORMAL',
  DISABLED: 'DISABLED',
} as const;
