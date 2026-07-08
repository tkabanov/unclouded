#!/usr/bin/env node
/**
 * Offline smoke test for stop hook state machine using fixture artifacts.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runStopHook } from "../hooks/stop.mjs";
import { loadProjectConfig, PACK_ROOT, resolvePaths, resolveWorkspaceRoot } from "../lib/paths.mjs";

const realWorkspaceRoot = resolveWorkspaceRoot(PACK_ROOT);
const sandboxRoot = path.join(realWorkspaceRoot, ".cursor-impl-cycle-test-sandbox", "ws");
const sandboxPackRoot = path.join(sandboxRoot, "cursor-impl-cycle");
const project = loadProjectConfig();
// This suite validates the legacy single-target state machine.
project.auto_start_implement = true;
project.parallel = { enabled: false };
// Fully sandboxed: state/output live under the sandbox pack copy, not the real pack.
const paths = resolvePaths(sandboxRoot, project, sandboxPackRoot);

function prepareSandbox() {
  fs.rmSync(path.join(realWorkspaceRoot, ".cursor-impl-cycle-test-sandbox"), {
    recursive: true,
    force: true,
  });
  fs.mkdirSync(path.join(sandboxRoot, "ir"), { recursive: true });
  fs.copyFileSync(
    path.join(realWorkspaceRoot, "ir/inventory.json"),
    path.join(sandboxRoot, "ir/inventory.json"),
  );
  fs.mkdirSync(path.join(sandboxRoot, "cursor-impl-cycle"), { recursive: true });
  fs.cpSync(PACK_ROOT, path.join(sandboxRoot, "cursor-impl-cycle"), { recursive: true });
}

function writeJson(p, d) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(d, null, 2)}\n`);
}

function setupFixtures() {
  fs.mkdirSync(paths.stateDir, { recursive: true });
  fs.mkdirSync(paths.reportsDir, { recursive: true });
  fs.mkdirSync(paths.decomposeDir, { recursive: true });
  fs.mkdirSync(paths.coverageDir, { recursive: true });

  writeJson(paths.cyclePath, {
    active: true,
    phase: "scope",
    gate_stage: "write",
    current_module_id: null,
    current_item_id: null,
    modules: [],
    iteration: 0,
    target_iteration: 0,
  });

  writeJson(paths.moduleMapPath, {
    summary: "Test module map for smoke test",
    modules: [
      {
        id: "MOD-QMS",
        title: "QMS",
        purpose: "Quality module tab with lists and forms",
        ir_roots: ["bTviH"],
        ir_slices: ["ir/slices/reusable-bTviH.json"],
        estimated_size: "large",
        priority: 10,
      },
    ],
  });

  writeJson(path.join(paths.decomposeDir, "MOD-QMS.json"), {
    module_id: "MOD-QMS",
    decomposed: true,
    items: [
      {
        id: "QMS-01-lists",
        title: "List engine",
        scope: "frontend — migrate QMS list reusable preserving IR hierarchy and styles",
        acceptance_criteria: ["AC-1: List route works", "AC-2: Filters work"],
        ir_refs: ["bTviH"],
        depends_on: [],
      },
      {
        id: "QMS-02-tasks",
        title: "Assigned tasks",
        scope: "frontend — render assigned tasks secondary list with preserved layout",
        acceptance_criteria: ["AC-1: Secondary list visible"],
        ir_refs: [],
        depends_on: [],
      },
      {
        id: "QMS-03-export",
        title: "Export",
        scope: "frontend — CSV export action wired to existing Supabase surface (read-only)",
        acceptance_criteria: ["AC-1: CSV export"],
        ir_refs: [],
        depends_on: ["QMS-01-lists"],
      },
    ],
  });

  writeJson(path.join(paths.coverageDir, "QMS-01-lists.json"), {
    item_id: "QMS-01-lists",
    module_id: "MOD-QMS",
    assessed_at: new Date().toISOString(),
    coverage_pct: 95,
    preflight: {
      existing_files_found: ["frontend/src/pages/Index.tsx"],
      gaps: [],
      reuse_decision: "extend",
    },
    criteria: [
      { id: "AC-1", status: "pass", evidence: ["frontend/src/pages/Index.tsx"] },
      { id: "AC-2", status: "pass", evidence: ["frontend/src/lib/utils.ts"] },
    ],
    files_changed: ["frontend/src/pages/Index.tsx"],
  });
}

function writeReview(phase, targetId, extra = {}) {
  const base = {
    phase,
    target_id: targetId,
    assessed_at: new Date().toISOString(),
    ok: true,
    readiness_pct: 90,
    coverage_confidence_pct: 88,
    scores: { completeness: 4, grounding: 4, actionability: 5 },
    gaps: [],
    blockers: [],
    ...extra,
  };
  writeJson(path.join(paths.reportsDir, `${phase}-${targetId}.review.json`), base);
}

function writeTriage(phase, targetId, extra = {}) {
  const base = {
    phase,
    target_id: targetId,
    assessed_at: new Date().toISOString(),
    review_ref: `cursor-impl-cycle/output/reports/${phase}-${targetId}.review.json`,
    ok_to_advance: true,
    rewrite_required: false,
    decisions: [],
    summary: "smoke test pass",
    ...extra,
  };
  writeJson(path.join(paths.reportsDir, `${phase}-${targetId}.triage.json`), base);
}

async function runStep(label, mutateCycle) {
  const cycle = JSON.parse(fs.readFileSync(paths.cyclePath, "utf8"));
  if (mutateCycle) mutateCycle(cycle);
  fs.writeFileSync(paths.cyclePath, `${JSON.stringify(cycle, null, 2)}\n`);
  const result = await runStopHook({}, { dryRun: true, persistState: true, workspaceRoot: sandboxRoot, project, paths });
  console.log(`${label}: ${result.action}`);
  return result;
}

async function main() {
  prepareSandbox();
  setupFixtures();
  const errors = [];

  let r = await runStep("scope write→review request", (c) => {
    c.phase = "scope";
    c.gate_stage = "write";
  });
  if (r.action !== "followup-review-required") errors.push(`expected followup-review-required, got ${r.action}`);

  writeReview("scope", "scope");
  r = await runStep("scope review pass → triage", (c) => {
    c.gate_stage = "review";
  });
  if (r.action !== "followup-triage-required") errors.push(`expected followup-triage-required, got ${r.action}`);

  writeTriage("scope", "scope");
  r = await runStep("scope triage → decompose", (c) => {
    c.gate_stage = "triage";
  });
  if (r.action !== "advance" || r.phase !== "decompose") errors.push(`scope advance failed: ${JSON.stringify(r)}`);

  r = await runStep("decompose write→review", (c) => {
    c.gate_stage = "write";
    c.current_module_id = "MOD-QMS";
  });
  if (r.action !== "followup-review-required") errors.push(`decompose review request failed`);

  writeReview("decompose", "MOD-QMS");
  r = await runStep("decompose review → triage", (c) => {
    c.gate_stage = "review";
  });
  if (r.action !== "followup-triage-required") errors.push(`decompose triage request failed`);

  writeTriage("decompose", "MOD-QMS");
  r = await runStep("decompose triage → implement", (c) => {
    c.gate_stage = "triage";
  });
  if (r.action !== "advance" || r.phase !== "implement") errors.push(`decompose advance failed`);

  r = await runStep("implement write→review", (c) => {
    c.gate_stage = "write";
    c.current_item_id = "QMS-01-lists";
  });
  if (r.action !== "followup-review-required") errors.push(`implement review request failed`);

  writeReview("implement", "QMS-01-lists", {
    coverage_pct: 95,
    functional_ok: true,
    functional_audit: [{ id: "FV-1", status: "pass", evidence: ["frontend/src/pages/Index.tsx"] }],
  });
  r = await runStep("implement review → triage", (c) => {
    c.gate_stage = "review";
  });
  if (r.action !== "followup-triage-required") errors.push(`implement triage request failed`);

  writeTriage("implement", "QMS-01-lists");
  r = await runStep("implement triage → next item", (c) => {
    c.gate_stage = "triage";
  });
  if (r.action !== "advance") errors.push(`implement advance failed: ${r.action}`);

  const cycle = JSON.parse(fs.readFileSync(paths.cyclePath, "utf8"));
  const item = cycle.modules?.[0]?.items?.find((i) => i.id === "QMS-01-lists");
  if (!item?.implement_passes) errors.push("QMS-01-lists should be implement_passes after 95% review");

  if (errors.length) {
    console.error("FAIL:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("OK test-stop-hook.mjs (isolated sandbox — real state untouched)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
