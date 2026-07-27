import type { DatabaseAdapter, Database } from "./adapter";
import { MysqlAdapter } from "./adapters/mysql";
import { D1Adapter } from "./adapters/d1";
import { SqliteAdapter } from "./adapters/sqlite";

const registry = new Map<Database, DatabaseAdapter>();

registry.set("mysql", new MysqlAdapter());
registry.set("d1", new D1Adapter());
registry.set("sqlite", new SqliteAdapter());

export function getAdapter(db: Database): DatabaseAdapter {
  const adapter = registry.get(db);
  if (!adapter) {
    throw new Error(`Unsupported database: ${db}`);
  }
  return adapter;
}
