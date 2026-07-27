import { exec } from "../utils/exec";
import { env } from "@rx-ted/packages-core";

export async function drizzle(command: string, config: string, args: string[] = []) {
  const childEnv = { ...process.env, NODE_ENV: env.mode === 'prod' ? 'production' : 'development' };
  await exec("pnpm", ["drizzle-kit", command, "--config", config, ...args], childEnv);
}
