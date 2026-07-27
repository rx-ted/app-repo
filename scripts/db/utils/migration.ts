import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { exec, execCapture } from "./exec";

interface Journal {
  entries: { idx: number; tag: string }[];
}

async function readJournal(migrationsDir: string): Promise<Journal> {
  const raw = await readFile(resolve(migrationsDir, "meta", "_journal.json"), "utf-8");
  return JSON.parse(raw) as Journal;
}

function extractTableNames(sql: string): string[] {
  const tables: string[] = [];
  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/gi;
  let match;
  while ((match = re.exec(sql)) !== null) {
    tables.push(match[1]);
  }
  return tables;
}

async function tableExists(tableName: string, db: string): Promise<boolean> {
  try {
    const stdout = await execCapture("pnpm", [
      "wrangler", "d1", "execute", db, "--local", "--json",
      `--command=SELECT count(*) AS cnt FROM sqlite_master WHERE type='table' AND name='${tableName}'`,
    ]);
    const parsed = JSON.parse(stdout);
    const rows = Array.isArray(parsed) ? parsed[0]?.results : parsed?.results;
    return rows?.[0]?.cnt > 0;
  } catch {
    return false;
  }
}

export async function executeD1Migrations(migrationsDir: string, db: string = "db") {
  const journalPath = resolve(migrationsDir, "meta", "_journal.json");
  if (!existsSync(journalPath)) {
    console.error(`No _journal.json found in ${resolve(migrationsDir, "meta")}`);
    console.error("Run 'pnpm db generate d1' first");
    process.exit(1);
  }

  const journal = await readJournal(migrationsDir);

  // Find the first unapplied migration by checking which tables exist
  let startIdx = 0;
  for (const entry of journal.entries) {
    const sql = await readFile(resolve(migrationsDir, `${entry.tag}.sql`), "utf-8");
    const tables = extractTableNames(sql);
    if (tables.length === 0) break;

    let allExist = true;
    for (const t of tables) {
      if (!(await tableExists(t, db))) {
        allExist = false;
        break;
      }
    }
    if (!allExist) break;
    startIdx++;
  }

  const pending = journal.entries.slice(startIdx);

  if (pending.length === 0) {
    console.log("All D1 migrations already applied.");
    return;
  }

  for (const entry of pending) {
    const filename = `${entry.tag}.sql`;
    const filePath = resolve(migrationsDir, filename);
    console.log(`  Applying ${filename}...`);
    await exec("pnpm", ["wrangler", "d1", "execute", db, "--local", `--file=${filePath}`]);
  }

  console.log(`  Applied ${pending.length} migration(s).`);
}
