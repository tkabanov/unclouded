#!/usr/bin/env node
import { resolve } from "node:path";
import process from "node:process";

import { buildRegistry } from "./cli/registry.js";

async function main(): Promise<void> {
  const [, , command, ...rest] = process.argv;
  const workspaceRoot = resolve(process.cwd(), "../..");
  const registry = buildRegistry();
  const handler = command ? registry.get(command) : undefined;
  if (!handler) {
    throw new Error(
      "Usage: b2c <ingest|phase6:materialize|accept:m1|accept:m2|phase6:list-emitters|invalidate> ...",
    );
  }
  const args = rest.filter((arg) => arg !== "--");
  await handler({ workspaceRoot, args });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
