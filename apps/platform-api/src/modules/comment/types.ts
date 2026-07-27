export interface CommentThreadRepository {
  getByPostId(postId: number): Promise<null>;
  create(thread: Record<string, unknown>): Promise<number>;
  update(id: number, updates: Record<string, unknown>): Promise<void>;
  delete(postId: number): Promise<void>;
}

export interface AuthorBrief {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  level: number;
  bio: string | null;
  website: string | null;
  location: string | null;
  joinDate: string;
  followerCount: number;
  followingCount: number;
  likeReceivedCount: number;
  isFollowed: boolean;
}
