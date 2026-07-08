#!/usr/bin/env node
/**
 * Validate decompose target_files against path-conventions (no features/, etc.)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadProjectConfig, resolvePaths } from "../lib/paths.mjs";
import { resolveWorkspaceRoot } from "../lib/workspace.mjs";

const PACK_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main() {
  const workspaceRoot = resolveWorkspaceRoot(PACK_ROOT);
  const project = loadProjectConfig(PACK_ROOT);
  const paths = resolvePaths(workspaceRoot, project, PACK_ROOT);
  const conventions = JSON.parse(fs.readFileSync(paths.pathConventionsPath, "utf8"));
  const forbidden = conventions.forbidden_target_prefixes ?? [];
  const allowedRoots = [
    "frontend/src/pages/",
    "frontend/src/components/",
    "frontend/src/lib/",
    "frontend/src/hooks/",
    "frontend/src/integrations/",
    "frontend/src/styles/",
    "frontend/src/App.tsx",
  ];

  const errors = [];
  let total = 0;

  for (const name of fs.readdirSync(paths.decomposeDir)) {
    if (!name.endsWith(".json")) continue;
    const data = JSON.parse(fs.readFileSync(path.join(paths.decomposeDir, name), "utf8"));
    for (const item of data.items ?? []) {
      for (const file of item.target_files ?? []) {
        total += 1;
        for (const prefix of forbidden) {
          if (file.startsWith(prefix)) {
            errors.push(`${name} ${item.id}: forbidden prefix ${prefix} in ${file}`);
          }
        }
        const ok = allowedRoots.some((r) => file === r.replace(/\/$/, "") || file.startsWith(r));
        if (!ok) {
          errors.push(`${name} ${item.id}: path outside allowed layout: ${file}`);
        }
      }
    }
  }

  if (errors.length) {
    console.error(`FAIL: ${errors.length} path issue(s) in ${total} target_files`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log(`OK: ${total} target_files pass layout validation`);
}

main();
