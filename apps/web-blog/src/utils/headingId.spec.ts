import { describe, expect, it } from 'vitest';
import { headingId } from './headingId';

describe('headingId', () => {
  it('converts spaces to hyphens', () => {
    expect(headingId({ text: 'Hello World' })).toBe('hello-world');
  });

  it('lowercases text', () => {
    expect(headingId({ text: 'Hello' })).toBe('hello');
  });

  it('removes special characters', () => {
    expect(headingId({ text: 'Hello $world @test' })).toBe('hello-world-test');
  });

  it('keeps Chinese characters', () => {
    expect(headingId({ text: '你好 world' })).toBe('你好-world');
  });

  it('keeps numbers and underscores', () => {
    expect(headingId({ text: 'Hello_123 test' })).toBe('hello_123-test');
  });

  it('collapses multiple hyphens', () => {
    expect(headingId({ text: 'Hello   World' })).toBe('hello-world');
  });

  it('trims leading and trailing hyphens', () => {
    expect(headingId({ text: '--hello--' })).toBe('hello');
  });

  it('returns "heading" fallback for empty result', () => {
    expect(headingId({ text: '!@#$%' })).toBe('heading');
  });
});
