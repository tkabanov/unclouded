import { emitAdrScaffold } from "./adr-scaffold.js";
import { asyncApiChannelForNamespace, emitAsyncApiScaffold, parseExternalCallSourceId } from "./asyncapi.js";
import type { EmittedArtifact } from "./gherkin.js";
import { emitGherkinScaffold } from "./gherkin.js";
import { emitOpenApiScaffold } from "./openapi.js";
import { PHASE6_EMITTER_ORDER } from "./order.js";
import { emitRtmScaffold } from "./rtm.js";
import { emitDpiaScaffold, emitThreatModelScaffold } from "./threat-dpia.js";
import { emitDepgraphScaffold } from "./depgraph.js";
import { emitUdsScaffold } from "./uds.js";
import type { InventoryEntry, InventoryFile, JsonValue, RefEdge } from "../../types.js";
import { accessorRefToJson, buildRuntimeAccessorCatalog, decodeAccessor } from "../../decoders/accessor.js";
import {
  decodeMessageTree,
  decodeMessageTreeAccessors,
  decodeMessageTreeTypedAst,
  summarizeMessageTreeAstCoverage,
} from "../../decoders/message-tree.js";
import { capabilitiesForEntityClass, requiresAdrForCapability } from "../../ir/capabilities.js";
import type {
  M2ViewBundle,
  ManifestEntityIr,
  ManifestEntityRecord,
  ManifestIrSummary,
  ManifestM2Doc,
} from "../../schemas/ir/index.js";

export interface Phase6EmitterCheck {
  name: string;
  pass: boolean;
  detail: string;
}

export interface Phase6EmitResult {
  artifacts: EmittedArtifact[];
  checks: Phase6EmitterCheck[];
}

