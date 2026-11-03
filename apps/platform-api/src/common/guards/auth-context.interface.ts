export interface AuthUser {
  userId: string;
  username: string;
  roles: string[];
  permissions: string[];
}

export interface AuthSession {
  id: string;
  ip: string | null;
  lastActiveAt: string;
  userId: string;
  username?: string;
}

export abstract class IAuthContextService {
  abstract resolveUser(username: string): Promise<AuthUser | null>;
  abstract findSession(sessionId: string): Promise<AuthSession | null>;
  abstract touchSession(session: AuthSession): Promise<void>;
}
