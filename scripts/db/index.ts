import { getAdapter } from "./registry";

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("Usage: pnpm db <command> <mysql|d1|sqlite>");
    console.error("  command: generate, push, pull, migrate, studio, drop");
    process.exit(1);
  }

  const [command, db] = args as [string, string];
  const adapter = getAdapter(db);

  switch (command) {
    case "generate":
      return adapter.generate();
    case "push":
      return adapter.push();
    case "pull":
      return adapter.pull();
    case "migrate":
      return adapter.migrate();
    case "studio":
      return adapter.studio();
    case "drop":
      return adapter.drop();
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Commands: generate, push, pull, migrate, studio, drop");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
