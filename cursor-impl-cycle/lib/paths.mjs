import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { packRelPath, resolveWorkspaceRoot } from "./workspace.mjs";

export const PACK_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export { resolveWorkspaceRoot, packRelPath };

export function loadProjectConfig(packRoot = PACK_ROOT) {
  const configPath = path.join(packRoot, "config", "project.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing ${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function packDefault(workspaceRoot, packRoot, subpath) {
  return path.join(workspaceRoot, packRelPath(packRoot, workspaceRoot), subpath);
}

export function resolvePaths(workspaceRoot, project, packRoot = PACK_ROOT) {
  const stateDir = path.join(packRoot, "state");
  const outputDir = path.join(packRoot, "output");
  return {
    workspaceRoot,
    packRoot,
    project,
    stateDir,
    outputDir,
    cyclePath: path.join(stateDir, "cycle.json"),
    itemRegistryPath: path.join(stateDir, "item-registry.json"),
    moduleMapPath: path.join(stateDir, "module-map.json"),
    briefPath: path.join(stateDir, "last-brief.json"),
    progressPath: path.join(stateDir, "progress.txt"),
    reportsDir: path.join(outputDir, "reports"),
    decomposeDir: path.join(outputDir, "decompose"),
    coverageDir: path.join(outputDir, "coverage"),
    moduleMapMdPath: path.join(outputDir, "MODULE-MAP.md"),
    inventoryPath: path.join(workspaceRoot, project.ir_dir ?? "ir", "inventory.json"),
    stylesSlicePath: path.join(
      workspaceRoot,
      project.styles_slice ?? "ir/slices/styles.json",
    ),
    bubbleSourcePath: path.join(
      workspaceRoot,
      project.bubble_source ?? "source/app.bubble",
    ),
    uiFidelityRubricPath: project.ui_fidelity_rubric_path
      ? path.join(workspaceRoot, project.ui_fidelity_rubric_path)
      : packDefault(workspaceRoot, packRoot, "prompts/ui-fidelity-rubric.md"),
    implementationPolicyPath: project.implementation_policy_path
      ? path.join(workspaceRoot, project.implementation_policy_path)
      : packDefault(workspaceRoot, packRoot, "config/implementation-policy.json"),
    scopeSeedPath: project.scope_seed_path
      ? path.join(workspaceRoot, project.scope_seed_path)
      : packDefault(workspaceRoot, packRoot, "config/drsam-scope-seed.json"),
    frontendAppDir: path.join(workspaceRoot, project.frontend_app_dir ?? "frontend"),
    adapterDir: path.join(workspaceRoot, project.adapter_dir ?? "adapter"),
    supabaseContextDir: path.join(
      workspaceRoot,
      project.supabase_context_dir ?? "project/supabase",
    ),
    promptsDir: path.join(packRoot, "prompts"),
    schemasDir: path.join(packRoot, "schemas"),
  };
}

export function decomposePath(paths, moduleId) {
  return path.join(paths.decomposeDir, `${moduleId}.json`);
}

export function coveragePath(paths, itemId) {
  return path.join(paths.coverageDir, `${itemId}.json`);
}

export function reviewPath(paths, phase, targetId) {
  const safe = targetId ?? "scope";
  return path.join(paths.reportsDir, `${phase}-${safe}.review.json`);
}

export function triagePath(paths, phase, targetId) {
  const safe = targetId ?? "scope";
  return path.join(paths.reportsDir, `${phase}-${safe}.triage.json`);
}

export function promptPath(paths, name) {
  return path.join(paths.promptsDir, name);
}
