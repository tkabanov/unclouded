import fs from "node:fs";
import path from "node:path";
import { decomposePath, packRelPath, promptPath, reviewPath, triagePath } from "./paths.mjs";

const WRITE_TEMPLATES = {
  scope: "write-scope.md",
  decompose: "write-decompose.md",
  implement: "write-implement.md",
};

const REVIEW_TEMPLATES = {
  scope: "review-scope.md",
  decompose: "review-decompose.md",
  implement: "review-implement.md",
};

const TRIAGE_TEMPLATE = "triage-review.md";
const CRITIC_SNIPPET = "review-critic-mode.md";

function rel(root, abs) {
  return abs.startsWith(root) ? abs.slice(root.length + 1) : abs;
}

function critiqueTriageEnabled(project) {
  return project.review?.critique_triage_enabled !== false;
}

/** Inputs block is identical for every target; factor it out. */
function commonInputs(paths, project) {
  return {
    inventory_path: rel(paths.workspaceRoot, paths.inventoryPath),
    styles_slice_path: rel(paths.workspaceRoot, paths.stylesSlicePath),
    bubble_source_path: rel(paths.workspaceRoot, paths.bubbleSourcePath),
    ui_fidelity_rubric_path: rel(paths.workspaceRoot, paths.uiFidelityRubricPath),
    module_map_path: rel(paths.workspaceRoot, paths.moduleMapPath),
    cycle_path: rel(paths.workspaceRoot, paths.cyclePath),
    frontend_app_dir: project.frontend_app_dir ?? "provider-app",
    adapter_dir: project.adapter_dir ?? "provider-adapter",
    supabase_context_dir: project.supabase_context_dir ?? "project/supabase",
    implementation_policy_path: rel(paths.workspaceRoot, paths.implementationPolicyPath),
    provider_scope_seed_path: rel(paths.workspaceRoot, paths.providerScopeSeedPath),
    scope_focus: "provider",
    forbidden_write_paths: ["project/"],
    allowed_write_paths: [
      "provider-app/",
      "provider-adapter/",
      `${packRelPath(paths.packRoot, paths.workspaceRoot)}/`,
    ],
    coverage_threshold_pct: project.coverage_threshold_pct,
  };
}

function templateNameFor(role, phase) {
  if (role === "triage") return TRIAGE_TEMPLATE;
  if (role === "review") return REVIEW_TEMPLATES[phase];
  return WRITE_TEMPLATES[phase];
}

function outputsFor(paths, role, phase, targetId) {
  if (role === "triage") return [rel(paths.workspaceRoot, triagePath(paths, phase, targetId))];
  if (role === "review") return [rel(paths.workspaceRoot, reviewPath(paths, phase, targetId))];
  if (phase === "scope") {
    return [
      rel(paths.workspaceRoot, paths.moduleMapPath),
      rel(paths.workspaceRoot, paths.moduleMapMdPath),
    ];
  }
  if (phase === "decompose") return [rel(paths.workspaceRoot, decomposePath(paths, targetId))];
  if (phase === "implement") return [rel(paths.workspaceRoot, `${paths.coverageDir}/${targetId}.json`)];
  return [];
}

function subagentTypeFor(project, role, phase) {
  if (role === "triage") return project.subagents?.triage?.subagent_type ?? "generalPurpose";
  if (role === "review") return project.subagents?.review?.subagent_type ?? "generalPurpose";
  if (phase === "implement") return project.subagents?.implement?.subagent_type ?? "generalPurpose";
  return project.subagents?.write?.subagent_type ?? "generalPurpose";
}

const MODEL_ALIASES = {
  auto: null,
  composer: "composer-2.5-fast",
};

function subagentConfigKey(role, phase) {
  if (role === "triage") return "triage";
  if (role === "review") return "review";
  if (phase === "implement") return "implement";
  return "write";
}

/** Resolved Task model slug, or null for auto (omit Task `model` param). */
export function resolveSubagentModel(raw) {
  if (raw == null || raw === "" || raw === "auto") return null;
  return MODEL_ALIASES[raw] ?? raw;
}

export function subagentModelFor(project, role, phase) {
  const key = subagentConfigKey(role, phase);
  return resolveSubagentModel(project.subagents?.[key]?.model);
}

