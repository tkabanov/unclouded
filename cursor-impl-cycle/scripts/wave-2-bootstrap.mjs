#!/usr/bin/env node
/**
 * Wave-2 bootstrap: merge new decompose items into cycle.json, reopen falsely
 * passed items, clear their review/triage artifacts, rebuild item-registry,
 * reactivate implement phase.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rebuildItemRegistry } from "../lib/item-registry.mjs";
import { loadItemsWithDeps } from "../lib/scheduler.mjs";
import {
  loadProjectConfig,
  PACK_ROOT,
  resolvePaths,
  resolveWorkspaceRoot,
} from "../lib/paths.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function decomposePath(paths, moduleId) {
  return path.join(paths.decomposeDir, `${moduleId}.json`);
}

function clearReviewArtifacts(paths, itemId) {
  const review = path.join(
    paths.reportsDir,
    `implement-${itemId}.review.json`,
  );
  const triage = path.join(
    paths.reportsDir,
    `implement-${itemId}.triage.json`,
  );
  const coverage = path.join(paths.coverageDir, `${itemId}.json`);
  for (const p of [review, triage, coverage]) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

function freshItemFromDecompose(item) {
  return {
    id: item.id,
    implement_passes: false,
    implement_gate: "write",
    implement_iteration: 0,
    coverage_pct: 0,
    depends_on: Array.isArray(item.depends_on) ? item.depends_on : [],
    target_files: Array.isArray(item.target_files) ? item.target_files : [],
    wave: 2,
  };
}

function mergeModuleItems(cycleMod, decomposeItems, reopenIds) {
  const byId = new Map((cycleMod.items ?? []).map((i) => [i.id, i]));
  const reopenSet = new Set(reopenIds);

  for (const dItem of decomposeItems) {
    const existing = byId.get(dItem.id);
    if (!existing) {
      byId.set(dItem.id, freshItemFromDecompose(dItem));
      continue;
    }
    if (reopenSet.has(dItem.id)) {
      byId.set(dItem.id, {
        ...existing,
        ...freshItemFromDecompose(dItem),
        wave: 2,
        reopen_reason: "wave-2 functional gap",
      });
    }
  }

  cycleMod.items = [...byId.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
}

function main() {
  const workspaceRoot = resolveWorkspaceRoot(PACK_ROOT);
  const project = loadProjectConfig();
  const paths = resolvePaths(workspaceRoot, project);
  const manifestPath = path.join(paths.stateDir, "wave-2-manifest.json");
  const manifest = loadJson(manifestPath);
  const reopenIds = (manifest.reopen ?? []).map((r) => r.id);
  const cycle = loadJson(paths.cyclePath);
  const moduleMap = loadJson(paths.moduleMapPath);

  const cycleModById = new Map((cycle.modules ?? []).map((m) => [m.id, m]));

  for (const mod of moduleMap.modules) {
    const decomposeFile = decomposePath(paths, mod.id);
    if (!fs.existsSync(decomposeFile)) {
      console.warn(`skip missing decompose: ${mod.id}`);
      continue;
    }
    const decompose = loadJson(decomposeFile);
    if (!decompose.decomposed) continue;

    let cycleMod = cycleModById.get(mod.id);
    if (!cycleMod) {
      cycleMod = {
        id: mod.id,
        decompose_passes: true,
        decompose_gate: "triage",
        decompose_iteration: 0,
        items: loadItemsWithDeps(paths, mod.id).map((i) => ({
          ...i,
          wave: 2,
        })),
      };
      cycle.modules.push(cycleMod);
      cycleModById.set(mod.id, cycleMod);
    } else {
      mergeModuleItems(cycleMod, decompose.items ?? [], reopenIds);
      cycleMod.decompose_passes = true;
    }
  }

  for (const id of reopenIds) {
    clearReviewArtifacts(paths, id);
  }

  const now = new Date().toISOString();
  cycle.active = true;
  cycle.phase = "implement";
  cycle.gate_stage = "write";
  cycle.current_module_id = null;
  cycle.current_item_id = null;
  cycle.wave = 2;
  cycle.wave_started_at = now;
  cycle.last_checked_at = null;

  writeJson(paths.cyclePath, cycle);
  const registry = rebuildItemRegistry(paths, cycle);

  const newItemCount = Object.values(cycle.modules)
    .flatMap((m) => m.items ?? [])
    .filter((i) => i.wave === 2 && !i.implement_passes).length;

  const reopenCount = reopenIds.length;

  console.log("wave-2-bootstrap OK");
  console.log(`  cycle: active=true phase=implement wave=2`);
  console.log(`  reopened items: ${reopenCount}`);
  console.log(`  pending wave-2 items: ${newItemCount}`);
  console.log(`  item-registry: ${Object.keys(registry.items).length} items`);
  console.log(`  functional rubric: prompts/functional-review-rubric.md`);
  console.log(`  manifest: state/wave-2-manifest.json`);
}

main();
