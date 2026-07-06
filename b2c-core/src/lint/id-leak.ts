export interface TextArtifact {
  path: string;
  content: string;
}

export interface RawIdLeakFinding {
  path: string;
  line: number;
  token: string;
  reason: string;
}

const RAW_ID_TOKEN = /\b[A-Za-z][A-Za-z0-9]{4,12}\b/g;

function looksLikeOpaqueId(value: string): boolean {
  if (value.length < 5) {
    return false;
  }
  const hasDigit = /\d/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  return hasDigit || (hasLower && hasUpper);
}

export function collectOpaqueInventoryIds(ids: readonly string[]): Set<string> {
  return new Set(
    ids.filter(
      (id) =>
        /^[A-Za-z][A-Za-z0-9]{4,12}$/.test(id) &&
        !id.includes(":") &&
        !id.includes("_") &&
        looksLikeOpaqueId(id),
    ),
  );
}

export function listRawIdLeaksInText(text: string, opaqueIds: ReadonlySet<string>): string[] {
  const leaked = new Set<string>();
  const matches = text.match(RAW_ID_TOKEN) ?? [];
  for (const token of matches) {
    if (opaqueIds.has(token)) {
      leaked.add(token);
    }
  }
  return [...leaked].sort((a, b) => a.localeCompare(b));
}

function isDocTemplatePath(path: string): boolean {
  return path.startsWith("docs/") && path.endsWith(".md");
}

function isPhase5BucketDoc(path: string): boolean {
  return /^docs\/[^/]+\/bucket_\d+\.md$/.test(path);
}

function lineHasExplicitMachineContext(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return true;
  }
  if (trimmed.startsWith("|")) {
    return true;
  }
  if (trimmed.startsWith("```")) {
    return true;
  }
  const machinePrefixes = [
    "id:",
    "entity_id:",
    "actor_id",
    "flow_id",
    "field_id",
    "source_id",
    "workflow_ref",
    "feature_path:",
    "Given workflow ",
    "- `",
    "## Entity `",
  ];
  return machinePrefixes.some((prefix) => trimmed.startsWith(prefix));
}

export function lintRawIdLeaksInDocTemplates(
  artifacts: readonly TextArtifact[],
  opaqueIds: ReadonlySet<string>,
): RawIdLeakFinding[] {
  const findings: RawIdLeakFinding[] = [];
  for (const artifact of artifacts) {
    if (!isDocTemplatePath(artifact.path)) {
      continue;
    }
    const lines = artifact.content.split("\n");
    if (isPhase5BucketDoc(artifact.path)) {
      let inProseSection = false;
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index] ?? "";
        const trimmed = line.trim();
        if (trimmed.startsWith("## ")) {
          inProseSection = false;
        }
        if (trimmed === "- prose (human):") {
          inProseSection = true;
          continue;
        }
        if (!inProseSection) {
          continue;
        }
        const leaks = listRawIdLeaksInText(line, opaqueIds);
        for (const token of leaks) {
          findings.push({
            path: artifact.path,
            line: index + 1,
            token,
            reason: "raw id in prose section",
          });
        }
      }
      continue;
    }
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      if (lineHasExplicitMachineContext(line)) {
        continue;
      }
      const leaks = listRawIdLeaksInText(line, opaqueIds);
      for (const token of leaks) {
        findings.push({
          path: artifact.path,
          line: index + 1,
          token,
          reason: "raw id in human-facing line",
        });
      }
    }
  }
  return findings.sort((left, right) => {
    if (left.path !== right.path) {
      return left.path.localeCompare(right.path);
    }
    if (left.line !== right.line) {
      return left.line - right.line;
    }
    return left.token.localeCompare(right.token);
  });
}
