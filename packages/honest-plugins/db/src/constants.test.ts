import { describe, it, expect } from 'vitest';
import { DB_GLOBAL_KEY } from './constants';

describe('constants', () => {
  it('exports DB_GLOBAL_KEY as "app:db"', () => {
    expect(DB_GLOBAL_KEY).toBe('app:db');
  });
});
