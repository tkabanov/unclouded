#!/usr/bin/env node
/**
 * Re-review bootstrap: reset gap modules to implement_gate=review,
 * clear review/triage artifacts (keep coverage), reactivate cycle.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rebuildItemRegistry } from "../lib/item-registry.mjs";
import {
  loadProjectConfig,
  PACK_ROOT,
  resolvePaths,
  resolveWorkspaceRoot,
} from "../lib/paths.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Modules flagged by independent audit (coverage < ~95% or partial). */
const RE_REVIEW_MODULES = [
  "MOD-DRSAM-DASHBOARD",
  "MOD-DRSAM-PATHS",
  "MOD-DRSAM-CHAT",
  "MOD-DRSAM-SETTINGS",
  "MOD-DRSAM-API",
];

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
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
  for (const p of [review, triage]) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

function main() {
  const workspaceRoot = resolveWorkspaceRoot(PACK_ROOT);
  const project = loadProjectConfig();
  const paths = resolvePaths(workspaceRoot, project);
  const cycle = loadJson(paths.cyclePath);
  const moduleSet = new Set(RE_REVIEW_MODULES);
  const resetIds = [];

  for (const mod of cycle.modules ?? []) {
    if (!moduleSet.has(mod.id)) continue;
    for (const item of mod.items ?? []) {
      clearReviewArtifacts(paths, item.id);
      item.implement_passes = false;
      item.implement_gate = "review";
      item.reopen_reason = "independent-audit re-review";
      item.re_review_wave = 3;
      resetIds.push(item.id);
    }
  }

  const now = new Date().toISOString();
  cycle.active = true;
  cycle.phase = "implement";
  cycle.gate_stage = "review";
  cycle.current_module_id = null;
  cycle.current_item_id = null;
  cycle.wave = 3;
  cycle.wave_started_at = now;
  cycle.re_review_ref = "cursor-impl-cycle/state/re-review-manifest.json";
  delete cycle.completed_at;
  delete cycle.closeout_ref;
  cycle.last_checked_at = null;

  writeJson(paths.cyclePath, cycle);
  rebuildItemRegistry(paths, cycle);

  const manifest = {
    wave: "re-review",
    assessed_from: "independent module audit 2026-07-08",
    modules: RE_REVIEW_MODULES,
    item_ids: resetIds,
    reset_at: now,
    gate: "review",
    note: "Coverage kept; review+triage cleared. Scheduler dispatches needs-review first.",
  };
  writeJson(path.join(paths.stateDir, "re-review-manifest.json"), manifest);

  const progressPath = paths.progressPath;
  fs.mkdirSync(path.dirname(progressPath), { recursive: true });
  fs.appendFileSync(
    progressPath,
    `${now} RESUME re-review wave-3: ${resetIds.length} items → review gate (${RE_REVIEW_MODULES.join(", ")})\n`,
  );

  console.log("re-review-bootstrap OK");
  console.log(`  cycle: active=true phase=implement gate=review wave=3`);
  console.log(`  modules: ${RE_REVIEW_MODULES.length}`);
  console.log(`  items reset to review: ${resetIds.length}`);
  console.log(`  manifest: cursor-impl-cycle/state/re-review-manifest.json`);
}

main();
