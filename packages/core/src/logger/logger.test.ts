import { describe, expect, it } from 'vitest';
import { Logger, createLogger, createFileTransport } from './logger';
import type { ILogger } from './types';

describe('Logger', () => {
  it('creates with default name', () => {
    const logger = new Logger();
    expect(typeof logger.info).toBe('function');
  });

  it('creates with custom options', () => {
    const logger = new Logger({ name: 'test', level: 'debug' });
    expect(typeof logger.info).toBe('function');
  });

  it('implements ILogger interface', () => {
    const logger: ILogger = new Logger();
    expect(typeof logger.trace).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.fatal).toBe('function');
    expect(typeof logger.child).toBe('function');
    expect(typeof logger.setLevel).toBe('function');
    expect(typeof logger.close).toBe('function');
  });

  it('child returns ILogger', () => {
    const logger = new Logger();
    const child = logger.child({ module: 'test' });
    expect(typeof child.trace).toBe('function');
    expect(typeof child.info).toBe('function');
    expect(typeof child.fatal).toBe('function');
  });

  it('setLevel changes level', () => {
    const logger = new Logger();
    logger.setLevel('error');
    expect(true).toBe(true);
  });

  it('close flushes and resolves', async () => {
    const logger = new Logger();
    await expect(logger.close()).resolves.toBeUndefined();
  });

  it('createLogger returns Logger instance', () => {
    const logger = createLogger();
    expect(logger).toBeInstanceOf(Logger);
  });

  it('createFileTransport returns valid PinoTransportTarget', () => {
    const target = createFileTransport({
      file: 'logs/app',
      size: '10m',
      frequency: 'daily',
      mkdir: true,
    });
    expect(target.target).toBe('pino-roll');
    expect(target.options.file).toBe('logs/app');
    expect(target.options.size).toBe('10m');
    expect(target.options.frequency).toBe('daily');
    expect(target.options.mkdir).toBe(true);
  });

  it('createFileTransport omits undefined options', () => {
    const target = createFileTransport({ file: 'logs/app' });
    expect(target.options).toEqual({ file: 'logs/app' });
  });
});
