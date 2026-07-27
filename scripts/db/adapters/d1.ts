import type { DatabaseAdapter } from "../adapter";
import { drizzle } from "./drizzle";
import { executeD1Migrations } from "../utils/migration";

const config = "config/drizzle/d1.config.ts";
const migrationsDir = "drizzle/d1";

export class D1Adapter implements DatabaseAdapter {
  async generate() {
    await drizzle("generate", config);
  }

  async push() {
    await executeD1Migrations(migrationsDir);
  }

  async pull() {
    await drizzle("pull", config);
  }

  async migrate() {
    await executeD1Migrations(migrationsDir);
  }

  async studio() {
    await drizzle("studio", config);
  }

  async drop() {
    await drizzle("drop", config);
  }
}
