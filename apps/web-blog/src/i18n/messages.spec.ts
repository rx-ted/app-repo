import { describe, expect, it } from 'vitest';
import { messages } from './messages';

describe('messages', () => {
  const baselineKeys = Object.keys(messages['zh-CN']).sort();

  for (const [locale, schema] of Object.entries(messages)) {
    it(`${locale} should expose the same translation keys`, () => {
      expect(Object.keys(schema).sort()).toEqual(baselineKeys);
    });

    it(`${locale} should not contain empty translations`, () => {
      for (const [key, value] of Object.entries(schema)) {
        expect(value.trim(), `${locale}:${key}`).not.toBe('');
      }
    });
  }
});
