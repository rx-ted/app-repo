import type { ILogger, LogLevel } from './types';

const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

export class ConsoleLogger implements ILogger {
  private name: string;
  private level: LogLevel = 'info';

  constructor(options: { name?: string; level?: LogLevel } = {}) {
    this.name = options.name ?? 'app';
    if (options.level && LOG_LEVELS[options.level] !== undefined) {
      this.level = options.level;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private consoleMethod(level: string): 'debug' | 'info' | 'warn' | 'error' {
    if (level === 'fatal') return 'error';
    if (level === 'trace') return 'debug';
    return level as 'debug' | 'info' | 'warn' | 'error';
  }

  private formatMsg(level: string, msgOrObj: unknown, ...rest: unknown[]) {
    const prefix = `[${this.name}] ${level}:`;
    const method = this.consoleMethod(level);

    const flatten = (v: unknown): unknown => {
      if (v instanceof Error) return { message: v.message, stack: v.stack, cause: v.cause };
      if (v && typeof v === 'object') return v;
      return v;
    };

    if (typeof msgOrObj === 'string') {
      console[method](prefix, msgOrObj, ...rest.map(flatten));
    } else {
      const [msg, ...args] = rest;
      console[method](prefix, msg ?? '', flatten(msgOrObj), ...args.map(flatten));
    }
  }

  trace(msg: string, ...args: unknown[]): void;
  trace(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  trace(msgOrObj: unknown, msg?: string, ...args: unknown[]): void {
    if (!this.shouldLog('trace')) return;
    if (typeof msgOrObj === 'string') {
      this.formatMsg('trace', msgOrObj, ...args);
    } else {
      this.formatMsg('trace', msgOrObj, msg, ...args);
    }
  }

  debug(msg: string, ...args: unknown[]): void;
  debug(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  debug(msgOrObj: unknown, msg?: string, ...args: unknown[]): void {
    if (!this.shouldLog('debug')) return;
    if (typeof msgOrObj === 'string') {
      this.formatMsg('debug', msgOrObj, ...args);
    } else {
      this.formatMsg('debug', msgOrObj, msg, ...args);
    }
  }

  info(msg: string, ...args: unknown[]): void;
  info(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  info(msgOrObj: unknown, msg?: string, ...args: unknown[]): void {
    if (!this.shouldLog('info')) return;
    if (typeof msgOrObj === 'string') {
      this.formatMsg('info', msgOrObj, ...args);
    } else {
      this.formatMsg('info', msgOrObj, msg, ...args);
    }
  }

  warn(msg: string, ...args: unknown[]): void;
  warn(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  warn(msgOrObj: unknown, msg?: string, ...args: unknown[]): void {
    if (!this.shouldLog('warn')) return;
    if (typeof msgOrObj === 'string') {
      this.formatMsg('warn', msgOrObj, ...args);
    } else {
      this.formatMsg('warn', msgOrObj, msg, ...args);
    }
  }

  error(msg: string, ...args: unknown[]): void;
  error(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  error(msgOrObj: unknown, msg?: string, ...args: unknown[]): void {
    if (!this.shouldLog('error')) return;
    if (typeof msgOrObj === 'string') {
      this.formatMsg('error', msgOrObj, ...args);
    } else {
      this.formatMsg('error', msgOrObj, msg, ...args);
    }
  }

  fatal(msg: string, ...args: unknown[]): void;
  fatal(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  fatal(msgOrObj: unknown, msg?: string, ...args: unknown[]): void {
    if (!this.shouldLog('fatal')) return;
    if (typeof msgOrObj === 'string') {
      this.formatMsg('fatal', msgOrObj, ...args);
    } else {
      this.formatMsg('fatal', msgOrObj, msg, ...args);
    }
  }

  child(bindings: Record<string, unknown>): ILogger {
    const module = bindings.module as string | undefined;
    return new ConsoleLogger({
      name: module ? `${this.name}:${module}` : this.name,
      level: this.level,
    });
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}
