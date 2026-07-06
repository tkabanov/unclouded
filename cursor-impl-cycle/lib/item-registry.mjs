import fs from "node:fs";
import { decomposePath } from "./paths.mjs";

const MODULE_ID_RE = /^MOD-[A-Z0-9-]+$/;

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Build item id registry from decompose artifacts on disk.
 * @param {object} paths
 * @param {{ onlyModuleIds?: string[] }} [opts]
 */
export function buildItemRegistry(paths, opts = {}) {
  const only = opts.onlyModuleIds ? new Set(opts.onlyModuleIds) : null;
  const modules = {};
  const items = {};

  let files = [];
  if (fs.existsSync(paths.decomposeDir)) {
    files = fs
      .readdirSync(paths.decomposeDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => pathJoin(paths.decomposeDir, f));
  }

  for (const filePath of files) {
    const data = loadJson(filePath);
    if (!data?.module_id || data.decomposed !== true) continue;
    if (only && !only.has(data.module_id)) continue;

    const itemIds = (data.items ?? []).map((it) => it.id).filter(Boolean);
    modules[data.module_id] = {
      decomposed: true,
      item_ids: itemIds,
    };
    for (const id of itemIds) {
      items[id] = data.module_id;
    }
  }

  return {
    generated_at: new Date().toISOString(),
    modules,
    items,
  };
}

function pathJoin(a, b) {
  return `${a.replace(/\/$/, "")}/${b}`;
}

export function writeItemRegistry(paths, registry) {
  fs.mkdirSync(paths.stateDir, { recursive: true });
  fs.writeFileSync(paths.itemRegistryPath, `${JSON.stringify(registry, null, 2)}\n`);
}

export function loadItemRegistry(paths) {
  return loadJson(paths.itemRegistryPath) ?? { modules: {}, items: {} };
}

export function rebuildItemRegistry(paths, cycle = null) {
  const onlyModuleIds =
    cycle?.modules?.filter((m) => m.decompose_passes).map((m) => m.id) ?? undefined;
  const registry = buildItemRegistry(paths, {
    onlyModuleIds: onlyModuleIds?.length ? onlyModuleIds : undefined,
  });
  // When cycle is incomplete, still index every decompose file on disk for validation.
  if (onlyModuleIds?.length) {
    const full = buildItemRegistry(paths);
    for (const [modId, meta] of Object.entries(full.modules)) {
      if (!registry.modules[modId]) registry.modules[modId] = meta;
    }
    for (const [itemId, modId] of Object.entries(full.items)) {
      if (!registry.items[itemId]) registry.items[itemId] = modId;
    }
  }
  writeItemRegistry(paths, registry);
  return registry;
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function suggestItemDep(dep, registry) {
  const candidates = Object.keys(registry.items ?? {});
  if (candidates.length === 0) return "";
  const ranked = candidates
    .map((id) => ({ id, dist: levenshtein(dep, id) }))
    .sort((a, b) => a.dist - b.dist);
  const best = ranked[0];
  if (best && best.dist <= 12) return ` (did you mean ${best.id}?)`;
  return "";
}

/**
 * Validate depends_on refs for a decompose artifact.
 * @param {object} decomposeData
 * @param {object} registry — from buildItemRegistry / loadItemRegistry
 * @param {string[]} moduleIds — valid MOD-* ids from module-map
 */
export function validateDependsOn(decomposeData, registry, moduleIds) {
  const errors = [];
  const moduleIdSet = new Set(moduleIds);
  const localIds = new Set((decomposeData.items ?? []).map((it) => it.id));
  const currentModuleId = decomposeData.module_id;

  for (const item of decomposeData.items ?? []) {
    for (const dep of item.depends_on ?? []) {
      if (localIds.has(dep)) continue;

      if (MODULE_ID_RE.test(dep)) {
        if (!moduleIdSet.has(dep)) {
          errors.push(`${item.id}: unknown module depends_on ${dep}`);
        }
        continue;
      }

      if (registry.items?.[dep]) continue;

      const hint = suggestItemDep(dep, registry);
      errors.push(`${item.id}: unknown depends_on ${dep}${hint}`);
    }
  }

  return errors;
}

/** Module ids from module-map that must finish decompose before this module writes. */
export function decomposeOrderingBlocked(moduleId, moduleMap, cycle) {
  const entry = (moduleMap.modules ?? []).find((m) => m.id === moduleId);
  const deps = entry?.decompose_depends_on ?? [];
  if (deps.length === 0) return null;

  const pending = deps.filter(
    (depId) => !cycle.modules?.find((m) => m.id === depId)?.decompose_passes,
  );
  if (pending.length === 0) return null;
  return pending;
}
