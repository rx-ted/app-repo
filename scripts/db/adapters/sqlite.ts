import type { DatabaseAdapter } from "../adapter";
import { drizzle } from "./drizzle";

const config = "config/drizzle/sqlite.config.ts";

export class SqliteAdapter implements DatabaseAdapter {
  async generate() {
    await drizzle("generate", config);
  }

  async push() {
    await drizzle("push", config, ["--force"]);
  }

  async pull() {
    await drizzle("pull", config);
  }

  async migrate() {
    await drizzle("push", config, ["--force"]);
  }

  async studio() {
    await drizzle("studio", config);
  }

  async drop() {
    await drizzle("drop", config);
  }
}
