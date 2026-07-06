import fs from "node:fs";
import { validateArtifactFile } from "../scripts/validate.mjs";
import { buildItemRegistry, validateDependsOn } from "./item-registry.mjs";
import { coveragePath, decomposePath } from "./paths.mjs";

/** @param {unknown} blocker */
export function formatBlockerEntry(blocker) {
  if (typeof blocker === "string") return blocker;
  if (blocker && typeof blocker === "object") {
    const { id, item, area, finding, message, text } = blocker;
    const parts = [];
    if (id) parts.push(id);
    if (item) parts.push(item);
    if (area) parts.push(`area=${area}`);
    const detail = finding ?? message ?? text;
    if (detail) parts.push(detail);
    if (parts.length > 0) return parts.join(": ");
    return JSON.stringify(blocker);
  }
  return String(blocker);
}

export async function runScriptGate({ phase, paths, cycle, project, targetId }) {
  const errors = [];

  if (phase === "scope") {
    const result = await validateArtifactFile("module-map", paths.moduleMapPath);
    if (!result.ok) errors.push(...result.errors);
    else {
      const data = JSON.parse(fs.readFileSync(paths.moduleMapPath, "utf8"));
      if (!data.modules?.length) errors.push("module-map: modules array empty");
    }
    return { ok: errors.length === 0, errors, metrics: {} };
  }

  if (phase === "decompose") {
    const moduleId = targetId ?? cycle?.current_module_id;
    if (!moduleId) return { ok: false, errors: ["no current_module_id"], metrics: {} };
    const filePath = decomposePath(paths, moduleId);
    const result = await validateArtifactFile("decompose", filePath);
    if (!result.ok) errors.push(...result.errors);
    else {
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (data.module_id !== moduleId) {
        errors.push(`decompose module_id mismatch: ${data.module_id} !== ${moduleId}`);
      }
      const moduleMap = JSON.parse(fs.readFileSync(paths.moduleMapPath, "utf8"));
      const moduleIds = (moduleMap.modules ?? []).map((m) => m.id);
      const registry = buildItemRegistry(paths);
      const depErrors = validateDependsOn(data, registry, moduleIds);
      errors.push(...depErrors);
    }
    return { ok: errors.length === 0, errors, metrics: {} };
  }

  if (phase === "implement") {
    const itemId = targetId ?? cycle?.current_item_id;
    if (!itemId) return { ok: false, errors: ["no current_item_id"], metrics: {} };
    const covPath = coveragePath(paths, itemId);
    const result = await validateArtifactFile("coverage-report", covPath);
    if (!result.ok) errors.push(...result.errors);
    else {
      const data = JSON.parse(fs.readFileSync(covPath, "utf8"));
      const forbidden = project.forbidden_write_paths ?? ["project/"];
      for (const file of data.files_changed ?? []) {
        const normalized = file.replace(/^\//, "");
        for (const prefix of forbidden) {
          if (normalized.startsWith(prefix.replace(/^\//, ""))) {
            errors.push(`forbidden path in files_changed: ${file} (prefix ${prefix})`);
          }
        }
      }
    }
    return { ok: errors.length === 0, errors, metrics: {} };
  }

  return { ok: false, errors: [`unknown phase: ${phase}`], metrics: {} };
}

export function evaluateReviewGate(review, phase, project) {
  const errors = [];
  if (!review) return { ok: false, errors: ["review file missing"] };
  if (review.ok !== true) errors.push("review ok !== true");
  if ((review.blockers ?? []).length > 0) {
    errors.push(`blockers: ${review.blockers.map(formatBlockerEntry).join("; ")}`);
  }

  const threshold = Number(project.coverage_threshold_pct ?? 90);
  const minReadiness = Number(project.review?.min_readiness_pct ?? 85);
  const minConfidence = Number(project.review?.min_coverage_confidence_pct ?? 80);

  if (phase === "implement") {
    const cov = Number(review.coverage_pct ?? 0);
    if (cov < threshold) errors.push(`coverage_pct ${cov} < ${threshold}`);
    const conf = Number(review.coverage_confidence_pct ?? 0);
    if (conf < minConfidence) errors.push(`coverage_confidence_pct ${conf} < ${minConfidence}`);
    if (review.functional_ok !== true) {
      errors.push("functional_ok !== true");
    }
    const funcFails = (review.functional_audit ?? []).filter((r) =>
      r.status === "fail" || r.status === "partial",
    );
    if (funcFails.length > 0) {
      errors.push(`functional_audit fail/partial: ${funcFails.map((r) => r.id).join(", ")}`);
    }
    const auditFails = (review.criteria_audit ?? []).filter((r) => r.status === "fail");
    if (auditFails.length > 0) {
      errors.push(`criteria_audit fail: ${auditFails.map((r) => r.id).join(", ")}`);
    }
  } else {
    const readiness = Number(review.readiness_pct ?? 0);
    if (readiness < minReadiness) errors.push(`readiness_pct ${readiness} < ${minReadiness}`);
    const conf = Number(review.coverage_confidence_pct ?? 0);
    if (conf < minConfidence) errors.push(`coverage_confidence_pct ${conf} < ${minConfidence}`);
  }

  return { ok: errors.length === 0, errors };
}

export function evaluateTriageGate(triage) {
  const errors = [];
  if (!triage) return { ok: false, errors: ["triage file missing"] };
  if (triage.rewrite_required === true) {
    errors.push("triage rewrite_required === true");
  }
  if (triage.ok_to_advance !== true) {
    errors.push("triage ok_to_advance !== true");
  }
  const blocked = (triage.decisions ?? []).filter((d) => d.severity === "block");
  if (blocked.length > 0) {
    errors.push(`triage block severity: ${blocked.map((d) => d.critique_id).join(", ")}`);
  }
  const fixNow = (triage.decisions ?? []).filter((d) => d.resolution === "fix_now");
  if (fixNow.length > 0 && triage.rewrite_required !== true) {
    errors.push(`resolution fix_now requires rewrite_required: ${fixNow.map((d) => d.critique_id).join(", ")}`);
  }
  return { ok: errors.length === 0, errors };
}
