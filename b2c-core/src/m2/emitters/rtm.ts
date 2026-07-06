import type { EmittedArtifact } from "./gherkin.js";
import type { M2ViewBundle } from "../contracts/view-ir.js";
import type { InventoryFile } from "../../types.js";

const RTM_HEADER = [
  "entity_id",
  "entity_class",
  "pointer",
  "view_refs",
  "artifact_refs",
  "code_module",
  "test_id",
  "pipeline_evidence",
  "status",
  "owner",
  "notes",
];

function toCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function artifactRefsForViews(viewRefs: string[]): string[] {
  const refs = new Set<string>();
  for (const viewRef of viewRefs) {
    if (viewRef.startsWith("acceptance_scenario:")) {
      refs.add("agent/acceptance/*.feature");
      continue;
    }
    if (viewRef.startsWith("openapi_operation:")) {
      refs.add("agent/contracts/openapi-incoming.json");
      refs.add("agent/contracts/openapi-outgoing.json");
      continue;
    }
    if (viewRef.startsWith("asyncapi_message:")) {
      refs.add("agent/contracts/asyncapi.json");
      continue;
    }
    if (viewRef.startsWith("uds_type:")) {
      refs.add("agent/schema/uds.json");
      refs.add("agent/schema/uds.yaml");
      continue;
    }
    if (viewRef.startsWith("threat_actor:")) {
      refs.add("docs/security/threat-model.md");
      refs.add("agent/security/threat-index.json");
      continue;
    }
    if (viewRef.startsWith("data_flow:")) {
      refs.add("docs/security/threat-model.md");
      refs.add("docs/privacy/dpia-lite.md");
      refs.add("agent/security/threat-index.json");
      refs.add("agent/security/dpia-index.json");
      continue;
    }
    if (viewRef.startsWith("pii_category:")) {
      refs.add("docs/privacy/dpia-lite.md");
      refs.add("agent/security/dpia-index.json");
      continue;
    }
    if (viewRef.startsWith("migration_adr:")) {
      refs.add("docs/adr/*.md");
      refs.add("agent/adr-index.json");
    }
  }
  return [...refs].sort((a, b) => a.localeCompare(b));
}

function buildViewIndex(views: M2ViewBundle): Map<string, string[]> {
  const index = new Map<string, string[]>();
  const push = (sourceId: string, ref: string): void => {
    const current = index.get(sourceId) ?? [];
    current.push(ref);
    index.set(sourceId, current);
  };

  for (const scenario of views.acceptance_scenarios) {
    push(scenario.workflow_ref, `acceptance_scenario:${scenario.scenario_id}`);
  }
  for (const operation of views.openapi_operations) {
    push(operation.source_id, `openapi_operation:${operation.operation_id}`);
  }
  for (const message of views.asyncapi_messages) {
    push(message.source_id, `asyncapi_message:${message.message_id}`);
  }
  for (const udsType of views.uds_types) {
    push(udsType.user_type_ref, `uds_type:${udsType.id}`);
  }
  for (const actor of views.actors) {
    for (const role of actor.privacy_role_refs) {
      push(role, `threat_actor:${actor.actor_id}`);
    }
  }
  for (const flow of views.data_flows) {
    push(flow.source_id, `data_flow:${flow.flow_id}`);
  }
  for (const pii of views.pii_categories) {
    push(pii.field_id, `pii_category:${pii.category}`);
  }
  for (const adr of views.migration_adrs) {
    push(adr.entity_id, `migration_adr:${adr.adr_id}`);
  }

  for (const [sourceId, refs] of index.entries()) {
    refs.sort();
    index.set(sourceId, refs);
  }
  return index;
}

export function emitRtmScaffold(inventory: InventoryFile, views: M2ViewBundle): EmittedArtifact[] {
  const viewIndex = buildViewIndex(views);
  const rows = inventory.entries.map((entry) => {
    const viewRefs = viewIndex.get(entry.id) ?? [];
    const artifactRefs = artifactRefsForViews(viewRefs);
    const columns = [
      entry.id,
      entry.entity_class,
      entry.pointer,
      viewRefs.join(";"),
      artifactRefs.join(";"),
      `m2/${entry.entity_class.replace(/\./g, "/")}/${sanitizeSegment(entry.id)}`,
      `accept:m2:${sanitizeSegment(entry.id)}`,
      `inventory:${entry.pointer}`,
      viewRefs.length > 0 ? "mapped" : "unmapped",
      "pending-owner",
      "pending",
    ];
    return columns.map(toCsvCell).join(",");
  });

  return [
    {
      path: "agent/rtm.csv",
      content: `${RTM_HEADER.join(",")}\n${rows.join("\n")}\n`,
    },
  ];
}
