#!/usr/bin/env node
/**
 * Reset cursor-impl-cycle artifacts for a fresh run.
 * Clears output (decompose, reports, coverage, MODULE-MAP.md) and runtime state;
 * writes a new active cycle at phase "scope".
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadProjectConfig, PACK_ROOT, resolvePaths, resolveWorkspaceRoot } from "../lib/paths.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function rmDirContents(dir) {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const name of fs.readdirSync(dir)) {
    if (name === ".gitkeep") continue;
    fs.rmSync(path.join(dir, name), { recursive: true, force: true });
    n += 1;
  }
  return n;
}

function main() {
  const workspaceRoot = resolveWorkspaceRoot(PACK_ROOT);
  const project = loadProjectConfig();
  const paths = resolvePaths(workspaceRoot, project);
  const now = new Date().toISOString();

  const removed = {
    decompose: rmDirContents(paths.decomposeDir),
    reports: rmDirContents(paths.reportsDir),
    coverage: rmDirContents(paths.coverageDir),
  };

  const moduleMapMd = paths.moduleMapMdPath;
  if (fs.existsSync(moduleMapMd)) {
    fs.unlinkSync(moduleMapMd);
    removed.moduleMapMd = 1;
  }

  for (const p of [paths.moduleMapPath, paths.briefPath]) {
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      removed[path.basename(p)] = 1;
    }
  }

  const briefsDir = path.join(paths.stateDir, "briefs");
  if (fs.existsSync(briefsDir)) {
    removed.briefs = rmDirContents(briefsDir);
    fs.rmdirSync(briefsDir);
  }

  fs.writeFileSync(paths.progressPath, `# cursor-impl-cycle progress\n${now} RESET fresh cycle\n`, "utf8");

  writeJson(paths.cyclePath, {
    active: true,
    phase: "scope",
    gate_stage: "write",
    current_module_id: null,
    current_item_id: null,
    modules: [],
    iteration: 0,
    target_iteration: 0,
    started_at: now,
    last_checked_at: null,
  });

  for (const dir of [paths.decomposeDir, paths.reportsDir, paths.coverageDir, paths.stateDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log("cursor-impl-cycle reset OK");
  console.log(`  removed decompose files: ${removed.decompose}`);
  console.log(`  removed report files: ${removed.reports}`);
  console.log(`  removed coverage files: ${removed.coverage}`);
  console.log(`  cycle: active=true, phase=scope`);
  console.log("\nNext: start orchestrator chat; stop hook will dispatch scope write.");
}

main();
