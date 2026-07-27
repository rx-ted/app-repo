import { execa } from "execa";

export async function exec(command: string, args: string[], env?: Record<string, string | undefined>) {
  await execa(command, args, {
    stdio: "inherit",
    env,
  });
}

export async function execCapture(command: string, args: string[], env?: Record<string, string | undefined>) {
  const result = await execa(command, args, { env });
  return result.stdout;
}
