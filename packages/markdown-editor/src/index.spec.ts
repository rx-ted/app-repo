import { describe, it, expect } from 'vitest';
import { __version } from './index';

describe('package entry', () => {
  it('exposes a version marker', () => {
    expect(__version).toBe('1.0.0');
  });
});
