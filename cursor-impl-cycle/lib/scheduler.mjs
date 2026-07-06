import fs from "node:fs";
import { critiqueTriageEnabled } from "./brief.mjs";
import { evaluateReviewGate, evaluateTriageGate, runScriptGate } from "./gates.mjs";
import { decomposeOrderingBlocked, rebuildItemRegistry } from "./item-registry.mjs";
import { coveragePath, decomposePath, reviewPath, triagePath } from "./paths.mjs";

const DECOMPOSE = "decompose";
const IMPLEMENT = "implement";

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function safeUnlink(filePath) {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

/** Increment a per-target iteration counter; return true when the cap is reached. */
function bumpAndCheck(target, field, max) {
  target[field] = Number(target[field] ?? 0) + 1;
  return target[field] >= max;
}

function roleForState(state, phase) {
  if (state === "needs-review") return "review";
  if (state === "needs-triage") return "triage";
  return phase === IMPLEMENT ? "implement" : "write";
}

/** Read item -> { depends_on, target_files } map from a module's decompose output. */
function loadItemMeta(paths, moduleId) {
  const data = loadJson(decomposePath(paths, moduleId));
  const map = {};
  for (const item of data?.items ?? []) {
    map[item.id] = {
      depends_on: Array.isArray(item.depends_on) ? item.depends_on : [],
      target_files: Array.isArray(item.target_files) ? item.target_files : [],
    };
  }
  return map;
}

export function loadItemsWithDeps(paths, moduleId) {
  const data = loadJson(decomposePath(paths, moduleId));
  return (data?.items ?? []).map((item) => ({
    id: item.id,
    implement_passes: false,
    implement_gate: "write",
    implement_iteration: 0,
    coverage_pct: 0,
    depends_on: Array.isArray(item.depends_on) ? item.depends_on : [],
    target_files: Array.isArray(item.target_files) ? item.target_files : [],
  }));
}

/**
 * Migrate a single-pointer cycle to per-target gate state and enrich items with
 * depends_on from decompose outputs. Idempotent and safe on already-migrated state.
 */
export function ensureParallelState(cycle, paths) {
  for (const mod of cycle.modules ?? []) {
    if (mod.decompose_gate === undefined) {
      mod.decompose_gate = mod.id === cycle.current_module_id ? (cycle.gate_stage ?? "write") : "write";
    }
    if (mod.decompose_iteration === undefined) mod.decompose_iteration = 0;

    const items = mod.items ?? [];
    const needsMeta = items.some((i) => i.depends_on === undefined || i.target_files === undefined);
    const metaMap = needsMeta ? loadItemMeta(paths, mod.id) : null;
    for (const item of items) {
      if (item.implement_gate === undefined) {
        item.implement_gate = item.id === cycle.current_item_id ? (cycle.gate_stage ?? "write") : "write";
      }
      if (item.implement_iteration === undefined) item.implement_iteration = 0;
      if (item.depends_on === undefined) item.depends_on = metaMap?.[item.id]?.depends_on ?? [];
      if (item.target_files === undefined) item.target_files = metaMap?.[item.id]?.target_files ?? [];
    }
  }
}

/**
 * Advance one module's decompose gate as far as existing artifacts allow.
 * Returns a terminal state describing what (if anything) must be dispatched.
 */
async function evaluateDecompose(module, paths, project) {
  const maxPer = Number(project.review?.max_iterations_per_target ?? 5);
  for (let guard = 0; guard < 8; guard++) {
    const gate = module.decompose_gate ?? "write";

    if (gate === "write") {
      if (!fs.existsSync(decomposePath(paths, module.id))) return { state: "needs-write" };
      const res = await runScriptGate({ phase: DECOMPOSE, paths, project, targetId: module.id });
      if (!res.ok) {
        if (bumpAndCheck(module, "decompose_iteration", maxPer)) {
          return { state: "paused", reason: `script gate: ${res.errors.join("; ")}` };
        }
        return { state: "needs-write", reason: `script gate failed: ${res.errors.join("; ")}` };
      }
      module.decompose_gate = "review";
      continue;
    }

    if (gate === "review") {
      const rp = reviewPath(paths, DECOMPOSE, module.id);
      if (!fs.existsSync(rp)) return { state: "needs-review" };
      const rg = evaluateReviewGate(loadJson(rp), DECOMPOSE, project);
      if (!rg.ok) {
        if (bumpAndCheck(module, "decompose_iteration", maxPer)) {
          return { state: "paused", reason: `review: ${rg.errors.join("; ")}` };
        }
        module.decompose_gate = "write";
        safeUnlink(rp);
        return { state: "needs-write", reason: `review failed: ${rg.errors.join("; ")}` };
      }
      if (critiqueTriageEnabled(project)) {
        module.decompose_gate = "triage";
        continue;
      }
      return { state: "passed" };
    }

    if (gate === "triage") {
      const tp = triagePath(paths, DECOMPOSE, module.id);
      if (!fs.existsSync(tp)) return { state: "needs-triage" };
      const tg = evaluateTriageGate(loadJson(tp));
      if (!tg.ok) {
        if (bumpAndCheck(module, "decompose_iteration", maxPer)) {
          return { state: "paused", reason: `triage: ${tg.errors.join("; ")}` };
        }
        module.decompose_gate = "write";
        safeUnlink(tp);
        safeUnlink(reviewPath(paths, DECOMPOSE, module.id));
        return { state: "needs-write", reason: `triage failed: ${tg.errors.join("; ")}` };
      }
      return { state: "passed" };
    }

    return { state: "paused", reason: `unknown gate: ${gate}` };
  }
  return { state: "paused", reason: "evaluate loop overflow" };
}

/** Advance one item's implement gate as far as existing artifacts allow. */
async function evaluateImplement(item, module, paths, project) {
  const maxPer = Number(project.review?.max_iterations_per_item ?? 8);
  const threshold = Number(project.coverage_threshold_pct ?? 90);

  for (let guard = 0; guard < 8; guard++) {
    const gate = item.implement_gate ?? "write";

    if (gate === "write") {
      if (!fs.existsSync(coveragePath(paths, item.id))) return { state: "needs-write" };
      const res = await runScriptGate({ phase: IMPLEMENT, paths, project, targetId: item.id });
      if (!res.ok) {
        if (bumpAndCheck(item, "implement_iteration", maxPer)) {
          return { state: "paused", reason: `script gate: ${res.errors.join("; ")}` };
        }
        return { state: "needs-write", reason: `script gate failed: ${res.errors.join("; ")}` };
      }
      item.implement_gate = "review";
      continue;
    }

    if (gate === "review") {
      const rp = reviewPath(paths, IMPLEMENT, item.id);
      if (!fs.existsSync(rp)) return { state: "needs-review" };
      const review = loadJson(rp);
      const rg = evaluateReviewGate(review, IMPLEMENT, project);
      if (!rg.ok) {
        if (bumpAndCheck(item, "implement_iteration", maxPer)) {
          return { state: "paused", reason: `review: ${rg.errors.join("; ")}` };
        }
        item.implement_gate = "write";
        safeUnlink(rp);
        return { state: "needs-write", reason: `review failed: ${rg.errors.join("; ")}` };
      }
      item.coverage_pct = Number(review?.coverage_pct ?? 0);
      if (item.coverage_pct < threshold) {
        if (bumpAndCheck(item, "implement_iteration", maxPer)) {
          return { state: "paused", reason: `coverage ${item.coverage_pct} < ${threshold}` };
        }
        item.implement_gate = "write";
        safeUnlink(rp);
        return { state: "needs-write", reason: `coverage ${item.coverage_pct} < ${threshold}` };
      }
      if (critiqueTriageEnabled(project)) {
        item.implement_gate = "triage";
        continue;
      }
      return { state: "passed" };
    }

    if (gate === "triage") {
      const tp = triagePath(paths, IMPLEMENT, item.id);
      if (!fs.existsSync(tp)) return { state: "needs-triage" };
      const tg = evaluateTriageGate(loadJson(tp));
      if (!tg.ok) {
        if (bumpAndCheck(item, "implement_iteration", maxPer)) {
          return { state: "paused", reason: `triage: ${tg.errors.join("; ")}` };
        }
        item.implement_gate = "write";
        safeUnlink(tp);
        safeUnlink(reviewPath(paths, IMPLEMENT, item.id));
        return { state: "needs-write", reason: `triage failed: ${tg.errors.join("; ")}` };
      }
      return { state: "passed" };
    }

    return { state: "paused", reason: `unknown gate: ${gate}` };
  }
  return { state: "paused", reason: "evaluate loop overflow" };
}

function collectItems(cycle) {
  const out = [];
  for (const mod of cycle.modules ?? []) {
    for (const item of mod.items ?? []) out.push({ module: mod, item });
  }
  return out;
}

function moduleImplementComplete(cycle, moduleId) {
  const mod = cycle.modules?.find((m) => m.id === moduleId);
  const items = mod?.items ?? [];
  return items.length > 0 && items.every((i) => i.implement_passes);
}

function implementDepSatisfied(dep, passedIds, cycle) {
  if (passedIds.has(dep)) return true;
  if (dep.startsWith("MOD-")) return moduleImplementComplete(cycle, dep);
  return false;
}

function loadModuleMap(paths) {
  if (!fs.existsSync(paths.moduleMapPath)) return { modules: [] };
  try {
    return JSON.parse(fs.readFileSync(paths.moduleMapPath, "utf8"));
  } catch {
    return { modules: [] };
  }
}

/**
 * Greedily select writers whose target_files do not overlap, up to `max`.
 * A writer with no declared target_files has an unknown footprint and is only
 * safe to run alone, so it is picked only when it is the first selection.
 */
function selectDisjointWriters(writers, max) {
  const used = new Set();
  const picked = [];
  for (const d of writers) {
    const files = d.target_files ?? [];
    if (files.length === 0) {
      if (picked.length === 0) picked.push(d);
      break;
    }
    if (files.some((f) => used.has(f))) continue;
    for (const f of files) used.add(f);
    picked.push(d);
    if (picked.length >= max) break;
  }
  return picked;
}

/** Cap implement dispatches: writers limited by write_strategy, read-only by review_triage_max. */
function capImplementDispatches(dispatches, project) {
  const cfg = project.parallel?.implement ?? {};
  const strategy = cfg.write_strategy ?? "serial";
  const max = Number(cfg.max ?? cfg.review_triage_max ?? 4);
  const rtMax = Number(cfg.review_triage_max ?? 4);

  const writers = [];
  const readers = [];
  for (const d of dispatches) {
    if (d.role === "implement") writers.push(d);
    else readers.push(d);
  }

  let pickedWriters;
  if (strategy === "serial") {
    pickedWriters = writers.slice(0, 1);
  } else if (strategy === "disjoint-files") {
    pickedWriters = selectDisjointWriters(writers, max);
  } else {
    // "worktree": each writer is isolated in its own git worktree.
    pickedWriters = writers.slice(0, max);
  }

  return [...pickedWriters, ...readers.slice(0, rtMax)];
}

/**
 * Compute the next wave for the current phase.
 * Mutates per-target gate state for any target whose artifacts already advanced.
 * Returns one of:
 *   { kind: "wave", phase, dispatches, paused }
 *   { kind: "advance-phase", next }
 *   { kind: "complete" }
 *   { kind: "pause", reason }
 */
export async function planWave({ cycle, paths, project }) {
  ensureParallelState(cycle, paths);
  const phase = cycle.phase;

  if (phase === DECOMPOSE) {
    const moduleMap = loadModuleMap(paths);
    const pending = (cycle.modules ?? []).filter((m) => !m.decompose_passes);
    const dispatches = [];
    const paused = [];
    let orderingBlocked = 0;
    for (const mod of pending) {
      const blockedBy = decomposeOrderingBlocked(mod.id, moduleMap, cycle);
      if (blockedBy) {
        orderingBlocked += 1;
        continue;
      }
      const r = await evaluateDecompose(mod, paths, project);
      if (r.state === "passed") {
        mod.decompose_passes = true;
        mod.items = loadItemsWithDeps(paths, mod.id);
        rebuildItemRegistry(paths, cycle);
      } else if (r.state === "paused") {
        paused.push({ id: mod.id, reason: r.reason });
      } else {
        dispatches.push({
          target_id: mod.id,
          role: roleForState(r.state, phase),
          reason: r.reason ?? null,
          gate: mod.decompose_gate,
        });
      }
    }

    if ((cycle.modules ?? []).every((m) => m.decompose_passes)) {
      if (project.auto_start_implement === false) {
        return {
          kind: "decompose-complete",
          reason:
            "All modules decomposed. Implementation paused (auto_start_implement: false). Set phase to implement and active to true to continue.",
        };
      }
      return { kind: "advance-phase", next: IMPLEMENT };
    }
    if (dispatches.length === 0) {
      return {
        kind: "pause",
        reason: `decompose stalled: ${paused.map((p) => `${p.id} (${p.reason})`).join(" | ") || "no ready targets"}${orderingBlocked ? `; ordering_blocked=${orderingBlocked}` : ""}`,
      };
    }
    const max = Number(project.parallel?.decompose?.max ?? 4);
    return { kind: "wave", phase, dispatches: dispatches.slice(0, max), paused };
  }

  if (phase === IMPLEMENT) {
    const items = collectItems(cycle);
    if (items.length > 0 && items.every((x) => x.item.implement_passes)) {
      return { kind: "complete" };
    }

    const passedIds = new Set(items.filter((x) => x.item.implement_passes).map((x) => x.item.id));
    const dispatches = [];
    const paused = [];
    let blocked = 0;

    for (const { module, item } of items) {
      if (item.implement_passes) continue;
      const deps = item.depends_on ?? [];
      if (!deps.every((d) => implementDepSatisfied(d, passedIds, cycle))) {
        blocked += 1;
        continue;
      }
      const r = await evaluateImplement(item, module, paths, project);
      if (r.state === "passed") {
        item.implement_passes = true;
        passedIds.add(item.id);
      } else if (r.state === "paused") {
        paused.push({ id: item.id, reason: r.reason });
      } else {
        dispatches.push({
          target_id: item.id,
          role: roleForState(r.state, phase),
          reason: r.reason ?? null,
          gate: item.implement_gate,
          moduleId: module.id,
          target_files: item.target_files ?? [],
        });
      }
    }

    if (items.every((x) => x.item.implement_passes)) return { kind: "complete" };
    if (dispatches.length === 0) {
      return {
        kind: "pause",
        reason: `implement stalled (no ready dispatch; blocked=${blocked}); paused: ${paused.map((p) => p.id).join(", ") || "none"}`,
      };
    }
    return { kind: "wave", phase, dispatches: capImplementDispatches(dispatches, project), paused };
  }

  return { kind: "pause", reason: `scheduler does not handle phase: ${phase}` };
}
