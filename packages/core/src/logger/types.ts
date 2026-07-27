export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'trace';

export interface ILogger {
  trace(msg: string, ...args: any[]): void;
  trace(obj: Record<string, unknown>, msg?: string, ...args: any[]): void;
  debug(msg: string, ...args: any[]): void;
  debug(obj: Record<string, unknown>, msg?: string, ...args: any[]): void;
  info(msg: string, ...args: any[]): void;
  info(obj: Record<string, unknown>, msg?: string, ...args: any[]): void;
  warn(msg: string, ...args: any[]): void;
  warn(obj: Record<string, unknown>, msg?: string, ...args: any[]): void;
  error(msg: string, ...args: any[]): void;
  error(obj: Record<string, unknown>, msg?: string, ...args: any[]): void;
  fatal(msg: string, ...args: any[]): void;
  fatal(obj: Record<string, unknown>, msg?: string, ...args: any[]): void;
  child(bindings: Record<string, unknown>): ILogger;
  setLevel(level: LogLevel): void;
  close(): Promise<void>;
}

export interface PinoTransportTarget {
  target: string;
  options?: Record<string, unknown>;
  level?: LogLevel;
}

export const LOGGER_SYMBOL = Symbol('app:logger');

export const NOOP_LOGGER: ILogger = {
  trace() {},
  debug() {},
  info() {},
  warn() {},
  error() {},
  fatal() {},
  child() {
    return NOOP_LOGGER;
  },
  setLevel() {},
  close() {
    return Promise.resolve();
  },
};

export interface LoggerOptions {
  name?: string;
  level?: LogLevel;
  transport?: PinoTransportTarget | PinoTransportTarget[];
  pino?: Record<string, unknown>;
  /** File path to write logs. Only works on Node/Bun (uses pino/file transport). */
  destination?: string;
}

export interface FileTransportOptions {
  /** Base log file path (e.g. 'logs/app'). pino-roll appends rotation numbers. */
  file: string;
  /** Max file size before rotation. Accepts '10m', '1g', etc. */
  size?: string;
  /** Time-based rotation: 'daily', 'hourly', or ms number. */
  frequency?: string | number;
  /** Max rotated files to keep (in addition to active file). */
  limit?: number;
  /** Create parent directories if they don't exist. */
  mkdir?: boolean;
  /** Date format string for rotated filenames (date-fns format). */
  dateFormat?: string;
  /** Maintain a 'current.log' symlink. */
  symlink?: boolean;
}
