#!/usr/bin/env node
/**
 * cursor-impl-cycle stop hook — scope → decompose → implement with reviewer gates.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildBrief, buildBriefFor, buildFollowupMessage, buildWaveFollowup, critiqueTriageEnabled } from "../lib/brief.mjs";
import { evaluateReviewGate, evaluateTriageGate, runScriptGate } from "../lib/gates.mjs";
import { coveragePath, decomposePath, loadProjectConfig, PACK_ROOT, resolvePaths, resolveWorkspaceRoot, reviewPath, triagePath } from "../lib/paths.mjs";
import { planWave } from "../lib/scheduler.mjs";

const PHASES = ["scope", "decompose", "implement"];

/** Parse Cursor stop-hook stdin; salvage status when Windows paths break JSON. */
export function parseCursorHookInput(raw) {
  const cleaned = raw.replace(/^\uFEFF/, "").trim();
  if (!cleaned) return {};
  try {
    return JSON.parse(cleaned);
  } catch {
    const status = cleaned.match(/"status"\s*:\s*"(completed|aborted|error)"/)?.[1];
    const loopCount = cleaned.match(/"loop_count"\s*:\s*(\d+)/)?.[1];
    if (status) {
      return {
        status,
        loop_count: loopCount !== undefined ? Number(loopCount) : 0,
        _parse_fallback: true,
      };
    }
    throw new Error(`Invalid hook stdin JSON (${cleaned.slice(0, 120)}…)`);
  }
}

export function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

export function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function appendProgress(progressPath, line) {
  fs.mkdirSync(path.dirname(progressPath), { recursive: true });
  fs.appendFileSync(progressPath, `${line}\n`, "utf8");
}

function checkInventory(paths) {
  if (!fs.existsSync(paths.inventoryPath)) {
    throw new Error(`IR inventory missing: ${paths.inventoryPath}`);
  }
  const inv = loadJson(paths.inventoryPath);
  if (!inv?.entities?.length) throw new Error("IR inventory has no entities");
  return inv.entities.length;
}

function sortedModulesFromMap(moduleMap) {
  return [...(moduleMap.modules ?? [])].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
}

function initCycleModulesFromMap(cycle, moduleMap) {
  cycle.modules = sortedModulesFromMap(moduleMap).map((m) => ({
    id: m.id,
    decompose_passes: false,
    items: [],
  }));
  const first = cycle.modules.find((m) => !m.decompose_passes);
  cycle.current_module_id = first?.id ?? null;
  cycle.current_item_id = null;
}

function loadItemsFromDecompose(paths, moduleId) {
  const file = decomposePath(paths, moduleId);
  if (!fs.existsSync(file)) return [];
  const data = loadJson(file);
  return (data?.items ?? []).map((item) => ({
    id: item.id,
    implement_passes: false,
    coverage_pct: 0,
  }));
}

function findNextDecomposeModule(cycle) {
  return cycle.modules?.find((m) => !m.decompose_passes) ?? null;
}

function findCurrentModule(cycle) {
  return cycle.modules?.find((m) => m.id === cycle.current_module_id) ?? null;
}

function findNextImplementItem(cycle) {
  for (const mod of cycle.modules ?? []) {
    if (!mod.decompose_passes) continue;
    const item = mod.items?.find((i) => !i.implement_passes);
    if (item) return { module: mod, item };
  }
  return null;
}

function allImplementDone(cycle) {
  return (cycle.modules ?? []).every(
    (m) => m.decompose_passes && (m.items ?? []).every((i) => i.implement_passes),
  );
}

function advanceAfterScopeReview(cycle, paths) {
  const moduleMap = loadJson(paths.moduleMapPath);
  if (!moduleMap) return false;
  initCycleModulesFromMap(cycle, moduleMap);
  cycle.phase = "decompose";
  cycle.gate_stage = "write";
  cycle.target_iteration = 0;
  return true;
}

