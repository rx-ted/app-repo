import type {
  ILogger,
  LoggerOptions,
  LogLevel,
  FileTransportOptions,
  PinoTransportTarget,
} from './types';
import { ConsoleLogger } from './console-logger';

const isEdgeRuntime = typeof process === 'undefined' || typeof process.stdout === 'undefined';

export class Logger implements ILogger {
  private impl: ILogger;

  constructor(options: LoggerOptions = {}) {
    if (isEdgeRuntime) {
      this.impl = new ConsoleLogger({ name: options.name, level: options.level });
    } else {
      this.impl = new LazyPinoLogger(options);
    }
  }

  trace(msg: string, ...args: unknown[]): void;
  trace(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  trace(msgOrObj: unknown, msg?: string, ...args: unknown[]): void {
    (this.impl.trace as (msgOrObj: unknown, msg?: string, ...args: unknown[]) => void)(
      msgOrObj,
      msg,
      ...args,
    );
  }

  debug(msg: string, ...args: unknown[]): void;
  debug(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  debug(msgOrObj: unknown, msg?: string, ...args: unknown[]): void {
    (this.impl.debug as (msgOrObj: unknown, msg?: string, ...args: unknown[]) => void)(
      msgOrObj,
      msg,
      ...args,
    );
  }

  info(msg: string, ...args: unknown[]): void;
  info(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  info(msgOrObj: unknown, msg?: string, ...args: unknown[]): void {
    (this.impl.info as (msgOrObj: unknown, msg?: string, ...args: unknown[]) => void)(
      msgOrObj,
      msg,
      ...args,
    );
  }

  warn(msg: string, ...args: unknown[]): void;
  warn(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  warn(msgOrObj: unknown, msg?: string, ...args: unknown[]): void {
    (this.impl.warn as (msgOrObj: unknown, msg?: string, ...args: unknown[]) => void)(
      msgOrObj,
      msg,
      ...args,
    );
  }

  error(msg: string, ...args: unknown[]): void;
  error(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  error(msgOrObj: unknown, msg?: string, ...args: unknown[]): void {
    (this.impl.error as (msgOrObj: unknown, msg?: string, ...args: unknown[]) => void)(
      msgOrObj,
      msg,
      ...args,
    );
  }

  fatal(msg: string, ...args: unknown[]): void;
  fatal(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  fatal(msgOrObj: unknown, msg?: string, ...args: unknown[]): void {
    (this.impl.fatal as (msgOrObj: unknown, msg?: string, ...args: unknown[]) => void)(
      msgOrObj,
      msg,
      ...args,
    );
  }

  child(bindings: Record<string, unknown>): ILogger {
    return this.impl.child(bindings);
  }

  setLevel(level: LogLevel): void {
    this.impl.setLevel(level);
  }

  close(): Promise<void> {
    return this.impl.close();
  }
}

class LazyPinoLogger implements ILogger {
  private impl: ILogger;
  private options: LoggerOptions;

  constructor(options: LoggerOptions = {}) {
    this.options = options;
    this.impl = new ConsoleLogger({ name: options.name, level: options.level });
    this.tryUpgrade();
  }

  private async tryUpgrade() {
    try {
      const name = 'pino';
      const pino = await import(name);
      const transportOpts = this.options.transport;
      const targets: any[] = [];

      if (transportOpts) {
        const list = Array.isArray(transportOpts) ? transportOpts : [transportOpts];
        targets.push(...list);
      }

      if (this.options.destination) {
        targets.push({
          target: 'pino/file',
          options: { destination: this.options.destination },
        });
      }

      let stream: any;
      if (targets.length > 0) {
        stream = pino.transport({ targets });
      }
      const instance = pino(
        {
          name: this.options.name ?? 'app',
          level: this.options.level ?? 'info',
          ...this.options.pino,
        },
        stream,
      );
      this.impl = pinoInstanceToLogger(instance);
    } catch {
      // Keep ConsoleLogger as fallback
    }
  }

  trace(msg: string, ...args: unknown[]): void;
  trace(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  trace(msgOrObj: unknown, msg?: string, ...args: unknown[]): void {
    (this.impl.trace as (msgOrObj: unknown, msg?: string, ...args: unknown[]) => void)(
      msgOrObj,
      msg,
      ...args,
    );
  }

  debug(msg: string, ...args: unknown[]): void;
  debug(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  debug(msgOrObj: unknown, msg?: string, ...args: unknown[]): void {
    (this.impl.debug as (msgOrObj: unknown, msg?: string, ...args: unknown[]) => void)(
      msgOrObj,
      msg,
      ...args,
    );
  }

  info(msg: string, ...args: unknown[]): void;
  info(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  info(msgOrObj: unknown, msg?: string, ...args: unknown[]): void {
    (this.impl.info as (msgOrObj: unknown, msg?: string, ...args: unknown[]) => void)(
      msgOrObj,
      msg,
      ...args,
    );
  }

  warn(msg: string, ...args: unknown[]): void;
  warn(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  warn(msgOrObj: unknown, msg?: string, ...args: unknown[]): void {
    (this.impl.warn as (msgOrObj: unknown, msg?: string, ...args: unknown[]) => void)(
      msgOrObj,
      msg,
      ...args,
    );
  }

  error(msg: string, ...args: unknown[]): void;
  error(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  error(msgOrObj: unknown, msg?: string, ...args: unknown[]): void {
    (this.impl.error as (msgOrObj: unknown, msg?: string, ...args: unknown[]) => void)(
      msgOrObj,
      msg,
      ...args,
    );
  }

  fatal(msg: string, ...args: unknown[]): void;
  fatal(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  fatal(msgOrObj: unknown, msg?: string, ...args: unknown[]): void {
    (this.impl.fatal as (msgOrObj: unknown, msg?: string, ...args: unknown[]) => void)(
      msgOrObj,
      msg,
      ...args,
    );
  }

  child(bindings: Record<string, unknown>): ILogger {
    return this.impl.child(bindings);
  }

  setLevel(level: LogLevel): void {
    this.impl.setLevel(level);
  }

  close(): Promise<void> {
    return this.impl.close();
  }
}

function pinoInstanceToLogger(instance: any): ILogger {
  const wrap = (method: (msgOrObj: unknown, msg?: string, ...args: unknown[]) => void) => {
    return (msgOrObj: unknown, msg?: string, ...args: unknown[]) => {
      method.call(instance, msgOrObj, msg, ...args);
    };
  };
  return {
    trace: wrap(instance.trace),
    debug: wrap(instance.debug),
    info: wrap(instance.info),
    warn: wrap(instance.warn),
    error: wrap(instance.error),
    fatal: wrap(instance.fatal),
    child(bindings: Record<string, unknown>) {
      return pinoInstanceToLogger(instance.child(bindings));
    },
    setLevel(level: string) {
      instance.level = level;
    },
    async close() {
      await instance.flush();
    },
  };
}

export function createFileTransport(options: FileTransportOptions): PinoTransportTarget {
  return {
    target: 'pino-roll',
    options: {
      file: options.file,
      ...(options.size && { size: options.size }),
      ...(options.frequency && { frequency: options.frequency }),
      ...(options.limit && { limit: { count: options.limit } }),
      ...(options.mkdir !== undefined && { mkdir: options.mkdir }),
      ...(options.dateFormat && { dateFormat: options.dateFormat }),
      ...(options.symlink !== undefined && { symlink: options.symlink }),
    },
  };
}

export function createLogger(options?: LoggerOptions): Logger {
  return new Logger(options);
}
