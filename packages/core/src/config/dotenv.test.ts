import { describe, expect, it } from 'vitest';
import { parseDotenv } from './dotenv';

describe('parseDotenv', () => {
  it('should parse key=value', () => {
    const result = parseDotenv('DB_HOST=127.0.0.1\nDB_PORT=3306');
    expect(result).toEqual({ DB_HOST: '127.0.0.1', DB_PORT: '3306' });
  });

  it('should ignore comments and empty lines', () => {
    const result = parseDotenv('# comment\n\nKEY=val');
    expect(result).toEqual({ KEY: 'val' });
  });

  it('should strip quotes', () => {
    const result = parseDotenv('KEY="quoted"\nKEY2=\'single\'');
    expect(result).toEqual({ KEY: 'quoted', KEY2: 'single' });
  });
});
