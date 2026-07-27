import { Service, ComponentManager } from '@rx-ted/packages-honest';
import type { CacheDriver } from './types';

export const CACHE_GLOBAL_KEY = 'app:cache';

@Service()
class CacheService {
  constructor() {
    return ComponentManager.getPlugin<CacheDriver>(CACHE_GLOBAL_KEY);
  }
}

interface CacheService extends CacheDriver {}

export { CacheService };
