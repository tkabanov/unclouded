import type { EmittedArtifact } from "./gherkin.js";
import type { M2ViewBundle } from "../contracts/view-ir.js";

function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export const SECURITY_REVIEW_BANNER =
  "> **Review required:** deterministic scaffold generated from IR metadata; validate threat model and DPIA with a human security/privacy review.";

function renderThreatModel(views: M2ViewBundle): string {
  const lines = [
    "# Threat Model Baseline",
    "",
    SECURITY_REVIEW_BANNER,
    "",
    "## Actors",
    "",
    "| actor_id | privacy_role_refs |",
    "|---|---|",
    ...views.actors.map((actor) => `| ${actor.actor_id} | ${actor.privacy_role_refs.join(",")} |`),
    "",
    "## Data Flows",
    "",
    "| flow_id | source_id |",
    "|---|---|",
    ...views.data_flows.map((flow) => `| ${flow.flow_id} | ${flow.source_id} |`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function renderDpia(views: M2ViewBundle): string {
  const lines = [
    "# DPIA Lite Baseline",
    "",
    SECURITY_REVIEW_BANNER,
    "",
    "## PII Categories",
    "",
    "| field_id | category |",
    "|---|---|",
    ...views.pii_categories.map((row) => `| ${row.field_id} | ${row.category} |`),
    "",
    "## Data Flows",
    "",
    "| flow_id | source_id |",
    "|---|---|",
    ...views.data_flows.map((flow) => `| ${flow.flow_id} | ${flow.source_id} |`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

export function emitThreatModelScaffold(views: M2ViewBundle): EmittedArtifact[] {
  return [
    {
      path: "docs/security/threat-model.md",
      content: renderThreatModel(views),
    },
    {
      path: "agent/security/threat-index.json",
      content: stableJson({
        actors: views.actors,
        data_flows: views.data_flows,
      }),
    },
  ];
}

export function emitDpiaScaffold(views: M2ViewBundle): EmittedArtifact[] {
  return [
    {
      path: "docs/privacy/dpia-lite.md",
      content: renderDpia(views),
    },
    {
      path: "agent/security/dpia-index.json",
      content: stableJson({
        pii_categories: views.pii_categories,
        data_flows: views.data_flows,
      }),
    },
  ];
}