function formatModelInstruction(model) {
  if (!model) return "model: auto (omit Task `model` — router default)";
  return `model: \`${model}\` (set Task \`model\` parameter)`;
}

export function buildBrief({ cycle, paths, project, role }) {
  const phase = cycle.phase;
  const targetId =
    phase === "scope"
      ? "scope"
      : phase === "decompose"
        ? cycle.current_module_id
        : cycle.current_item_id;

  const brief = {
    role,
    phase,
    target_id: targetId,
    current_module_id: cycle.current_module_id,
    current_item_id: cycle.current_item_id,
    template: promptPath(paths, templateNameFor(role, phase)),
    inputs: commonInputs(paths, project),
    outputs: outputsFor(paths, role, phase, targetId),
    subagent_type: subagentTypeFor(project, role, phase),
    model: subagentModelFor(project, role, phase),
    readonly: role === "review" || role === "triage",
  };

  fs.mkdirSync(paths.stateDir, { recursive: true });
  fs.writeFileSync(paths.briefPath, `${JSON.stringify(brief, null, 2)}\n`, "utf8");
  return { brief, briefPath: paths.briefPath, templatePath: brief.template };
}

/**
 * Build a brief for an explicit target (no dependency on cycle pointers).
 * Used by the wave scheduler. Writes to state/briefs/<phase>-<role>-<id>.json.
 */
export function buildBriefFor({ paths, project, role, phase, targetId, moduleId = null, itemId = null, persist = true }) {
  const brief = {
    role,
    phase,
    target_id: targetId,
    current_module_id: phase === "implement" ? moduleId : phase === "decompose" ? targetId : null,
    current_item_id: phase === "implement" ? (itemId ?? targetId) : null,
    template: promptPath(paths, templateNameFor(role, phase)),
    inputs: commonInputs(paths, project),
    outputs: outputsFor(paths, role, phase, targetId),
    subagent_type: subagentTypeFor(project, role, phase),
    model: subagentModelFor(project, role, phase),
    readonly: role === "review" || role === "triage",
  };

  const briefsDir = path.join(paths.stateDir, "briefs");
  const briefFile = path.join(briefsDir, `${phase}-${role}-${targetId}.json`);
  if (persist) {
    fs.mkdirSync(briefsDir, { recursive: true });
    fs.writeFileSync(briefFile, `${JSON.stringify(brief, null, 2)}\n`, "utf8");
  }
  return { brief, briefFile };
}

/**
 * Compact instruction message for a parallel wave. Lists each dispatch with its
 * brief path + template; the orchestrator reads each brief and launches one
 * Task subagent per entry, all in a single message, then waits for all.
 */
export function buildWaveFollowup({ manifest, paths, project }) {
  const { phase, max_parallel: maxParallel, dispatches } = manifest;
  const writeStrategy = project.parallel?.implement?.write_strategy ?? "serial";
  const lines = [];

  lines.push(`# Parallel wave — phase \`${phase}\` (${dispatches.length} task(s), max ${maxParallel})`);
  lines.push("");
  lines.push(
    "**Launch all tasks below in a SINGLE message as parallel Task subagents, wait for ALL to finish, then end your turn.**",
  );
  lines.push("");

  const writers = dispatches.filter((d) => d.role === "write" || d.role === "implement");
  if (phase === "implement" && writers.length >= 2) {
    if (writeStrategy === "worktree") {
      lines.push("## Worktree isolation (write_strategy=worktree)");
      lines.push(
        "For each writer task: create a git worktree + branch `impl/<target_id>` off the integration branch, " +
          "run the subagent there. After all writers finish, merge each branch into the integration branch " +
          "sequentially; on conflict, launch a fix subagent scoped to that item. Then remove the worktrees and " +
          "end your turn. Reviewers/triagers are read-only and run against the integration branch.",
      );
      lines.push("");
    } else if (writeStrategy === "disjoint-files") {
      lines.push("## Disjoint-file writes (write_strategy=disjoint-files)");
      lines.push(
        "Writer tasks below were selected so their `target_files` do NOT overlap — they are safe to run in " +
          "parallel in the same working tree. No worktree/merge needed. Do not let a subagent edit files " +
          "outside its declared `target_files`.",
      );
      lines.push("");
    }
  }

  lines.push("## Tasks");
  for (const [i, d] of dispatches.entries()) {
    lines.push(
      `${i + 1}. **${d.role}** target=\`${d.target_id}\` subagent=\`${d.subagent_type}\`${d.readonly ? " readonly=true" : ""}`,
    );
    lines.push(`   - ${formatModelInstruction(d.model ?? null)}`);
    lines.push(`   - brief: \`${d.brief_path}\``);
    lines.push(`   - template: \`${d.template}\``);
    lines.push(`   - outputs: ${d.outputs.map((o) => `\`${o}\``).join(", ")}`);
    if (d.target_files?.length) lines.push(`   - target_files: ${d.target_files.map((f) => `\`${f}\``).join(", ")}`);
    if (d.reason) lines.push(`   - reason: ${d.reason}`);
  }

  lines.push("");
  lines.push(
    "Each subagent must read its brief JSON + the referenced template, and read " +
      `\`${packRelPath(paths.packRoot, paths.workspaceRoot)}/prompts/implementation-constraints.md\` first` +
      (phase === "decompose" || phase === "implement"
        ? " (+ `prompts/ui-fidelity-rubric.md` for write/implement/review/triage)"
        : "") +
      ". Do NOT write review/triage JSON inline — only via the delegated subagent.",
  );

  return lines.join("\n");
}

