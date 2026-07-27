import { Inject, Service } from '@rx-ted/packages-honest';
import { CacheService } from '@rx-ted/packages-honest-plugins/cache';
import { CommentLikeRepository } from '@/modules/comment/repositories/comment-like.repository';

const LIKED_SET_PREFIX = 'comment-liked:';
const COUNT_PREFIX = 'comment-like-count:';

@Service()
class CommentLikeService {
  constructor(
    @Inject(CacheService) private cache: CacheService,
    @Inject(CommentLikeRepository) private likeRepo: CommentLikeRepository,
  ) {}

  private likedSetKey(userId: string) {
    return `${LIKED_SET_PREFIX}${userId}`;
  }

  private countKey(commentId: number) {
    return `${COUNT_PREFIX}${commentId}`;
  }

  async toggle(userId: string, commentId: number): Promise<{ isLiked: boolean; likes: number }> {
    const existing = await this.likeRepo.findByUserAndComment(userId, commentId);
    const isCurrentlyLiked = !!existing;

    if (isCurrentlyLiked) {
      await this.likeRepo.delete(userId, commentId);
    } else {
      await this.likeRepo.insert(userId, commentId);
    }

    // Invalidate Redis caches
    await this.cache.delete(this.likedSetKey(userId));
    await this.cache.delete(this.countKey(commentId));

    // Get fresh like count
    const dbLikes = await this.likeRepo.getCommentLikeCount(commentId);
    const newCount = isCurrentlyLiked ? Math.max(0, dbLikes - 1) : dbLikes + 1;

    return { isLiked: !isCurrentlyLiked, likes: newCount };
  }

  async isLiked(userId: string, commentId: number): Promise<boolean> {
    const cached = await this.cache.get<number[]>(this.likedSetKey(userId));
    if (cached) return cached.includes(commentId);
    const db = await this.likeRepo.findByUserAndComment(userId, commentId);
    return !!db;
  }

  async getLikeCount(commentId: number): Promise<number> {
    const cached = await this.cache.get<number>(this.countKey(commentId));
    if (cached !== null) return cached;
    const { likes } = await this.likeRepo.getCommentLikeCountRaw(commentId);
    await this.cache.set(this.countKey(commentId), likes, 300);
    return likes;
  }

  async getLikedCommentIds(userId: string): Promise<number[]> {
    const cached = await this.cache.get<number[]>(this.likedSetKey(userId));
    if (cached) return cached;
    const ids = await this.likeRepo.getLikedCommentIds(userId);
    await this.cache.set(this.likedSetKey(userId), ids, 300);
    return ids;
  }

  async batchIsLiked(userId: string | null, commentIds: number[]): Promise<Map<number, boolean>> {
    const result = new Map<number, boolean>();
    if (!userId) {
      commentIds.forEach((id) => result.set(id, false));
      return result;
    }
    const liked = await this.getLikedCommentIds(userId);
    commentIds.forEach((id) => result.set(id, liked.includes(id)));
    return result;
  }
}

export default CommentLikeService;
