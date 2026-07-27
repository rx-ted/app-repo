import { Inject, Service } from '@rx-ted/packages-honest';
import { CacheService } from '@rx-ted/packages-honest-plugins/cache';
import { CACHE_KEYS } from '@/constants/cache-keys';

@Service()
export class CacheInvalidationService {
  constructor(@Inject(CacheService) private cache: CacheService) {}

  async invalidatePostLists(): Promise<number> {
    return this.cache.deleteByPattern(CACHE_KEYS.postListPattern);
  }

  async invalidatePostSlug(slug: string): Promise<boolean> {
    return this.cache.delete(CACHE_KEYS.postSlug(slug));
  }

  async invalidatePostId(id: string): Promise<boolean> {
    return this.cache.delete(CACHE_KEYS.postId(id));
  }

  async invalidatePostSlugs(): Promise<number> {
    return this.cache.deleteByPattern(CACHE_KEYS.postSlugPattern);
  }

  async invalidatePostIds(): Promise<number> {
    return this.cache.deleteByPattern(CACHE_KEYS.postIdPattern);
  }

  async invalidatePostCalendars(): Promise<number> {
    return this.cache.deleteByPattern(CACHE_KEYS.postCalendarPattern);
  }

  async invalidatePostRelated(slug: string): Promise<void> {
    await Promise.all([
      this.invalidatePostLists(),
      this.invalidatePostCalendars(),
      this.cache.delete(CACHE_KEYS.postSlug(slug)),
      this.cache.delete(CACHE_KEYS.blogHome),
    ]);
  }
}
