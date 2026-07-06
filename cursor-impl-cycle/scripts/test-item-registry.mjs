#!/usr/bin/env node
import { buildItemRegistry, validateDependsOn } from "../lib/item-registry.mjs";
import { loadProjectConfig, PACK_ROOT, resolvePaths, resolveWorkspaceRoot } from "../lib/paths.mjs";
import fs from "node:fs";
import path from "node:path";

const errors = [];
function check(cond, msg) {
  if (!cond) errors.push(msg);
}

const workspaceRoot = resolveWorkspaceRoot(PACK_ROOT);
const project = loadProjectConfig();
const paths = resolvePaths(workspaceRoot, project);
const moduleMap = JSON.parse(fs.readFileSync(paths.moduleMapPath, "utf8"));
const moduleIds = moduleMap.modules.map((m) => m.id);
const registry = buildItemRegistry(paths);

const shellPath = path.join(paths.decomposeDir, "MOD-DRSAM-SHELL.json");
const shell = JSON.parse(fs.readFileSync(shellPath, "utf8"));
const shellErrors = validateDependsOn(shell, registry, moduleIds);
check(shellErrors.length === 0, `SHELL decompose should validate: ${shellErrors.join("; ")}`);

const bad = validateDependsOn(
  {
    module_id: "MOD-TEST",
    decomposed: true,
    items: [{ id: "X1", depends_on: ["ENUMS-01-navigation-labels"] }],
  },
  registry,
  moduleIds,
);
check(bad.length > 0, "ENUMS-01 typo should fail validation");

import { planWave } from "../lib/scheduler.mjs";

const cycle = {
  active: true,
  phase: "implement",
  modules: [
    {
      id: "MOD-DRSAM-DESIGN-SYSTEM",
      decompose_passes: true,
      items: [
        { id: "DS-01", implement_passes: true, implement_gate: "triage" },
        { id: "DS-02", implement_passes: true, implement_gate: "triage" },
      ],
    },
    {
      id: "MOD-DRSAM-SHELL",
      decompose_passes: true,
      items: [
        {
          id: "SHELL-02-enum-view-router-and-feature-slots",
          implement_passes: true,
          implement_gate: "triage",
          depends_on: [],
        },
        {
          id: "SHELL-05-home-dashboard-shell-and-header",
          implement_passes: false,
          implement_gate: "write",
          depends_on: ["SHELL-02-enum-view-router-and-feature-slots", "MOD-DRSAM-DESIGN-SYSTEM"],
        },
      ],
    },
  ],
};

const plan = await planWave({ cycle, paths, project });
const ready = plan.kind === "wave" ? plan.dispatches.map((d) => d.target_id) : [];
check(
  ready.includes("SHELL-05-home-dashboard-shell-and-header"),
  "module-level MOD-DRSAM-DESIGN-SYSTEM dep should unblock SHELL-05",
);

if (errors.length) {
  console.error("FAIL test-item-registry.mjs:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK test-item-registry.mjs");
