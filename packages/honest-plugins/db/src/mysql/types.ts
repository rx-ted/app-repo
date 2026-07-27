import type { Logger } from '@rx-ted/packages-core';

export interface DatabaseOptions {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl?: boolean | { rejectUnauthorized?: boolean; ca?: string; cert?: string; key?: string };
}

export interface SslOptions {
  rejectUnauthorized?: boolean;
  ca?: string;
  cert?: string;
  key?: string;
}

export interface DriverOptions {
  logger?: Logger;
}

export interface DatabaseDriverOptions extends DatabaseOptions, DriverOptions {}

export interface MysqlClientOptions {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl?: boolean | { rejectUnauthorized?: boolean; ca?: string; cert?: string; key?: string };
}
