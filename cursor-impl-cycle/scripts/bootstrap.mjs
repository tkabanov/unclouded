import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadProjectConfig,
  packRelPath,
  PACK_ROOT,
  resolvePaths,
  resolveWorkspaceRoot,
} from "../lib/paths.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function main() {
  const workspaceRoot = resolveWorkspaceRoot(PACK_ROOT);
  const project = loadProjectConfig();
  const paths = resolvePaths(workspaceRoot, project);

  const dirs = [
    path.join(PACK_ROOT, "state"),
    paths.stateDir,
    paths.outputDir,
    paths.reportsDir,
    paths.decomposeDir,
    paths.coverageDir,
    path.join(PACK_ROOT, "hooks"),
    path.join(PACK_ROOT, "install"),
  ];
  for (const dir of dirs) fs.mkdirSync(dir, { recursive: true });

  const cycleTemplate = {
    active: false,
    phase: "scope",
    gate_stage: "write",
    current_module_id: null,
    current_item_id: null,
    modules: [],
    iteration: 0,
    target_iteration: 0,
    started_at: null,
    last_checked_at: null,
  };

  if (!fs.existsSync(paths.cyclePath)) {
    writeJson(paths.cyclePath, cycleTemplate);
  }

  if (!fs.existsSync(paths.progressPath)) {
    fs.writeFileSync(paths.progressPath, `# cursor-impl-cycle progress\n`, "utf8");
  }

  console.log("cursor-impl-cycle bootstrap OK");
  console.log(`  state: ${paths.stateDir}`);
  console.log(`  output: ${paths.outputDir}`);
  console.log("\nNext:");
  console.log("  cd cursor-impl-cycle && npm install");
  console.log('  Edit state/cycle.json: { "active": true }');
  const packRel = packRelPath(PACK_ROOT, workspaceRoot);
  console.log(`  bash ${packRel}/install/install-hooks.sh`);
}

main();
