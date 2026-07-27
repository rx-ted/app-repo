export interface SessionRecord {
  id: string;
  userId: string;
  username: string;
  deviceId: string | null;
  ip: string | null;
  city: string | null;
  userAgent: string | null;
  refreshTokenHash: string;
  createdAt: string;
  lastActiveAt: string;
}
