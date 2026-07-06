import type { EmittedArtifact } from "./gherkin.js";
import type { M2ViewBundle } from "../contracts/view-ir.js";

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function renderAdr(adrId: string, entityId: string): string {
  return [
    "---",
    `id: ${adrId}`,
    "status: pending-m7",
    `entity_id: ${entityId}`,
    "---",
    "",
    `# ${adrId}`,
    "",
    "## Context",
    "",
    "Deterministic scaffold generated in M2 phase 6 baseline.",
    "",
    "## Decision",
    "",
    "_pending-m7_",
    "",
    "## Alternatives",
    "",
    "_pending-m7_",
    "",
    "## Consequences",
    "",
    "_pending-m7_",
    "",
  ].join("\n");
}

export function emitAdrScaffold(views: M2ViewBundle): EmittedArtifact[] {
  const files: EmittedArtifact[] = views.migration_adrs
    .map((adr) => ({
      path: `docs/adr/${sanitizeSegment(adr.adr_id)}.md`,
      content: renderAdr(adr.adr_id, adr.entity_id),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  files.push({
    path: "agent/adr-index.json",
    content: `${JSON.stringify(views.migration_adrs, null, 2)}\n`,
  });

  return files;
}