function byIdIndex(entries: InventoryEntry[]): Map<string, InventoryEntry> {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function operationMethod(method: unknown): string {
  if (typeof method !== "string" || method.length === 0) {
    return "post";
  }
  return method === "delete_method" ? "delete" : method.toLowerCase();
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

type ManifestIrKey = keyof ManifestIrSummary;

function emptyManifestSummary(): ManifestIrSummary {
  return {
    acceptance_scenarios: [],
    openapi_operations: [],
    asyncapi_messages: [],
    uds_types: [],
    threat_actors: [],
    data_flows: [],
    pii_categories: [],
    migration_adrs: [],
  };
}

function migrationEntityClass(entityId: string): string | null {
  const prefix = "entity_class:";
  if (!entityId.startsWith(prefix)) {
    return null;
  }
  const className = entityId.slice(prefix.length);
  return className.length > 0 ? className : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function assertNever(value: never): never {
  throw new Error(`Unhandled entity_class: ${String(value)}`);
}

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseExternalCallId(entryId: string): { namespaceId: string; callId: string } | null {
  const prefix = "external_call:";
  if (!entryId.startsWith(prefix)) {
    return null;
  }
  const remainder = entryId.slice(prefix.length);
  const parts = remainder.split(":");
  if (parts.length < 2) {
    return null;
  }
  const namespaceId = parts[0] ?? "";
  const callId = parts.slice(1).join(":");
  if (namespaceId.length === 0 || callId.length === 0) {
    return null;
  }
  return { namespaceId, callId };
}

function parsePrivacyRoleId(entryId: string): { userTypeId: string; roleId: string } | null {
  const prefix = "privacy_role:";
  if (!entryId.startsWith(prefix)) {
    return null;
  }
  const remainder = entryId.slice(prefix.length);
  const separator = remainder.indexOf(":");
  if (separator <= 0 || separator >= remainder.length - 1) {
    return null;
  }
  return {
    userTypeId: remainder.slice(0, separator),
    roleId: remainder.slice(separator + 1),
  };
}

interface TypedIrContext {
  childrenByParentId: ReadonlyMap<string, readonly InventoryEntry[]>;
  runtimeAccessorCatalog: ReadonlySet<string>;
  refsByFromId: ReadonlyMap<string, readonly RefEdge[]>;
}

function firstStyleRefTarget(refsByFromId: ReadonlyMap<string, readonly RefEdge[]>, fromId: string): string | null {
  const refs = refsByFromId.get(fromId) ?? [];
  const styleRef = refs.find((ref) => ref.edge_kind === "style_ref");
  return styleRef?.to_id ?? null;
}

function typedIrForEntry(entry: InventoryEntry, context: TypedIrContext): ManifestEntityIr {
  const capabilities = capabilitiesForEntityClass(entry.entity_class);
  const base = {
    id: entry.id,
    pointer: entry.pointer,
    capabilities: [...capabilities],
    requires_adrs: capabilities
      .flatMap((capability) => requiresAdrForCapability(capability))
      .sort((a, b) => a.localeCompare(b)),
  };
  const meta = entry.meta ?? {};
  const actionCount = (context.childrenByParentId.get(entry.id) ?? []).filter((child) =>
    child.entity_class.endsWith(".action"),
  ).length;
  switch (entry.entity_class) {
    case "user_type":
      return {
        kind: entry.entity_class,
        ...base,
        display: asString(meta.display) ?? null,
      };
    case "user_type.field":
      return {
        kind: entry.entity_class,
        ...base,
        field_id: asString(meta.field_id) ?? entry.id,
        type: asString(meta.type) ?? null,
        currency_code: asString(meta.currency_code) ?? null,
        storage_path: asString(meta.storage_path) ?? null,
        mime_type: asString(meta.mime_type) ?? null,
      };
    case "privacy_role": {
      const privacyRole = parsePrivacyRoleId(entry.id);
      const rawCondition = Object.hasOwn(meta, "condition") ? meta.condition : null;
      const conditionTree = Object.hasOwn(meta, "condition_tree")
        ? (meta.condition_tree as JsonValue)
        : (decodeMessageTree(rawCondition, {
            strict: true,
            runtimeAccessorCatalog: context.runtimeAccessorCatalog,
          }) as JsonValue);
      const conditionTypedAst = Object.hasOwn(meta, "condition_typed_ast")
        ? (meta.condition_typed_ast as JsonValue)
        : (decodeMessageTreeTypedAst(rawCondition, {
            strict: true,
            runtimeAccessorCatalog: context.runtimeAccessorCatalog,
          }) as unknown as JsonValue);
      const conditionAstCoverage = Object.hasOwn(meta, "condition_ast_coverage")
        ? (meta.condition_ast_coverage as JsonValue)
        : (summarizeMessageTreeAstCoverage(
            decodeMessageTreeTypedAst(rawCondition, {
              strict: true,
              runtimeAccessorCatalog: context.runtimeAccessorCatalog,
            }),
          ) as unknown as JsonValue);
      const conditionAccessors = Array.isArray(meta.condition_accessors)
        ? [...meta.condition_accessors]
            .filter((item): item is Record<string, JsonValue> => isRecord(item))
            .sort((a, b) => {
              const left = typeof a.raw === "string" ? a.raw : "";
              const right = typeof b.raw === "string" ? b.raw : "";
              return left.localeCompare(right);
            })
        : decodeMessageTreeAccessors(rawCondition, {
            strict: true,
            runtimeAccessorCatalog: context.runtimeAccessorCatalog,
          })
            .map((accessor) =>
              accessorRefToJson(
                decodeAccessor(accessor, {
                  runtimeAccessorCatalog: context.runtimeAccessorCatalog,
                  strict: true,
                }),
              ),
            )
            .sort((a, b) => {
              const left = typeof a.raw === "string" ? a.raw : "";
              const right = typeof b.raw === "string" ? b.raw : "";
              return left.localeCompare(right);
            });
      if (conditionTree === null || conditionTypedAst === null || !isRecord(conditionAstCoverage)) {
        throw new Error(`privacy_role ${entry.id} missing condition typed AST coverage metadata`);
      }
      const unknownNodeCount = conditionAstCoverage.unknown_node_count;
      if (typeof unknownNodeCount !== "number" || unknownNodeCount !== 0) {
        throw new Error(
          `privacy_role ${entry.id} condition typed AST has unsupported nodes (unknown_node_count=${String(
            unknownNodeCount,
          )})`,
        );
      }
      return {
        kind: entry.entity_class,
        ...base,
        role_id: privacyRole?.roleId ?? entry.id,
        user_type_id: privacyRole?.userTypeId ?? null,
        condition_tree: conditionTree as JsonValue,
        condition_typed_ast: conditionTypedAst as JsonValue,
        condition_ast_coverage: conditionAstCoverage as JsonValue,
        condition_accessors: conditionAccessors,
      };
    }
    case "workflow":
    case "element_definition.workflow":
      const intervalSeconds = asNumber(meta.interval_seconds);
      const scheduled = intervalSeconds !== null
        ? {
            frequency_iso8601: `PT${Math.max(1, Math.round(intervalSeconds))}S`,
            expected_payload_bytes: 0,
            retries: 0,
            idempotent: false,
            interval_seconds: intervalSeconds,
          }
        : null;
      return {
        kind: entry.entity_class,
        ...base,
        trigger_type: asString(meta.trigger_type) ?? null,
        trigger_condition_type: asString(meta.trigger_condition_type) ?? null,
        trigger_element_id: asString(meta.trigger_element_id) ?? null,
        action_count: actionCount,
        scheduled,
      };
    case "workflow.action":
    case "element_definition.action":
      return {
        kind: entry.entity_class,
        ...base,
        action_type: asString(meta.action_type) ?? null,
      };
    case "api_event.action":
      return {
        kind: entry.entity_class,
        ...base,
        action_type: asString(meta.action_type) ?? null,
        scheduled_api_event_id: asString(meta.scheduled_api_event_id) ?? null,
        schedule_in_seconds: asNumber(meta.schedule_in_seconds) ?? null,
      };
    case "api_event":
      return {
        kind: entry.entity_class,
        ...base,
        method: operationMethod(meta.method),
        path: `/ops/${sanitizePathSegment(entry.id)}`,
        action_count: actionCount,
        event_type: asString(meta.event_type) ?? null,
        data_type: asString(meta.data_type) ?? null,
        parameter_count: asNumber(meta.parameter_count) ?? null,
        waiting_for_data: asBoolean(meta.waiting_for_data) ?? null,
        auth_unecessary: asBoolean(meta.auth_unecessary) ?? null,
        ignore_privacy_rules: asBoolean(meta.ignore_privacy_rules) ?? null,
      };
    case "external_http_call": {
      const externalCall = parseExternalCallId(entry.id);
      return {
        kind: entry.entity_class,
        ...base,
        method: operationMethod(meta.method),
        url: asString(meta.url) ?? null,
        data_type: asString(meta.data_type) ?? null,
        body_type: asString(meta.body_type) ?? null,
        ret_value: asString(meta.ret_value) ?? null,
        response_schema_format: asString(meta.response_schema_format) ?? null,
        namespace_id: externalCall?.namespaceId ?? null,
        call_id: externalCall?.callId ?? null,
        data_binding: isRecord(meta.data_binding) ? meta.data_binding : null,
      };
    }
    case "external_http_namespace":
    case "oauth_namespace":
      return {
        kind: entry.entity_class,
        ...base,
        auth_kind: asString(meta.auth_kind) ?? "none",
        token_url: asString(meta.token_url) ?? null,
        authorize_url: asString(meta.authorize_url) ?? null,
        redirect_uri: asString(meta.redirect_uri) ?? null,
        user_info_url: asString(meta.user_info_url) ?? null,
        client_id_env: asString(meta.client_id_env) ?? null,
        client_secret_env: asString(meta.client_secret_env) ?? null,
      };
    case "page":
      return {
        kind: entry.entity_class,
        ...base,
        type: asString(meta.type) ?? null,
        style_ref: firstStyleRefTarget(context.refsByFromId, entry.id),
      };
    case "element":
    case "element_definition":
      return {
        kind: entry.entity_class,
        ...base,
        type: asString(meta.type) ?? asString(meta.element_type) ?? null,
        style_ref: firstStyleRefTarget(context.refsByFromId, entry.id),
      };
    case "element_definition.field":
    case "element_definition.state":
      return {
        kind: entry.entity_class,
        ...base,
      };
    case "mobile_view":
      return {
        kind: entry.entity_class,
        ...base,
        breakpoint: asString(meta.breakpoint) ?? null,
      };
    case "option_set":
      return {
        kind: entry.entity_class,
        ...base,
        display: asString(meta.display) ?? null,
      };
    case "option_set.value":
      return {
        kind: entry.entity_class,
        ...base,
        option_set_ref: asString(meta.option_set_id) ?? null,
        value: asString(meta.value_key) ?? null,
      };
    case "style":
    case "style_ref":
      return {
        kind: entry.entity_class,
        ...base,
        style_id: asString(meta.style_id) ?? asString(meta.style_target) ?? entry.id,
      };
    case "custom_state":
      const stateSuffix = entry.id.includes(":") ? entry.id.slice(entry.id.lastIndexOf(":") + 1) : null;
      return {
        kind: entry.entity_class,
        ...base,
        state_key: asString(meta.state_key) ?? stateSuffix,
      };
    case "plugin":
      return {
        kind: entry.entity_class,
        ...base,
        plugin_id: asString(meta.plugin_id) ?? entry.id.replace(/^plugin:/, ""),
      };
    case "color_token":
    case "font_token":
      const tokenName = entry.id.includes(":") ? entry.id.slice(entry.id.indexOf(":") + 1) : entry.id;
      return {
        kind: entry.entity_class,
        ...base,
        token_name: asString(meta.name) ?? tokenName,
      };
    case "settings_singleton":
      return {
        kind: entry.entity_class,
        ...base,
        key_path: asString(meta.key_path) ?? entry.pointer,
      };
    case "secret_ref":
      return {
        kind: entry.entity_class,
        ...base,
        key_name: entry.id,
        source_path: entry.pointer,
      };
    case "public_integration_key":
      return {
        kind: entry.entity_class,
        ...base,
        suffix: asString(meta.suffix) ?? null,
        plugin_id_ref: asString(meta.plugin_id_ref) ?? null,
      };
    case "index_only":
      return {
        kind: entry.entity_class,
        ...base,
        children: asStringArray(meta.children),
      };
    default:
      return assertNever(entry.entity_class);
  }
}

function refsByFromId(refs: readonly RefEdge[]): Map<string, RefEdge[]> {
  const byFrom = new Map<string, RefEdge[]>();
  for (const edge of refs) {
    const bucket = byFrom.get(edge.from_id) ?? [];
    bucket.push(edge);
    byFrom.set(edge.from_id, bucket);
  }
  return byFrom;
}

function childrenByParentId(entries: readonly InventoryEntry[]): Map<string, InventoryEntry[]> {
  const byParent = new Map<string, InventoryEntry[]>();
  for (const entry of entries) {
    if (!entry.parent_id) {
      continue;
    }
    const bucket = byParent.get(entry.parent_id) ?? [];
    bucket.push(entry);
    byParent.set(entry.parent_id, bucket);
  }
  return byParent;
}

function renderManifest(
  inventory: InventoryFile,
  views: M2ViewBundle,
  byId: ReadonlyMap<string, InventoryEntry>,
  refsIndex: ReadonlyMap<string, RefEdge[]>,
): string {
  const runtimeAccessorCatalog = buildRuntimeAccessorCatalog(
    inventory.entries.map((entry) =>
      entry.meta && Object.hasOwn(entry.meta, "condition") ? entry.meta.condition : null,
    ),
  );
  const typedIrContext: TypedIrContext = {
    childrenByParentId: childrenByParentId(inventory.entries),
    runtimeAccessorCatalog,
    refsByFromId: refsIndex,
  };
  const manifestIndex = new Map<string, { summary: ManifestIrSummary; anchors: string[] }>();
  const ensure = (entityId: string): { summary: ManifestIrSummary; anchors: string[] } => {
    const current = manifestIndex.get(entityId);
    if (current) {
      return current;
    }
    const created = { summary: emptyManifestSummary(), anchors: [] };
    manifestIndex.set(entityId, created);
    return created;
  };
  const push = (entityId: string, key: ManifestIrKey, value: string, anchors: string[]): void => {
    const slot = ensure(entityId);
    slot.summary[key].push(value);
    slot.anchors.push(...anchors);
  };

  for (const scenario of views.acceptance_scenarios) {
    const fileName = sanitizePathSegment(scenario.scenario_id);
    push(scenario.workflow_ref, "acceptance_scenarios", scenario.scenario_id, [
      `agent/acceptance/${fileName}.feature#scenario:${scenario.scenario_id}`,
    ]);
  }

  for (const operation of views.openapi_operations) {
    const source = byId.get(operation.source_id);
    const contractPath =
      operation.source_kind === "api_event"
        ? "agent/contracts/openapi-incoming.json"
        : "agent/contracts/openapi-outgoing.json";
    const method = operation.source_kind === "api_event" ? "post" : operationMethod(source?.meta?.method);
    const path = `/ops/${sanitizePathSegment(operation.source_id)}`;
    push(operation.source_id, "openapi_operations", operation.operation_id, [
      `${contractPath}#operationId:${operation.operation_id}`,
      `${contractPath}#${method}:${path}`,
    ]);
  }

  for (const message of views.asyncapi_messages) {
    const channel = asyncApiChannelForNamespace(parseExternalCallSourceId(message.source_id).namespaceId);
    push(message.source_id, "asyncapi_messages", message.message_id, [
      `agent/contracts/asyncapi.json#message:${message.message_id}`,
      `agent/contracts/asyncapi.json#channel:${channel}`,
    ]);
  }

  for (const udsType of views.uds_types) {
    push(udsType.user_type_ref, "uds_types", udsType.id, [
      `agent/schema/uds.json#type:${udsType.id}`,
      `agent/schema/uds.yaml#type:${udsType.id}`,
    ]);
  }

  for (const actor of views.actors) {
    for (const role of actor.privacy_role_refs) {
      push(role, "threat_actors", actor.actor_id, [
        `docs/security/threat-model.md#actor:${actor.actor_id}`,
        `agent/security/threat-index.json#actor:${actor.actor_id}`,
      ]);
    }
  }

  for (const flow of views.data_flows) {
    push(flow.source_id, "data_flows", flow.flow_id, [
      `docs/security/threat-model.md#flow:${flow.flow_id}`,
      `docs/privacy/dpia-lite.md#flow:${flow.flow_id}`,
      `agent/security/threat-index.json#flow:${flow.flow_id}`,
      `agent/security/dpia-index.json#flow:${flow.flow_id}`,
    ]);
  }

  for (const pii of views.pii_categories) {
    push(pii.field_id, "pii_categories", pii.category, [
      `docs/privacy/dpia-lite.md#pii:${pii.field_id}`,
      `agent/security/dpia-index.json#pii:${pii.field_id}`,
    ]);
  }

  for (const adr of views.migration_adrs) {
    const className = migrationEntityClass(adr.entity_id);
    if (!className) {
      continue;
    }
    for (const entry of inventory.entries) {
      if (entry.entity_class !== className) {
        continue;
      }
      push(entry.id, "migration_adrs", adr.adr_id, [
        `docs/adr/${sanitizePathSegment(adr.adr_id)}.md`,
        `agent/adr-index.json#adr:${adr.adr_id}`,
      ]);
    }
  }

  const entities: ManifestEntityRecord[] = inventory.entries
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((entry) => {
      const slot = manifestIndex.get(entry.id);
      const summary = slot?.summary ?? emptyManifestSummary();
      const anchors = slot?.anchors ?? [];
      return {
        id: entry.id,
        pointer: entry.pointer,
        entity_class: entry.entity_class,
        doc_anchors: sortedUnique([`agent/rtm.csv#entity_id:${entry.id}`, ...anchors]),
        ir: typedIrForEntry(entry, typedIrContext),
        references: (refsIndex.get(entry.id) ?? [])
          .slice()
          .sort((a, b) => {
            if (a.edge_kind !== b.edge_kind) {
              return a.edge_kind.localeCompare(b.edge_kind);
            }
            if (a.to_id !== b.to_id) {
              return a.to_id.localeCompare(b.to_id);
            }
            return a.source_path.localeCompare(b.source_path);
          })
          .map((edge) => ({
            edge_kind: edge.edge_kind,
            to_id: edge.to_id,
            source_path: edge.source_path,
          })),
        ir_summary: {
          acceptance_scenarios: sortedUnique(summary.acceptance_scenarios),
          openapi_operations: sortedUnique(summary.openapi_operations),
          asyncapi_messages: sortedUnique(summary.asyncapi_messages),
          uds_types: sortedUnique(summary.uds_types),
          threat_actors: sortedUnique(summary.threat_actors),
          data_flows: sortedUnique(summary.data_flows),
          pii_categories: sortedUnique(summary.pii_categories),
          migration_adrs: sortedUnique(summary.migration_adrs),
        },
      };
    });

  const doc: ManifestM2Doc = {
    schema: "m2.phase6.manifest.v1",
    generated_from: "inventory+views",
    counts: {
      acceptance_scenarios: views.acceptance_scenarios.length,
      openapi_operations: views.openapi_operations.length,
      asyncapi_messages: views.asyncapi_messages.length,
      uds_types: views.uds_types.length,
      actors: views.actors.length,
      data_flows: views.data_flows.length,
      pii_categories: views.pii_categories.length,
      migration_adrs: views.migration_adrs.length,
    },
    entities,
  };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

function validateRtm(artifacts: EmittedArtifact[], inventory: InventoryFile): Phase6EmitterCheck {
  const rtm = artifacts.find((artifact) => artifact.path === "agent/rtm.csv");
  if (!rtm) {
    return {
      name: "rtm-validate",
      pass: false,
      detail: "Missing agent/rtm.csv artifact.",
    };
  }
  const lines = rtm.content.trimEnd().split("\n");
  const header = lines[0] ?? "";
  const expectedColumns = 11;
  const rowCount = lines.length - 1;
  if (rowCount !== inventory.entries.length) {
    return {
      name: "rtm-validate",
      pass: false,
      detail: `RTM rows mismatch: expected ${inventory.entries.length}, got ${rowCount}.`,
    };
  }
  if (header.split(",").length !== expectedColumns) {
    return {
      name: "rtm-validate",
      pass: false,
      detail: `RTM header columns mismatch: expected ${expectedColumns}.`,
    };
  }
  return {
    name: "rtm-validate",
    pass: true,
    detail: `RTM rows=${rowCount}, columns=${expectedColumns}.`,
  };
}

export function emitAllPhase6Scaffolds(
  inventory: InventoryFile,
  views: M2ViewBundle,
  refs: readonly RefEdge[] = [],
): Phase6EmitResult {
  const byId = byIdIndex(inventory.entries);
  const refsIndex = refsByFromId(refs);
  const userTypeFields = inventory.entries.filter((entry) => entry.entity_class === "user_type.field");
  const artifacts: EmittedArtifact[] = [];
  const checks: Phase6EmitterCheck[] = [];

  for (const emitterName of PHASE6_EMITTER_ORDER) {
    switch (emitterName) {
      case "manifest": {
        const manifestContent = renderManifest(inventory, views, byId, refsIndex);
        artifacts.push({
          path: "agent/manifest.m2.json",
          content: manifestContent,
        });
        artifacts.push({
          path: "agent/manifest.json",
          content: manifestContent,
        });
        break;
      }
      case "gherkin":
        artifacts.push(...emitGherkinScaffold(views.acceptance_scenarios));
        break;
      case "uds":
        artifacts.push(...emitUdsScaffold(views, byId, userTypeFields));
        break;
      case "openapi-incoming":
      case "openapi-outgoing":
        if (!artifacts.some((artifact) => artifact.path === "agent/contracts/openapi-incoming.json")) {
          artifacts.push(...emitOpenApiScaffold(views, byId));
        }
        break;
      case "asyncapi":
        artifacts.push(...emitAsyncApiScaffold(views));
        break;
      case "adr-scaffold":
        artifacts.push(...emitAdrScaffold(views));
        break;
      case "threat-model":
        artifacts.push(...emitThreatModelScaffold(views));
        break;
      case "dpia":
        artifacts.push(...emitDpiaScaffold(views));
        break;
      case "depgraph":
        artifacts.push(...emitDepgraphScaffold(inventory, refs, views));
        break;
      case "rtm":
        artifacts.push(...emitRtmScaffold(inventory, views));
        break;
      case "rtm-validate":
        checks.push(validateRtm(artifacts, inventory));
        break;
      default: {
        const exhaustive: never = emitterName;
        throw new Error(`Unhandled emitter ${String(exhaustive)}`);
      }
    }
  }

  artifacts.sort((a, b) => a.path.localeCompare(b.path));
  return { artifacts, checks };
}
