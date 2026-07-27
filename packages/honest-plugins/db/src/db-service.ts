import { Service, ComponentManager } from '@rx-ted/packages-honest';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { DB_GLOBAL_KEY } from './constants';

@Service()
class DbService {
  constructor() {
    return ComponentManager.getPlugin(DB_GLOBAL_KEY);
  }
}

interface DbService extends BaseSQLiteDatabase<'async', any> {}

export { DbService };
