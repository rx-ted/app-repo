export type Database = "mysql" | "d1" | "sqlite";

export interface DatabaseAdapter {
  generate(): Promise<void>;
  push(): Promise<void>;
  pull(): Promise<void>;
  migrate(): Promise<void>;
  studio(): Promise<void>;
  drop(): Promise<void>;
}