/** @returns {"continue" | "decompose-complete" | "complete"} */
function advanceAfterDecomposeReview(cycle, paths, project) {
  const mod = findCurrentModule(cycle);
  if (mod) {
    mod.decompose_passes = true;
    mod.items = loadItemsFromDecompose(paths, mod.id);
  }
  const next = findNextDecomposeModule(cycle);
  if (next) {
    cycle.current_module_id = next.id;
    cycle.gate_stage = "write";
    cycle.target_iteration = 0;
    return "continue";
  }
  const firstItem = findNextImplementItem(cycle);
  if (firstItem) {
    if (project.auto_start_implement === false) {
      cycle.active = false;
      cycle.gate_stage = "write";
      cycle.current_module_id = null;
      cycle.current_item_id = null;
      return "decompose-complete";
    }
    cycle.phase = "implement";
    cycle.current_module_id = firstItem.module.id;
    cycle.current_item_id = firstItem.item.id;
    cycle.gate_stage = "write";
    cycle.target_iteration = 0;
    return "continue";
  }
  cycle.phase = "complete";
  cycle.active = false;
  return "complete";
}

function advanceAfterImplementReview(cycle, review, project) {
  const threshold = Number(project.coverage_threshold_pct ?? 90);
  const mod = findCurrentModule(cycle);
  const item = mod?.items?.find((i) => i.id === cycle.current_item_id);
  if (item) {
    item.coverage_pct = Number(review.coverage_pct ?? 0);
    if (item.coverage_pct >= threshold && review.ok) {
      item.implement_passes = true;
    }
  }

  if (item && !item.implement_passes) {
    cycle.gate_stage = "write";
    return true;
  }

  const next = findNextImplementItem(cycle);
  if (next) {
    cycle.current_module_id = next.module.id;
    cycle.current_item_id = next.item.id;
    cycle.gate_stage = "write";
    cycle.target_iteration = 0;
    return true;
  }

  if (allImplementDone(cycle)) {
    cycle.phase = "complete";
    cycle.active = false;
    return false;
  }

  cycle.gate_stage = "write";
  return true;
}

function delegateFollowup({ cycle, paths, project, role, reason }) {
  const { brief, templatePath } = buildBrief({ cycle, paths, project, role });
  const message = buildFollowupMessage({ brief, templatePath, reason, role, paths });
  return { payload: { followup_message: message }, brief };
}

