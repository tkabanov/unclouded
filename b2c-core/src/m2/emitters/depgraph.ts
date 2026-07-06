import type { EmittedArtifact } from "./gherkin.js";
import type { M2ViewBundle } from "../contracts/view-ir.js";
import type { InventoryFile, RefEdge } from "../../types.js";

interface DepgraphNode {
  id: string;
  pointer: string;
  entity_class: string;
}

interface DepgraphEdge {
  from_id: string;
  to_id: string;
  kind: string;
  source: "refs" | "views";
}

export interface DepgraphDoc {
  schema: "m2.phase6.depgraph.v1";
  generated_from: "inventory+refs+views";
  node_count: number;
  edge_count: number;
  nodes: DepgraphNode[];
  edges: DepgraphEdge[];
}

function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sortedEdges(edges: DepgraphEdge[]): DepgraphEdge[] {
  return edges.slice().sort((left, right) => {
    if (left.from_id !== right.from_id) {
      return left.from_id.localeCompare(right.from_id);
    }
    if (left.to_id !== right.to_id) {
      return left.to_id.localeCompare(right.to_id);
    }
    if (left.kind !== right.kind) {
      return left.kind.localeCompare(right.kind);
    }
    return left.source.localeCompare(right.source);
  });
}

export function buildDepgraphDoc(inventory: InventoryFile, refs: readonly RefEdge[], views: M2ViewBundle): DepgraphDoc {
  const inventoryNodes = inventory.entries
    .map((entry) => ({
      id: entry.id,
      pointer: entry.pointer,
      entity_class: entry.entity_class,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const viewNodes: DepgraphNode[] = [
    ...views.acceptance_scenarios.map((scenario) => ({
      id: `view:acceptance_scenario:${scenario.scenario_id}`,
      pointer: `/agent/acceptance/${scenario.scenario_id}.feature`,
      entity_class: "view.acceptance_scenario",
    })),
    ...views.openapi_operations.map((operation) => ({
      id: `view:openapi_operation:${operation.operation_id}`,
      pointer: `/agent/contracts/openapi/${operation.operation_id}`,
      entity_class: "view.openapi_operation",
    })),
    ...views.asyncapi_messages.map((message) => ({
      id: `view:asyncapi_message:${message.message_id}`,
      pointer: `/agent/contracts/asyncapi/${message.message_id}`,
      entity_class: "view.asyncapi_message",
    })),
    ...views.uds_types.map((udsType) => ({
      id: `view:uds_type:${udsType.id}`,
      pointer: `/agent/schema/uds/${udsType.id}`,
      entity_class: "view.uds_type",
    })),
  ].sort((a, b) => a.id.localeCompare(b.id));
  const nodeById = new Map<string, DepgraphNode>();
  for (const node of [...inventoryNodes, ...viewNodes]) {
    if (!nodeById.has(node.id)) {
      nodeById.set(node.id, node);
    }
  }
  const nodes = [...nodeById.values()].sort((a, b) => a.id.localeCompare(b.id));
  const edges: DepgraphEdge[] = [
    ...refs.map((edge) => ({
      from_id: edge.from_id,
      to_id: edge.to_id,
      kind: edge.edge_kind,
      source: "refs" as const,
    })),
    ...views.acceptance_scenarios.map((scenario) => ({
      from_id: scenario.workflow_ref,
      to_id: `view:acceptance_scenario:${scenario.scenario_id}`,
      kind: "drives_acceptance_scenario",
      source: "views" as const,
    })),
    ...views.openapi_operations.map((operation) => ({
      from_id: operation.source_id,
      to_id: `view:openapi_operation:${operation.operation_id}`,
      kind: "drives_openapi_operation",
      source: "views" as const,
    })),
    ...views.asyncapi_messages.map((message) => ({
      from_id: message.source_id,
      to_id: `view:asyncapi_message:${message.message_id}`,
      kind: "drives_asyncapi_message",
      source: "views" as const,
    })),
    ...views.uds_types.map((udsType) => ({
      from_id: udsType.user_type_ref,
      to_id: `view:uds_type:${udsType.id}`,
      kind: "drives_uds_type",
      source: "views" as const,
    })),
  ];
  const sorted = sortedEdges(edges);
  return {
    schema: "m2.phase6.depgraph.v1",
    generated_from: "inventory+refs+views",
    node_count: nodes.length,
    edge_count: sorted.length,
    nodes,
    edges: sorted,
  };
}

export function emitDepgraphScaffold(inventory: InventoryFile, refs: readonly RefEdge[], views: M2ViewBundle): EmittedArtifact[] {
  const doc = buildDepgraphDoc(inventory, refs, views);
  return [
    {
      path: "agent/depgraph.json",
      content: stableJson(doc),
    },
  ];
}