function appendCriticSnippet(paths, template) {
  const snippetPath = promptPath(paths, CRITIC_SNIPPET);
  if (!fs.existsSync(snippetPath)) return template;
  return `${template.trim()}\n\n${fs.readFileSync(snippetPath, "utf8")}`;
}

export function buildFollowupMessage({ brief, templatePath, reason, role, paths }) {
  const readonlyFlag = brief.readonly ? "readonly: true" : "";
  const modelFlag = brief.model ? `model: ${brief.model}` : "";
  const taskFlags = [brief.subagent_type, readonlyFlag, modelFlag].filter(Boolean).join(", ");
  let mandate;
  if (role === "review") {
    mandate =
      `**Required:** Delegate to Task subagent (${taskFlags || "generalPurpose, readonly: true"}). Do NOT write review JSON inline.\n\n`;
  } else if (role === "triage") {
    mandate =
      `**Required:** Delegate to Task subagent (${taskFlags || "generalPurpose, readonly: true"}). Do NOT write triage JSON inline.\n\n`;
  } else {
    mandate = `**Required:** Delegate to Task subagent (${taskFlags}).\n\n`;
  }

  let template = "";
  if (fs.existsSync(templatePath)) {
    template = fs.readFileSync(templatePath, "utf8");
  }
  if (role === "review" && paths) {
    template = appendCriticSnippet(paths, template);
  }

  const constraintsPath = path.join(paths?.promptsDir ?? "", "implementation-constraints.md");
  const uiRubricPath = path.join(paths?.promptsDir ?? "", "ui-fidelity-rubric.md");
  let constraints = "";
  if (paths && fs.existsSync(constraintsPath) && (role === "write" || role === "implement" || role === "review" || role === "triage")) {
    constraints = `\n\n---\n\n${fs.readFileSync(constraintsPath, "utf8")}`;
  }
  if (
    paths &&
    fs.existsSync(uiRubricPath) &&
    (role === "write" || role === "implement" || role === "review" || role === "triage") &&
    (brief.phase === "decompose" || brief.phase === "implement")
  ) {
    constraints += `\n\n---\n\n${fs.readFileSync(uiRubricPath, "utf8")}`;
  }

  const body = template
    .replaceAll("{{phase}}", brief.phase)
    .replaceAll("{{target_id}}", brief.target_id ?? "")
    .replaceAll("{{brief_path}}", paths ? pathsRel(paths) : "")
    .replaceAll("{{outputs}}", brief.outputs.join(", "));

  return `${reason ? `${reason}\n\n` : ""}${mandate}${body}${constraints}`;
}

function pathsRel(paths) {
  return `${packRelPath(paths.packRoot, paths.workspaceRoot)}/state/last-brief.json`;
}

export { critiqueTriageEnabled };