function removeTriageFile(paths, phase, targetId) {
  const file = triagePath(paths, phase, targetId);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

function relWs(workspaceRoot, abs) {
  return abs.startsWith(workspaceRoot) ? abs.slice(workspaceRoot.length + 1) : abs;
}

/**
 * Parallel wave scheduler tick. Evaluates ready targets in-process, advances
 * their gates, and dispatches a capped batch of pending work as one wave.
 */
async function runSchedulerTick({ cycle, paths, project, persistState, nowIso }) {
  let plan = await planWave({ cycle, paths, project });

  if (plan.kind === "advance-phase") {
    cycle.phase = plan.next;
    if (persistState) appendProgress(paths.progressPath, `${nowIso} ADVANCE phase → ${plan.next}`);
    plan = await planWave({ cycle, paths, project });
  }

  if (plan.kind === "decompose-complete") {
    cycle.active = false;
    cycle.last_checked_at = nowIso;
    if (persistState) {
      writeJson(paths.cyclePath, cycle);
      appendProgress(paths.progressPath, `${nowIso} PAUSE decompose complete (auto_start_implement: false)`);
    }
    return {
      action: "pause",
      reason: plan.reason,
      payload: {
        followup_message:
          "Decompose phase complete for all modules.\n\nImplementation is paused (`auto_start_implement: false` in `cursor-impl-cycle/config/project.json`).\n\nTo start implement manually: set `cycle.json` → `\"phase\": \"implement\"`, `\"active\": true`, then end your turn.",
      },
    };
  }

  if (plan.kind === "complete") {
    cycle.phase = "complete";
    cycle.active = false;
    cycle.last_checked_at = nowIso;
    if (persistState) {
      writeJson(paths.cyclePath, cycle);
      appendProgress(paths.progressPath, `${nowIso} COMPLETE cycle`);
    }
    return { action: "complete", payload: {} };
  }

  if (plan.kind === "pause") {
    cycle.active = false;
    cycle.last_checked_at = nowIso;
    if (persistState) {
      writeJson(paths.cyclePath, cycle);
      appendProgress(paths.progressPath, `${nowIso} PAUSE ${plan.reason}`);
    }
    return {
      action: "pause",
      reason: plan.reason,
      payload: {
        followup_message:
          `cursor-impl-cycle paused: ${plan.reason}\n\nFix the blocker, then end your turn so the stop hook can retry.`,
      },
    };
  }

  cycle.iteration = Number(cycle.iteration ?? 0) + 1;
  const maxParallel =
    plan.phase === "implement"
      ? Number(project.parallel?.implement?.review_triage_max ?? 4)
      : Number(project.parallel?.decompose?.max ?? 4);

  const dispatches = plan.dispatches.map((d) => {
    const { brief, briefFile } = buildBriefFor({
      paths,
      project,
      role: d.role,
      phase: plan.phase,
      targetId: d.target_id,
      moduleId: d.moduleId ?? null,
      persist: persistState,
    });
    return {
      role: d.role,
      target_id: d.target_id,
      gate: d.gate,
      reason: d.reason,
      brief_path: relWs(paths.workspaceRoot, briefFile),
      template: relWs(paths.workspaceRoot, brief.template),
      outputs: brief.outputs,
      subagent_type: brief.subagent_type,
      model: brief.model ?? null,
      readonly: brief.readonly,
      ...(d.target_files?.length ? { target_files: d.target_files } : {}),
    };
  });

  const manifest = {
    wave: true,
    phase: plan.phase,
    max_parallel: maxParallel,
    generated_at: nowIso,
    dispatches,
  };
  if (persistState) writeJson(paths.briefPath, manifest);

  const message = buildWaveFollowup({ manifest, paths, project });
  cycle.last_checked_at = nowIso;
  if (persistState) {
    writeJson(paths.cyclePath, cycle);
    appendProgress(
      paths.progressPath,
      `${nowIso} WAVE ${plan.phase} x${dispatches.length}: ${dispatches.map((d) => `${d.role}:${d.target_id}`).join(", ")}`,
    );
  }
  return { action: "wave", payload: { followup_message: message }, phase: plan.phase, count: dispatches.length };
}

/** After phase advance (scope→decompose, etc.), use wave scheduler when parallel is on. */
async function continueAfterPhaseAdvance({ cycle, paths, project, persistState, nowIso, reason }) {
  if (
    project.parallel?.enabled === true &&
    (cycle.phase === "decompose" || cycle.phase === "implement")
  ) {
    return runSchedulerTick({ cycle, paths, project, persistState, nowIso });
  }
  const nextRole = cycle.phase === "implement" ? "implement" : "write";
  const { payload } = delegateFollowup({
    cycle,
    paths,
    project,
    role: nextRole,
    reason: reason ?? `Continue phase ${cycle.phase}.`,
  });
  cycle.last_checked_at = nowIso;
  if (persistState) writeJson(paths.cyclePath, cycle);
  return { action: "advance", payload, phase: cycle.phase };
}

export async function runStopHook(hookInput = {}, options = {}) {
  const workspaceRoot = options.workspaceRoot ?? resolveWorkspaceRoot(PACK_ROOT);
  const project = options.project ?? loadProjectConfig();
  const paths = options.paths ?? resolvePaths(workspaceRoot, project);
  const cycle = loadJson(paths.cyclePath);
  const dryRun = options.dryRun === true;
  const persistState = options.persistState === true || !dryRun;
  const nowIso = new Date().toISOString();

  if (hookInput.status !== undefined && hookInput.status !== "completed" && !dryRun) {
    return { action: "skip-status", payload: {} };
  }
  if (!cycle?.active && !dryRun) {
    return { action: "defer-inactive", payload: {} };
  }

  const maxTotal = Number(project.max_iterations_total ?? 100);
  const maxPerTarget =
    cycle.phase === "implement"
      ? Number(project.review?.max_iterations_per_item ?? 8)
      : Number(project.review?.max_iterations_per_target ?? 5);

  if (Number(cycle.iteration ?? 0) >= maxTotal) {
    cycle.active = false;
    if (persistState) writeJson(paths.cyclePath, cycle);
    return { action: "pause", reason: "max_iterations_total", payload: {} };
  }

  try {
    checkInventory(paths);
  } catch (err) {
    cycle.active = false;
    if (persistState) writeJson(paths.cyclePath, cycle);
    return { action: "pause", reason: err.message, payload: {} };
  }

  const phase = cycle.phase ?? "scope";
  const gateStage = cycle.gate_stage ?? "write";

  if (phase === "complete") {
    return { action: "complete", payload: {} };
  }

  if (project.parallel?.enabled === true && (phase === "decompose" || phase === "implement")) {
    return runSchedulerTick({ cycle, paths, project, persistState, nowIso });
  }

  if (gateStage === "triage") {
    const targetId =
      phase === "scope" ? "scope" : phase === "decompose" ? cycle.current_module_id : cycle.current_item_id;
    const triageFile = triagePath(paths, phase, targetId);
    const triage = loadJson(triageFile);

    if (!triage) {
      const { payload } = delegateFollowup({
        cycle,
        paths,
        project,
        role: "triage",
        reason: `Run triage for phase ${phase} target ${targetId} (review critiques).`,
      });
      cycle.last_checked_at = nowIso;
      if (persistState) writeJson(paths.cyclePath, cycle);
      return { action: "followup-triage", payload, phase, targetId };
    }

    const triageGate = evaluateTriageGate(triage);
    if (!triageGate.ok) {
      const targetIter = Number(cycle.target_iteration ?? 0) + 1;
      cycle.target_iteration = targetIter;
      cycle.iteration = Number(cycle.iteration ?? 0) + 1;
      if (targetIter >= maxPerTarget) {
        cycle.active = false;
        if (persistState) writeJson(paths.cyclePath, cycle);
        appendProgress(paths.progressPath, `${nowIso} PAUSE max iterations for ${phase}:${targetId} (triage)`);
        return { action: "pause", reason: "max_iterations_per_target", payload: {} };
      }
      cycle.gate_stage = "write";
      removeTriageFile(paths, phase, targetId);
      cycle.last_checked_at = nowIso;
      const fixNotes = (triage.decisions ?? [])
        .filter((d) => d.action_required || d.severity === "block" || d.severity === "fix")
        .map((d) => `${d.critique_id} (${d.severity}): ${d.rationale}`)
        .join("; ");
      const { payload } = delegateFollowup({
        cycle,
        paths,
        project,
        role: phase === "implement" ? "implement" : "write",
        reason: `Triage requires rewrite: ${fixNotes || triageGate.errors.join("; ")}`,
      });
      if (persistState) writeJson(paths.cyclePath, cycle);
      return { action: "followup-triage-fail", payload, phase, targetId };
    }

    cycle.iteration = Number(cycle.iteration ?? 0) + 1;
    cycle.target_iteration = 0;

    let advanceResult = "continue";
    if (phase === "scope") {
      advanceAfterScopeReview(cycle, paths);
    } else if (phase === "decompose") {
      advanceResult = advanceAfterDecomposeReview(cycle, paths, project);
    } else if (phase === "implement") {
      const revPath = reviewPath(paths, phase, targetId);
      advanceAfterImplementReview(cycle, loadJson(revPath), project);
    }

    cycle.last_checked_at = nowIso;
    appendProgress(paths.progressPath, `${nowIso} PASS triage ${phase}:${targetId}`);

    if (advanceResult === "decompose-complete") {
      if (persistState) writeJson(paths.cyclePath, cycle);
      appendProgress(paths.progressPath, `${nowIso} PAUSE decompose complete (auto_start_implement: false)`);
      return {
        action: "pause",
        reason: "decompose complete",
        payload: {
          followup_message:
            "Decompose phase complete for all modules.\n\nImplementation is paused (`auto_start_implement: false` in `cursor-impl-cycle/config/project.json`).\n\nTo start implement manually: set `cycle.json` → `\"phase\": \"implement\"`, `\"active\": true`, then end your turn.",
        },
      };
    }

    if (cycle.phase === "complete" || !cycle.active) {
      if (persistState) writeJson(paths.cyclePath, cycle);
      appendProgress(paths.progressPath, `${nowIso} COMPLETE cycle`);
      return { action: "complete", payload: {} };
    }

    if (persistState) writeJson(paths.cyclePath, cycle);
    return continueAfterPhaseAdvance({
      cycle,
      paths,
      project,
      persistState,
      nowIso,
      reason: `Triage passed. Continue phase ${cycle.phase}.`,
    });
  }

  if (gateStage === "review") {
    const targetId =
      phase === "scope" ? "scope" : phase === "decompose" ? cycle.current_module_id : cycle.current_item_id;
    const revPath = reviewPath(paths, phase, targetId);
    const review = loadJson(revPath);

    if (!review) {
      const { payload } = delegateFollowup({
        cycle,
        paths,
        project,
        role: "review",
        reason: `Run reviewer for phase ${phase} target ${targetId}.`,
      });
      cycle.last_checked_at = nowIso;
      if (persistState) writeJson(paths.cyclePath, cycle);
      return { action: "followup-review", payload, phase, targetId };
    }

    const reviewGate = evaluateReviewGate(review, phase, project);
    if (!reviewGate.ok) {
      const targetIter = Number(cycle.target_iteration ?? 0) + 1;
      cycle.target_iteration = targetIter;
      cycle.iteration = Number(cycle.iteration ?? 0) + 1;
      if (targetIter >= maxPerTarget) {
        cycle.active = false;
        if (persistState) writeJson(paths.cyclePath, cycle);
        appendProgress(paths.progressPath, `${nowIso} PAUSE max iterations for ${phase}:${targetId}`);
        return { action: "pause", reason: "max_iterations_per_target", payload: {} };
      }
      cycle.gate_stage = "write";
      cycle.last_checked_at = nowIso;
      const { payload } = delegateFollowup({
        cycle,
        paths,
        project,
        role: phase === "implement" ? "implement" : "write",
        reason: `Review failed: ${reviewGate.errors.join("; ")}`,
      });
      if (persistState) writeJson(paths.cyclePath, cycle);
      return { action: "followup-review-fail", payload, phase, targetId };
    }

    cycle.iteration = Number(cycle.iteration ?? 0) + 1;
    cycle.target_iteration = 0;

    if (critiqueTriageEnabled(project)) {
      cycle.gate_stage = "triage";
      cycle.last_checked_at = nowIso;
      appendProgress(paths.progressPath, `${nowIso} PASS review ${phase}:${targetId} → triage`);
      const { payload } = delegateFollowup({
        cycle,
        paths,
        project,
        role: "triage",
        reason: `Review passed. Run triage on critiques for ${phase} target ${targetId}.`,
      });
      if (persistState) writeJson(paths.cyclePath, cycle);
      return { action: "followup-triage-required", payload, phase, targetId };
    }

    let advanceResult = "continue";
    if (phase === "scope") {
      advanceAfterScopeReview(cycle, paths);
    } else if (phase === "decompose") {
      advanceResult = advanceAfterDecomposeReview(cycle, paths, project);
    } else if (phase === "implement") {
      advanceAfterImplementReview(cycle, review, project);
    }

    cycle.last_checked_at = nowIso;
    appendProgress(paths.progressPath, `${nowIso} PASS review ${phase}:${targetId}`);

    if (advanceResult === "decompose-complete") {
      if (persistState) writeJson(paths.cyclePath, cycle);
      appendProgress(paths.progressPath, `${nowIso} PAUSE decompose complete (auto_start_implement: false)`);
      return {
        action: "pause",
        reason: "decompose complete",
        payload: {
          followup_message:
            "Decompose phase complete for all modules.\n\nImplementation is paused (`auto_start_implement: false` in `cursor-impl-cycle/config/project.json`).\n\nTo start implement manually: set `cycle.json` → `\"phase\": \"implement\"`, `\"active\": true`, then end your turn.",
        },
      };
    }

    if (cycle.phase === "complete" || !cycle.active) {
      if (persistState) writeJson(paths.cyclePath, cycle);
      appendProgress(paths.progressPath, `${nowIso} COMPLETE cycle`);
      return { action: "complete", payload: {} };
    }

    if (persistState) writeJson(paths.cyclePath, cycle);
    return continueAfterPhaseAdvance({
      cycle,
      paths,
      project,
      persistState,
      nowIso,
      reason: `Review passed. Continue phase ${cycle.phase}.`,
    });
  }

  const scriptResult = await runScriptGate({ phase, paths, cycle, project });

  if (!scriptResult.ok) {
    const targetIter = Number(cycle.target_iteration ?? 0) + 1;
    cycle.target_iteration = targetIter;
    cycle.iteration = Number(cycle.iteration ?? 0) + 1;
    if (targetIter >= maxPerTarget) {
      cycle.active = false;
      if (persistState) writeJson(paths.cyclePath, cycle);
      return { action: "pause", reason: "script max iterations", payload: {} };
    }
    const writeRole = phase === "implement" ? "implement" : "write";
    const { payload } = delegateFollowup({
      cycle,
      paths,
      project,
      role: writeRole,
      reason: `Script gate failed: ${scriptResult.errors.join("; ")}`,
    });
    cycle.last_checked_at = nowIso;
    if (persistState) writeJson(paths.cyclePath, cycle);
    return { action: "followup-script-fail", payload, phase };
  }

  cycle.gate_stage = "review";
  const triageTargetId =
    phase === "scope" ? "scope" : phase === "decompose" ? cycle.current_module_id : cycle.current_item_id;
  removeTriageFile(paths, phase, triageTargetId);
  cycle.last_checked_at = nowIso;
  const { payload } = delegateFollowup({
    cycle,
    paths,
    project,
    role: "review",
    reason: `Script gate passed for ${phase}. Run reviewer.`,
  });
  if (persistState) writeJson(paths.cyclePath, cycle);
  appendProgress(paths.progressPath, `${nowIso} PASS script ${phase} → review`);
  return { action: "followup-review-required", payload, phase };
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  if (dryRun) {
    const workspaceRoot = resolveWorkspaceRoot(PACK_ROOT);
    const project = loadProjectConfig();
    const paths = resolvePaths(workspaceRoot, project);
    const cycle = loadJson(paths.cyclePath) ?? {
      active: true,
      phase: "scope",
      gate_stage: "write",
      current_module_id: null,
      current_item_id: null,
      modules: [],
      iteration: 0,
      target_iteration: 0,
    };
    cycle.active = true;
    runStopHook({}, { dryRun: true, workspaceRoot, project })
      .then((r) => {
        console.log(JSON.stringify(r, null, 2));
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
    return;
  }

  const raw = fs.readFileSync(0, "utf8");
  let hookInput = {};
  try {
    hookInput = parseCursorHookInput(raw);
  } catch (err) {
    process.stderr.write(`cursor-impl-cycle stop hook parse error: ${err.message}\n`);
    process.stdout.write("{}\n");
    process.exit(0);
  }

  runStopHook(hookInput)
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result.payload ?? {})}\n`);
    })
    .catch((err) => {
      process.stderr.write(`cursor-impl-cycle stop hook error: ${err.message}\n`);
      process.stdout.write("{}\n");
      process.exit(1);
    });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
