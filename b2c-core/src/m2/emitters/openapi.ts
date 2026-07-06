import type { EmittedArtifact } from "./gherkin.js";
import type { M2ViewBundle } from "../contracts/view-ir.js";
import type { InventoryEntry } from "../../types.js";
import { deriveOpenApiNamespaceSlug } from "../views/id-derivation.js";

interface OpenApiDoc {
  openapi: "3.1.0";
  info: {
    title: string;
    version: string;
  };
  tags?: Array<{ name: string; description: string }>;
  "x-b2c"?: {
    generated_from: "inventory+views";
    operation_count: number;
  };
  paths: Record<string, Record<string, OpenApiOperationDoc>>;
}

interface OpenApiOperationDoc {
  operationId: string;
  summary: string;
  tags: string[];
  responses: Record<string, { description: string }>;
  "x-b2c": {
    source_id: string;
    source_kind: "api_event" | "external_http_call";
    source_entity_class: string | null;
    source_pointer: string | null;
  };
}

function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function toYamlValue(value: string | number | boolean | null): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function toYamlDoc(doc: OpenApiDoc): string {
  const lines: string[] = [
    `openapi: ${JSON.stringify(doc.openapi)}`,
    "info:",
    `  title: ${JSON.stringify(doc.info.title)}`,
    `  version: ${JSON.stringify(doc.info.version)}`,
  ];
  if (doc.tags && doc.tags.length > 0) {
    lines.push("tags:");
    for (const tag of doc.tags) {
      lines.push(`  - name: ${JSON.stringify(tag.name)}`);
      lines.push(`    description: ${JSON.stringify(tag.description)}`);
    }
  }
  if (doc["x-b2c"]) {
    lines.push('"x-b2c":');
    lines.push(`  generated_from: ${JSON.stringify(doc["x-b2c"].generated_from)}`);
    lines.push(`  operation_count: ${doc["x-b2c"].operation_count}`);
  }
  lines.push("paths:");
  const pathKeys = Object.keys(doc.paths).sort((a, b) => a.localeCompare(b));
  for (const pathKey of pathKeys) {
    lines.push(`  ${JSON.stringify(pathKey)}:`);
    const methods = doc.paths[pathKey] ?? {};
    const methodKeys = Object.keys(methods).sort((a, b) => a.localeCompare(b));
    for (const methodKey of methodKeys) {
      const operation = methods[methodKey];
      if (!operation) {
        continue;
      }
      lines.push(`    ${methodKey}:`);
      lines.push(`      operationId: ${JSON.stringify(operation.operationId)}`);
      lines.push(`      summary: ${JSON.stringify(operation.summary)}`);
      lines.push("      tags:");
      for (const tag of operation.tags) {
        lines.push(`        - ${JSON.stringify(tag)}`);
      }
      lines.push("      responses:");
      const responseCodes = Object.keys(operation.responses).sort((a, b) => a.localeCompare(b));
      for (const responseCode of responseCodes) {
        lines.push(`        ${JSON.stringify(responseCode)}:`);
        lines.push(`          description: ${JSON.stringify(operation.responses[responseCode]?.description ?? "")}`);
      }
      lines.push('      "x-b2c":');
      lines.push(`        source_id: ${JSON.stringify(operation["x-b2c"].source_id)}`);
      lines.push(`        source_kind: ${JSON.stringify(operation["x-b2c"].source_kind)}`);
      lines.push(`        source_entity_class: ${toYamlValue(operation["x-b2c"].source_entity_class)}`);
      lines.push(`        source_pointer: ${toYamlValue(operation["x-b2c"].source_pointer)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function operationPath(sourceId: string): string {
  return `/ops/${sanitizePathSegment(sourceId)}`;
}

function operationMethod(method: unknown): string {
  if (typeof method !== "string" || method.length === 0) {
    return "post";
  }
  return method === "delete_method" ? "delete" : method.toLowerCase();
}

function buildDoc(
  title: string,
  operations: Array<{
    operationId: string;
    method: string;
    path: string;
    sourceId: string;
    sourceKind: "api_event" | "external_http_call";
    sourceEntityClass: string | null;
    sourcePointer: string | null;
  }>,
): OpenApiDoc {
  const paths: OpenApiDoc["paths"] = {};
  for (const operation of operations) {
    const current = paths[operation.path] ?? ({} as Record<string, OpenApiOperationDoc>);
    current[operation.method] = {
      operationId: operation.operationId,
      summary: `Operation for ${operation.sourceId}`,
      tags: [operation.sourceKind],
      responses: {
        "200": {
          description: "Deterministic baseline response",
        },
      },
      "x-b2c": {
        source_id: operation.sourceId,
        source_kind: operation.sourceKind,
        source_entity_class: operation.sourceEntityClass,
        source_pointer: operation.sourcePointer,
      },
    };
    paths[operation.path] = current;
  }
  return {
    openapi: "3.1.0",
    info: {
      title,
      version: "0.1.0-m2-baseline",
    },
    tags: [
      { name: "api_event", description: "Incoming API events mapped from inventory entries." },
      { name: "external_http_call", description: "Outgoing HTTP calls mapped from inventory entries." },
    ],
    "x-b2c": {
      generated_from: "inventory+views",
      operation_count: operations.length,
    },
    paths,
  };
}

export function emitOpenApiScaffold(
  views: M2ViewBundle,
  byId: ReadonlyMap<string, InventoryEntry>,
): EmittedArtifact[] {
  const incoming = views.openapi_operations
    .filter((operation) => operation.source_kind === "api_event")
    .map((operation) => {
      const source = byId.get(operation.source_id);
      return {
        operationId: operation.operation_id,
        method: "post",
        path: operationPath(operation.source_id),
        sourceId: operation.source_id,
        sourceKind: operation.source_kind,
        sourceEntityClass: source?.entity_class ?? null,
        sourcePointer: source?.pointer ?? null,
      };
    })
    .sort((a, b) => a.operationId.localeCompare(b.operationId));

  const outgoing = views.openapi_operations
    .filter((operation) => operation.source_kind === "external_http_call")
    .map((operation) => {
      const source = byId.get(operation.source_id);
      return {
        operationId: operation.operation_id,
        method: operationMethod(source?.meta?.method),
        path: operationPath(operation.source_id),
        sourceId: operation.source_id,
        sourceKind: operation.source_kind,
        sourceEntityClass: source?.entity_class ?? null,
        sourcePointer: source?.pointer ?? null,
      };
    })
    .sort((a, b) => a.operationId.localeCompare(b.operationId));

  const incomingDoc = buildDoc("M2 Incoming API Baseline", incoming);
  const outgoingDoc = buildDoc("M2 Outgoing API Baseline", outgoing);
  const incomingByNamespace = new Map<string, typeof incoming>();
  for (const operation of incoming) {
    const namespace = deriveOpenApiNamespaceSlug("api_event", operation.sourceId);
    const bucket = incomingByNamespace.get(namespace) ?? [];
    bucket.push(operation);
    incomingByNamespace.set(namespace, bucket);
  }
  const outgoingByNamespace = new Map<string, typeof outgoing>();
  for (const operation of outgoing) {
    const namespace = deriveOpenApiNamespaceSlug("external_http_call", operation.sourceId);
    const bucket = outgoingByNamespace.get(namespace) ?? [];
    bucket.push(operation);
    outgoingByNamespace.set(namespace, bucket);
  }

  const artifacts: EmittedArtifact[] = [
    {
      path: "agent/contracts/openapi-incoming.json",
      content: stableJson(incomingDoc),
    },
    {
      path: "agent/contracts/openapi-incoming.yaml",
      content: toYamlDoc(incomingDoc),
    },
    {
      path: "agent/contracts/openapi-outgoing.json",
      content: stableJson(outgoingDoc),
    },
    {
      path: "agent/contracts/openapi-outgoing.yaml",
      content: toYamlDoc(outgoingDoc),
    },
  ];

  for (const namespace of [...incomingByNamespace.keys()].sort((a, b) => a.localeCompare(b))) {
    artifacts.push({
      path: `agent/contracts/openapi-incoming/${namespace}.yaml`,
      content: toYamlDoc(buildDoc(`M2 Incoming API Namespace: ${namespace}`, incomingByNamespace.get(namespace) ?? [])),
    });
  }
  for (const namespace of [...outgoingByNamespace.keys()].sort((a, b) => a.localeCompare(b))) {
    artifacts.push({
      path: `agent/contracts/openapi-outgoing/${namespace}.yaml`,
      content: toYamlDoc(buildDoc(`M2 Outgoing API Namespace: ${namespace}`, outgoingByNamespace.get(namespace) ?? [])),
    });
  }

  return artifacts.sort((a, b) => a.path.localeCompare(b.path));
}
