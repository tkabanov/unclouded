#!/usr/bin/env node
/**
 * Offline smoke test for the parallel wave scheduler (parallel.enabled: true).
 * Validates: decompose fan-out, gate advancement across a wave, phase advance,
 * and implement DAG readiness + serial writer cap.
 */
import fs from "node:fs";
import path from "node:path";
import { runStopHook } from "../hooks/stop.mjs";
import { planWave } from "../lib/scheduler.mjs";
import { loadProjectConfig, PACK_ROOT, resolvePaths, resolveWorkspaceRoot } from "../lib/paths.mjs";

const realWorkspaceRoot = resolveWorkspaceRoot(PACK_ROOT);
const sandboxRoot = path.join(realWorkspaceRoot, ".cursor-impl-cycle-sched-sandbox", "ws");
const sandboxPackRoot = path.join(sandboxRoot, "cursor-impl-cycle");
const project = loadProjectConfig();
project.auto_start_implement = true;
project.parallel = { enabled: true, decompose: { max: 4 }, implement: { write_strategy: "serial", review_triage_max: 4 } };
const paths = resolvePaths(sandboxRoot, project, sandboxPackRoot);

const errors = [];
function check(cond, msg) {
  if (!cond) errors.push(msg);
}

function writeJson(p, d) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(d, null, 2)}\n`);
}

function prepareSandbox() {
  fs.rmSync(path.join(realWorkspaceRoot, ".cursor-impl-cycle-sched-sandbox"), { recursive: true, force: true });
  fs.mkdirSync(path.join(sandboxRoot, "ir"), { recursive: true });
  fs.copyFileSync(
    path.join(realWorkspaceRoot, "ir/inventory.json"),
    path.join(sandboxRoot, "ir/inventory.json"),
  );
  fs.mkdirSync(path.join(sandboxRoot, "cursor-impl-cycle"), { recursive: true });
  fs.cpSync(PACK_ROOT, path.join(sandboxRoot, "cursor-impl-cycle"), { recursive: true });
}

const MODULES = ["MOD-A", "MOD-B", "MOD-C"];

function decomposeFixture(moduleId) {
  const items = {
    "MOD-A": [{ id: "A1-shell", depends_on: [] }],
    "MOD-B": [{ id: "B1-base", depends_on: [] }],
    "MOD-C": [
      { id: "C1-feature", depends_on: ["B1-base"] },
      { id: "C2-leaf", depends_on: [] },
    ],
  }[moduleId];
  return {
    module_id: moduleId,
    decomposed: true,
    items: items.map((it) => ({
      id: it.id,
      title: `Item ${it.id}`,
      scope: `frontend — migrate reusable for ${it.id} with preserved IR hierarchy and styles`,
      acceptance_criteria: [`AC-1: ${it.id} renders with data-bubble-id root`],
      ir_refs: ["bTviH"],
      depends_on: it.depends_on,
    })),
  };
}

function passReview(phase, targetId, extra = {}) {
  writeJson(path.join(paths.reportsDir, `${phase}-${targetId}.review.json`), {
    phase,
    target_id: targetId,
    ok: true,
    readiness_pct: 90,
    coverage_confidence_pct: 88,
    blockers: [],
    ...extra,
  });
}

function passTriage(phase, targetId) {
  writeJson(path.join(paths.reportsDir, `${phase}-${targetId}.triage.json`), {
    phase,
    target_id: targetId,
    ok_to_advance: true,
    rewrite_required: false,
    decisions: [],
  });
}

function setupCycle() {
  fs.mkdirSync(paths.stateDir, { recursive: true });
  fs.mkdirSync(paths.reportsDir, { recursive: true });
  fs.mkdirSync(paths.decomposeDir, { recursive: true });
  fs.mkdirSync(paths.coverageDir, { recursive: true });
  writeJson(paths.cyclePath, {
    active: true,
    phase: "decompose",
    gate_stage: "write",
    current_module_id: null,
    current_item_id: null,
    modules: MODULES.map((id) => ({ id, decompose_passes: false, items: [] })),
    iteration: 0,
    target_iteration: 0,
  });
}

async function tick(label) {
  const r = await runStopHook({}, { dryRun: true, persistState: true, workspaceRoot: sandboxRoot, project, paths });
  console.log(`${label}: ${r.action}${r.count != null ? ` x${r.count}` : ""}${r.phase ? ` (${r.phase})` : ""}`);
  return r;
}

async function main() {
  prepareSandbox();
  setupCycle();

  // 1. All modules need write → wave of 3 write dispatches.
  let r = await tick("decompose write wave");
  check(r.action === "wave" && r.phase === "decompose", `expected decompose wave, got ${r.action}`);
  check(r.count === 3, `expected 3 write dispatches, got ${r.count}`);

  // 2. Provide decompose outputs → script gate passes → wave of 3 review dispatches.
  for (const m of MODULES) writeJson(path.join(paths.decomposeDir, `${m}.json`), decomposeFixture(m));
  r = await tick("decompose review wave");
  check(r.action === "wave" && r.count === 3, `expected 3 review dispatches, got ${r.action} x${r.count}`);
  let manifest = JSON.parse(fs.readFileSync(paths.briefPath, "utf8"));
  check(manifest.dispatches.every((d) => d.role === "review"), "all dispatches should be review");
  check(
    manifest.dispatches.every((d) => d.model == null),
    "review dispatches should have null model (auto)",
  );

  // 3. Pass reviews → wave of 3 triage dispatches.
  for (const m of MODULES) passReview("decompose", m);
  r = await tick("decompose triage wave");
  check(r.action === "wave" && r.count === 3, `expected 3 triage dispatches, got ${r.action} x${r.count}`);

  // 4. Pass triages → all decompose done → advance to implement → first implement wave.
  for (const m of MODULES) passTriage("decompose", m);
  r = await tick("advance to implement wave");
  check(r.action === "wave" && r.phase === "implement", `expected implement wave, got ${r.action} (${r.phase})`);
  check(r.count === 1, `serial write_strategy should cap writers to 1, got ${r.count}`);
  manifest = JSON.parse(fs.readFileSync(paths.briefPath, "utf8"));
  check(manifest.dispatches[0].role === "implement", "implement wave should dispatch a writer");
  check(
    manifest.dispatches[0].model == null,
    `implement dispatch should use auto model (null), got ${manifest.dispatches[0].model}`,
  );

  // 5. DAG readiness:
  const cycle = JSON.parse(fs.readFileSync(paths.cyclePath, "utf8"));
  const plan = await planWave({ cycle, paths, project });
  const readyIds = plan.kind === "wave" ? plan.dispatches.map((d) => d.target_id) : [];
  check(!readyIds.includes("C1-feature"), "C1-feature must be blocked until B1-base passes");

  // Mark all of C's dependency chain except C1 as passed, then C1 becomes ready.
  for (const mod of cycle.modules) {
    for (const it of mod.items) {
      if (it.id !== "C1-feature") it.implement_passes = true;
    }
  }
  const plan2 = await planWave({ cycle, paths, project });
  const ready2 = plan2.kind === "wave" ? plan2.dispatches.map((d) => d.target_id) : [];
  check(ready2.includes("C1-feature"), "C1-feature should be ready once B1-base passed");

  // 6. Disjoint-files writer selection: overlapping target_files must not co-schedule.
  const djProject = {
    ...project,
    parallel: { ...project.parallel, implement: { write_strategy: "disjoint-files", max: 4, review_triage_max: 4 } },
  };
  const mkItem = (id, files) => ({
    id,
    implement_passes: false,
    implement_gate: "write",
    implement_iteration: 0,
    coverage_pct: 0,
    depends_on: [],
    target_files: files,
  });
  const djCycle = {
    active: true,
    phase: "implement",
    modules: [
      {
        id: "MOD-D",
        decompose_passes: true,
        items: [
          mkItem("I1", ["frontend/a.vue"]),
          mkItem("I2", ["frontend/b.vue"]),
          mkItem("I3", ["frontend/a.vue", "frontend/c.vue"]),
          mkItem("I4", ["frontend/d.vue"]),
        ],
      },
    ],
    iteration: 0,
  };
  const djPlan = await planWave({ cycle: djCycle, paths, project: djProject });
  const djIds = djPlan.kind === "wave" ? djPlan.dispatches.map((d) => d.target_id) : [];
  check(
    ["I1", "I2", "I4"].every((id) => djIds.includes(id)),
    `disjoint-files should pick I1,I2,I4; got ${djIds.join(",")}`,
  );
  check(!djIds.includes("I3"), "disjoint-files must skip I3 (overlaps I1 on a.vue)");

  if (errors.length) {
    console.error("FAIL:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("OK test-scheduler.mjs (isolated sandbox — real state untouched)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
