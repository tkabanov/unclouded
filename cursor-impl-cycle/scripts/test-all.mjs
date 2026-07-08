#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("node", ["scripts/test-stop-hook.mjs"]);
run("node", ["scripts/test-scheduler.mjs"]);
run("node", ["scripts/test-item-registry.mjs"]);
run("node", ["scripts/validate-decompose-paths.mjs"]);
console.log("OK test-all.mjs");
