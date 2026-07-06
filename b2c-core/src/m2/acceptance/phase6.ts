import { sha256Text } from "../../utils/hash.js";
import type { InventoryFile, LintFile, RefEdge } from "../../types.js";
import { collectOpaqueInventoryIds, lintRawIdLeaksInDocTemplates } from "../../lint/id-leak.js";
import { asyncApiChannelForNamespace, parseExternalCallSourceId } from "../emitters/asyncapi.js";
import { SECURITY_REVIEW_BANNER } from "../emitters/threat-dpia.js";
import { emitAllPhase6Scaffolds } from "../emitters/index.js";
import { deriveOpenApiNamespaceSlug } from "../views/id-derivation.js";
import { buildM2Views } from "../views/index.js";

export interface M2AcceptanceResult {
  ok: boolean;
  checks: Array<{ name: string; pass: boolean; detail: string }>;
}

interface M2Phase6AcceptanceContext {
  lint: LintFile | null;
  lintLoadError: string | null;
}

function checkBijection(name: string, expected: number, actual: number, detail: string): M2AcceptanceResult["checks"][number] {
  return {
    name,
    pass: expected === actual,
    detail: `${detail}: expected=${expected}, actual=${actual}`,
  };
}

function checkUnique(name: string, values: string[], label: string): M2AcceptanceResult["checks"][number] {
  const unique = new Set(values);
  return {
    name,
    pass: unique.size === values.length,
    detail: `${label} unique=${unique.size}, total=${values.length}`,
  };
}

function artifactHashes(items: Array<{ path: string; content: string }>): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items) {
    map.set(item.path, sha256Text(item.content));
  }
  return map;
}

function compareArtifactSets(
  first: Map<string, string>,
  second: Map<string, string>,
): { pass: boolean; detail: string } {
  if (first.size !== second.size) {
    return { pass: false, detail: `artifact count changed: ${first.size} vs ${second.size}` };
  }
  for (const [path, hash] of first.entries()) {
    if (second.get(path) !== hash) {
      return { pass: false, detail: `artifact hash mismatch at ${path}` };
    }
  }
  return { pass: true, detail: `artifact hashes stable across ${first.size} files` };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function mapValuesSorted(map: Map<string, string[]>): Map<string, string[]> {
  const normalized = new Map<string, string[]>();
  for (const [key, values] of map.entries()) {
    normalized.set(key, sortedUnique(values));
  }
  return normalized;
}

function mapStringArrayEqual(left: Map<string, string[]>, right: Map<string, string[]>): boolean {
  if (left.size !== right.size) {
    return false;
  }
  const normalizedLeft = mapValuesSorted(left);
  const normalizedRight = mapValuesSorted(right);
  for (const [key, leftValues] of normalizedLeft.entries()) {
    const rightValues = normalizedRight.get(key);
    if (!rightValues || !arraysEqual(leftValues, rightValues)) {
      return false;
    }
  }
  return true;
}

function parseJsonArtifact(artifacts: Array<{ path: string; content: string }>, path: string): unknown {
  const artifact = artifacts.find((item) => item.path === path);
  if (!artifact) {
    return null;
  }
  try {
    return JSON.parse(artifact.content) as unknown;
  } catch {
    return null;
  }
}

function hasString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function hasStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function hasNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function csvCell(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      const next = line[index + 1];
      if (quoted && next === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      out.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  out.push(current);
  return out;
}

interface ManifestSummaryShape {
  acceptance_scenarios: string[];
  openapi_operations: string[];
  asyncapi_messages: string[];
  uds_types: string[];
  threat_actors: string[];
  data_flows: string[];
  pii_categories: string[];
  migration_adrs: string[];
}

const MANIFEST_SUMMARY_KEYS = [
  "acceptance_scenarios",
  "openapi_operations",
  "asyncapi_messages",
  "uds_types",
  "threat_actors",
  "data_flows",
  "pii_categories",
  "migration_adrs",
] as const;

function expectedSummaryMap(inventory: InventoryFile, views: ReturnType<typeof buildM2Views>): Map<string, ManifestSummaryShape> {
  const map = new Map<string, ManifestSummaryShape>();
  const ensure = (id: string): ManifestSummaryShape => {
    const current = map.get(id);
    if (current) {
      return current;
    }
    const created: ManifestSummaryShape = {
      acceptance_scenarios: [],
      openapi_operations: [],
      asyncapi_messages: [],
      uds_types: [],
      threat_actors: [],
      data_flows: [],
      pii_categories: [],
      migration_adrs: [],
    };
    map.set(id, created);
    return created;
  };

  for (const scenario of views.acceptance_scenarios) {
    ensure(scenario.workflow_ref).acceptance_scenarios.push(scenario.scenario_id);
  }
  for (const operation of views.openapi_operations) {
    ensure(operation.source_id).openapi_operations.push(operation.operation_id);
  }
  for (const message of views.asyncapi_messages) {
    ensure(message.source_id).asyncapi_messages.push(message.message_id);
  }
  for (const udsType of views.uds_types) {
    ensure(udsType.user_type_ref).uds_types.push(udsType.id);
  }
  for (const actor of views.actors) {
    for (const role of actor.privacy_role_refs) {
      ensure(role).threat_actors.push(actor.actor_id);
    }
  }
  for (const flow of views.data_flows) {
    ensure(flow.source_id).data_flows.push(flow.flow_id);
  }
  for (const pii of views.pii_categories) {
    ensure(pii.field_id).pii_categories.push(pii.category);
  }
  for (const adr of views.migration_adrs) {
    const prefix = "entity_class:";
    if (!adr.entity_id.startsWith(prefix)) {
      continue;
    }
    const className = adr.entity_id.slice(prefix.length);
    for (const entry of inventory.entries) {
      if (entry.entity_class === className) {
        ensure(entry.id).migration_adrs.push(adr.adr_id);
      }
    }
  }

  for (const value of map.values()) {
    for (const key of MANIFEST_SUMMARY_KEYS) {
      value[key] = sortedUnique(value[key]);
    }
  }
  return map;
}

function extractOpenApiOperationIds(doc: unknown): { operationIds: string[]; hasSourceMetadata: boolean } {
  if (!isRecord(doc) || !isRecord(doc.paths)) {
    return { operationIds: [], hasSourceMetadata: false };
  }
  const operationIds: string[] = [];
  let hasSourceMetadata = true;
  for (const pathValue of Object.values(doc.paths)) {
    if (!isRecord(pathValue)) {
      continue;
    }
    for (const operation of Object.values(pathValue)) {
      if (!isRecord(operation) || typeof operation.operationId !== "string") {
        continue;
      }
      operationIds.push(operation.operationId);
      const metadata = operation["x-b2c"];
      if (!isRecord(metadata) || typeof metadata.source_id !== "string") {
        hasSourceMetadata = false;
      }
    }
  }
  return { operationIds: sortedUnique(operationIds), hasSourceMetadata };
}

function extractOpenApiOperationSources(doc: unknown): Array<{ operationId: string; sourceId: string }> {
  if (!isRecord(doc) || !isRecord(doc.paths)) {
    return [];
  }
  const pairs: Array<{ operationId: string; sourceId: string }> = [];
  for (const pathValue of Object.values(doc.paths)) {
    if (!isRecord(pathValue)) {
      continue;
    }
    for (const operation of Object.values(pathValue)) {
      if (!isRecord(operation) || typeof operation.operationId !== "string") {
        continue;
      }
      const metadata = operation["x-b2c"];
      if (!isRecord(metadata) || typeof metadata.source_id !== "string") {
        continue;
      }
      pairs.push({ operationId: operation.operationId, sourceId: metadata.source_id });
    }
  }
  return pairs.sort((left, right) => {
    if (left.operationId !== right.operationId) {
      return left.operationId.localeCompare(right.operationId);
    }
    return left.sourceId.localeCompare(right.sourceId);
  });
}

function refKey(edge: { edge_kind: string; to_id: string; source_path: string }): string {
  return `${edge.edge_kind}|${edge.to_id}|${edge.source_path}`;
}

function sortedRefKeys(edges: Array<{ edge_kind: string; to_id: string; source_path: string }>): string[] {
  return edges.map((edge) => refKey(edge)).sort((a, b) => a.localeCompare(b));
}

function parseManifestReferences(value: unknown): Array<{ edge_kind: string; to_id: string; source_path: string }> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(isRecord)
    .map((item) => ({
      edge_kind: typeof item.edge_kind === "string" ? item.edge_kind : "",
      to_id: typeof item.to_id === "string" ? item.to_id : "",
      source_path: typeof item.source_path === "string" ? item.source_path : "",
    }))
    .filter((item) => item.edge_kind.length > 0 && item.to_id.length > 0 && item.source_path.length > 0);
}

function deepCloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function expectedManifestEntityTriples(inventory: InventoryFile): string[] {
  return inventory.entries
    .map((entry) => `${entry.id}|${entry.pointer}|${entry.entity_class}`)
    .sort((a, b) => a.localeCompare(b));
}

function extractManifestEntityTriples(entities: unknown[]): string[] {
  return entities
    .filter(isRecord)
    .map((entity) => {
      const id = typeof entity.id === "string" ? entity.id : "";
      const pointer = typeof entity.pointer === "string" ? entity.pointer : "";
      const entityClass = typeof entity.entity_class === "string" ? entity.entity_class : "";
      return `${id}|${pointer}|${entityClass}`;
    })
    .sort((a, b) => a.localeCompare(b));
}

function hasManifestEntityIndexParity(entities: unknown[], inventory: InventoryFile): boolean {
  return arraysEqual(extractManifestEntityTriples(entities), expectedManifestEntityTriples(inventory));
}

function buildRefsByFromId(refs: readonly RefEdge[]): Map<string, RefEdge[]> {
  const refsByFromId = new Map<string, RefEdge[]>();
  for (const edge of refs) {
    const bucket = refsByFromId.get(edge.from_id) ?? [];
    bucket.push(edge);
    refsByFromId.set(edge.from_id, bucket);
  }
  return refsByFromId;
}

function hasManifestRefsParity(entities: unknown[], refsByFromId: Map<string, RefEdge[]>): boolean {
  for (const rawEntity of entities) {
    if (!isRecord(rawEntity) || typeof rawEntity.id !== "string") {
      return false;
    }
    const expectedRefs = sortedRefKeys(
      (refsByFromId.get(rawEntity.id) ?? []).map((edge) => ({
        edge_kind: edge.edge_kind,
        to_id: edge.to_id,
        source_path: edge.source_path,
      })),
    );
    const actualRefs = sortedRefKeys(parseManifestReferences(rawEntity.references));
    if (!arraysEqual(actualRefs, expectedRefs)) {
      return false;
    }
  }
  return true;
}

function extractOpenApiPairKeys(doc: unknown): string[] {
  return extractOpenApiOperationSources(doc)
    .map((pair) => `${pair.operationId}|${pair.sourceId}`)
    .sort((a, b) => a.localeCompare(b));
}

function extractManifestOpenApiPairKeys(manifestDoc: unknown): string[] {
  const pairSet = new Set<string>();
  if (!isRecord(manifestDoc) || !Array.isArray(manifestDoc.entities)) {
    return [];
  }
  for (const entity of manifestDoc.entities) {
    if (!isRecord(entity) || typeof entity.id !== "string" || !isRecord(entity.ir_summary)) {
      continue;
    }
    const operationIds = asStringArray(entity.ir_summary.openapi_operations);
    for (const operationId of operationIds) {
      pairSet.add(`${operationId}|${entity.id}`);
    }
  }
  return [...pairSet].sort((a, b) => a.localeCompare(b));
}

export function runM2Phase6AcceptanceScaffold(
  inventory: InventoryFile,
  refs: readonly RefEdge[] = [],
  context: M2Phase6AcceptanceContext = { lint: null, lintLoadError: null },
): M2AcceptanceResult {
  const views = buildM2Views(inventory);
  const inventoryById = new Map(inventory.entries.map((entry) => [entry.id, entry]));
  const workflowCount = inventory.entries.filter(
    (entry) => entry.entity_class === "workflow" || entry.entity_class === "element_definition.workflow",
  ).length;
  const apiEventCount = inventory.entries.filter((entry) => entry.entity_class === "api_event").length;
  const externalCalls = inventory.entries.filter((entry) => entry.entity_class === "external_http_call");
  const nonStreamExternal = externalCalls.filter((entry) => entry.meta?.data_type !== "stream").length;
  const streamExternal = externalCalls.filter((entry) => entry.meta?.data_type === "stream").length;
  const userTypeCount = inventory.entries.filter((entry) => entry.entity_class === "user_type").length;
  const privacyRoleCount = inventory.entries.filter((entry) => entry.entity_class === "privacy_role").length;

  const checks: M2AcceptanceResult["checks"] = [
    checkBijection(
      "bijection:acceptance_scenario",
      workflowCount,
      views.acceptance_scenarios.length,
      "workflow->acceptance_scenario",
    ),
    checkBijection(
      "bijection:openapi_operation",
      apiEventCount + nonStreamExternal,
      views.openapi_operations.length,
      "api_event + non_stream_external_http_call -> openapi_operation",
    ),
    checkBijection(
      "bijection:asyncapi_message",
      streamExternal,
      views.asyncapi_messages.length,
      "stream_external_http_call -> asyncapi_message",
    ),
    checkBijection("bijection:uds_type", userTypeCount, views.uds_types.length, "user_type->uds_type"),
    checkBijection("bijection:threat_actor", privacyRoleCount, views.actors.length, "privacy_role->threat_actor"),
    checkBijection("bijection:data_flow", externalCalls.length, views.data_flows.length, "external_http_call->data_flow"),
    checkUnique(
      "mapping:openapi_source_unique",
      views.openapi_operations.map((item) => `${item.source_kind}:${item.source_id}`),
      "openapi source mapping",
    ),
    checkUnique(
      "mapping:asyncapi_source_unique",
      views.asyncapi_messages.map((item) => item.source_id),
      "asyncapi source mapping",
    ),
    checkUnique(
      "mapping:data_flow_source_unique",
      views.data_flows.map((item) => item.source_id),
      "data_flow source mapping",
    ),
    checkUnique(
      "mapping:actor_role_unique",
      views.actors.flatMap((item) => item.privacy_role_refs),
      "actor privacy_role mapping",
    ),
    checkUnique(
      "mapping:uds_user_type_unique",
      views.uds_types.map((item) => item.user_type_ref),
      "uds user_type mapping",
    ),
  ];

  const first = emitAllPhase6Scaffolds(inventory, views, refs);
  const second = emitAllPhase6Scaffolds(inventory, views, refs);
  const opaqueIds = collectOpaqueInventoryIds(inventory.entries.map((entry) => entry.id));
  const idLeakFindings = lintRawIdLeaksInDocTemplates(first.artifacts, opaqueIds);
  checks.push({
    name: "lint:id_leak_docs_templates",
    pass: idLeakFindings.length === 0,
    detail:
      idLeakFindings.length === 0
        ? "no raw ID leaks in generated docs/templates (within lint scope)"
        : idLeakFindings
            .slice(0, 5)
            .map((finding) => `${finding.path}:${finding.line} token=${finding.token}`)
            .join("; "),
  });
  const lintFile = context.lint;
  const lintLoadError = context.lintLoadError;
  const lintIssues = lintFile?.suspicious_public_integration_keys ?? [];
  const lintPass = lintLoadError === null && lintFile !== null && lintFile.status === "pass" && lintIssues.length === 0;
  checks.push({
    name: "gate:secrets_redaction_lint",
    pass: lintPass,
    detail:
      lintLoadError !== null
        ? `failed to load target state/lint.json: ${lintLoadError}`
        : lintFile === null
          ? "missing target state/lint.json"
          : lintFile.status === "pass" && lintIssues.length === 0
            ? "state/lint.json passed (status=pass, suspicious_public_integration_keys=0)"
            : `state/lint.json failed: status=${lintFile.status}, suspicious_public_integration_keys=${lintIssues
                .slice(0, 5)
                .map((issue) => issue.key)
                .join(",")}`,
  });

  const manifestDoc = parseJsonArtifact(first.artifacts, "agent/manifest.m2.json");
  const manifestAliasDoc = parseJsonArtifact(first.artifacts, "agent/manifest.json");
  const manifestPrimaryArtifact = first.artifacts.find((artifact) => artifact.path === "agent/manifest.m2.json");
  const manifestAliasArtifact = first.artifacts.find((artifact) => artifact.path === "agent/manifest.json");
  checks.push({
    name: "manifest:alias_presence",
    pass: Boolean(manifestPrimaryArtifact) && Boolean(manifestAliasArtifact),
    detail:
      manifestPrimaryArtifact && manifestAliasArtifact
        ? "manifest.m2.json and manifest.json are both emitted"
        : "missing one of manifest.m2.json / manifest.json",
  });
  checks.push({
    name: "manifest:alias_parity",
    pass:
      manifestPrimaryArtifact !== undefined &&
      manifestAliasArtifact !== undefined &&
      manifestPrimaryArtifact.content === manifestAliasArtifact.content,
    detail:
      manifestPrimaryArtifact && manifestAliasArtifact && manifestPrimaryArtifact.content === manifestAliasArtifact.content
        ? "manifest alias content is byte-identical"
        : "manifest alias content mismatch",
  });
  if (!isRecord(manifestDoc)) {
    checks.push({
      name: "manifest:parse",
      pass: false,
      detail: "agent/manifest.m2.json missing or invalid JSON",
    });
  } else {
    const expectedCounts = {
      acceptance_scenarios: views.acceptance_scenarios.length,
      openapi_operations: views.openapi_operations.length,
      asyncapi_messages: views.asyncapi_messages.length,
      uds_types: views.uds_types.length,
      actors: views.actors.length,
      data_flows: views.data_flows.length,
      pii_categories: views.pii_categories.length,
      migration_adrs: views.migration_adrs.length,
    };
    const manifestCounts = isRecord(manifestDoc.counts) ? manifestDoc.counts : null;
    const hasCounts =
      manifestCounts !== null && Object.entries(expectedCounts).every(([key, value]) => manifestCounts[key] === value);
    checks.push({
      name: "manifest:counts",
      pass: hasCounts,
      detail: hasCounts ? "manifest counts aligned with view bundle" : "manifest counts mismatch",
    });

    const entities = Array.isArray(manifestDoc.entities) ? manifestDoc.entities : [];
    const manifestIds = entities
      .filter(isRecord)
      .map((entity) => entity.id)
      .filter((id): id is string => typeof id === "string");
    const manifestTriples = extractManifestEntityTriples(entities);
    const expectedTriples = expectedManifestEntityTriples(inventory);
    checks.push({
      name: "manifest:entity_index",
      pass: arraysEqual(manifestTriples, expectedTriples),
      detail: `manifest entities=${manifestIds.length}, inventory entries=${inventory.entries.length}`,
    });

    const recordKeySet = new Set(expectedTriples);
    const expectedSummary = expectedSummaryMap(inventory, views);
    let identityPass = true;
    let completenessPass = true;
    let typedIrPass = true;
    let typedIrCriticalPass = true;
    let typedIrCapabilityPass = true;
    let workflowActionTypePass = true;
    let refsParityPass = true;
    const refsByFromId = buildRefsByFromId(refs);
    for (const rawEntity of entities) {
      if (!isRecord(rawEntity) || typeof rawEntity.id !== "string") {
        identityPass = false;
        completenessPass = false;
        typedIrPass = false;
        break;
      }
      const pointer = typeof rawEntity.pointer === "string" ? rawEntity.pointer : "";
      const entityClass = typeof rawEntity.entity_class === "string" ? rawEntity.entity_class : "";
      if (!recordKeySet.has(`${rawEntity.id}|${pointer}|${entityClass}`)) {
        identityPass = false;
        break;
      }
      const typedIr = rawEntity.ir;
      if (!isRecord(typedIr) || typeof typedIr.kind !== "string" || typedIr.kind !== entityClass) {
        typedIrPass = false;
      } else {
        switch (entityClass) {
          case "privacy_role":
            const conditionCoverage = isRecord(typedIr.condition_ast_coverage)
              ? typedIr.condition_ast_coverage
              : null;
            const unknownNodeCount = conditionCoverage?.unknown_node_count;
            if (
              !hasString(typedIr.role_id) ||
              !hasString(typedIr.user_type_id) ||
              !Array.isArray(typedIr.condition_accessors) ||
              typedIr.condition_typed_ast === null ||
              conditionCoverage === null ||
              conditionCoverage.schema !== "b2c.message_tree_ast_coverage.v1" ||
              !hasNumber(conditionCoverage.node_count) ||
              !hasNumber(conditionCoverage.max_depth) ||
              !hasNumber(conditionCoverage.operation_count) ||
              !hasNumber(conditionCoverage.accessor_count) ||
              !isRecord(conditionCoverage.op_counts) ||
              !isRecord(conditionCoverage.accessor_kind_counts) ||
              !hasNumber(unknownNodeCount) ||
              unknownNodeCount !== 0
            ) {
              typedIrCriticalPass = false;
            }
            break;
          case "workflow":
          case "element_definition.workflow":
            if (
              !hasStringOrNull(typedIr.trigger_type) ||
              !hasStringOrNull(typedIr.trigger_condition_type) ||
              !hasStringOrNull(typedIr.trigger_element_id) ||
              !hasNumber(typedIr.action_count)
            ) {
              typedIrCriticalPass = false;
            }
            break;
          case "workflow.action":
          case "element_definition.action":
            if (!hasStringOrNull(typedIr.action_type)) {
              typedIrCriticalPass = false;
            }
            break;
          case "api_event.action":
            if (
              !hasStringOrNull(typedIr.action_type) ||
              !hasStringOrNull(typedIr.scheduled_api_event_id) ||
              !(
                typedIr.schedule_in_seconds === null ||
                (typeof typedIr.schedule_in_seconds === "number" && Number.isFinite(typedIr.schedule_in_seconds))
              )
            ) {
              typedIrCriticalPass = false;
            }
            break;
          case "api_event":
            if (
              !hasString(typedIr.method) ||
              !hasString(typedIr.path) ||
              !hasNumber(typedIr.action_count) ||
              !hasStringOrNull(typedIr.event_type) ||
              !hasStringOrNull(typedIr.data_type) ||
              !(
                typedIr.parameter_count === null ||
                (typeof typedIr.parameter_count === "number" && Number.isFinite(typedIr.parameter_count))
              ) ||
              !(
                typedIr.waiting_for_data === null ||
                typeof typedIr.waiting_for_data === "boolean"
              ) ||
              !(
                typedIr.auth_unecessary === null ||
                typeof typedIr.auth_unecessary === "boolean"
              ) ||
              !(
                typedIr.ignore_privacy_rules === null ||
                typeof typedIr.ignore_privacy_rules === "boolean"
              )
            ) {
              typedIrCriticalPass = false;
            }
            break;
          case "external_http_call":
            if (
              !hasString(typedIr.method) ||
              !hasString(typedIr.namespace_id) ||
              !hasString(typedIr.call_id) ||
              !hasStringOrNull(typedIr.url) ||
              !hasStringOrNull(typedIr.data_type)
            ) {
              typedIrCriticalPass = false;
            }
            break;
          case "external_http_namespace":
          case "oauth_namespace":
            if (!hasString(typedIr.auth_kind)) {
              typedIrCriticalPass = false;
            }
            break;
          case "user_type":
            if (!hasStringOrNull(typedIr.display)) {
              typedIrCriticalPass = false;
            }
            break;
          case "user_type.field":
            if (
              !hasString(typedIr.field_id) ||
              !hasStringOrNull(typedIr.type) ||
              !hasStringOrNull(typedIr.storage_path) ||
              !hasStringOrNull(typedIr.mime_type)
            ) {
              typedIrCriticalPass = false;
            }
            break;
          case "page":
          case "element":
          case "element_definition":
            if (!hasStringOrNull(typedIr.type) || !hasStringOrNull(typedIr.style_ref)) {
              typedIrCriticalPass = false;
            }
            break;
          case "style_ref":
          case "style":
            if (!hasStringOrNull(typedIr.style_id)) {
              typedIrCriticalPass = false;
            }
            break;
          case "custom_state":
            if (!hasStringOrNull(typedIr.state_key)) {
              typedIrCriticalPass = false;
            }
            break;
          default:
            break;
        }
      }
      const typedIrRecord = typedIr as Record<string, unknown>;
      if (
        entityClass === "workflow.action" ||
        entityClass === "element_definition.action" ||
        entityClass === "api_event.action"
      ) {
        const inventoryAction = inventoryById.get(rawEntity.id);
        const expectedActionType =
          inventoryAction && isRecord(inventoryAction.meta) && typeof inventoryAction.meta.action_type === "string"
            ? inventoryAction.meta.action_type
            : null;
        const typedIrActionType = typedIrRecord.action_type;
        const actualActionType = typeof typedIrActionType === "string" ? typedIrActionType : null;
        if (actualActionType !== expectedActionType) {
          workflowActionTypePass = false;
        }
      }
      const capabilities = Array.isArray(typedIrRecord.capabilities)
        ? typedIrRecord.capabilities.filter((item): item is string => typeof item === "string")
        : [];
      const requiresAdrs = Array.isArray(typedIrRecord.requires_adrs)
        ? typedIrRecord.requires_adrs.filter((item): item is string => typeof item === "string")
        : [];
      if (!Array.isArray(typedIrRecord.capabilities) || capabilities.length !== typedIrRecord.capabilities.length) {
        typedIrCapabilityPass = false;
      }
      if (!Array.isArray(typedIrRecord.requires_adrs)) {
        typedIrCapabilityPass = false;
      }
      if (Array.isArray(typedIrRecord.requires_adrs) && requiresAdrs.length !== typedIrRecord.requires_adrs.length) {
        typedIrCapabilityPass = false;
      }
      if (entityClass === "oauth_namespace" && !capabilities.includes("auth.oauth2_user_flow")) {
        typedIrCapabilityPass = false;
      }
      if (
        entityClass === "privacy_role" &&
        !capabilities.some(
          (capability) => capability === "rls.cross_table_join" || capability === "rls.recursive_user_type_walk",
        )
      ) {
        typedIrCapabilityPass = false;
      }
      if (!requiresAdrs.every((value) => typeof value === "string")) {
        typedIrCapabilityPass = false;
      }
      const expectedRefs = sortedRefKeys(
        (refsByFromId.get(rawEntity.id) ?? []).map((edge) => ({
          edge_kind: edge.edge_kind,
          to_id: edge.to_id,
          source_path: edge.source_path,
        })),
      );
      const actualRefs = sortedRefKeys(parseManifestReferences(rawEntity.references));
      if (!arraysEqual(actualRefs, expectedRefs)) {
        refsParityPass = false;
      }
      const anchors = asStringArray(rawEntity.doc_anchors);
      if (anchors.length === 0 || !anchors.includes(`agent/rtm.csv#entity_id:${rawEntity.id}`)) {
        completenessPass = false;
      }

      const summary = isRecord(rawEntity.ir_summary) ? rawEntity.ir_summary : {};
      const summaryMap: Record<string, unknown> = summary;
      const expected: ManifestSummaryShape = expectedSummary.get(rawEntity.id) ?? {
        acceptance_scenarios: [],
        openapi_operations: [],
        asyncapi_messages: [],
        uds_types: [],
        threat_actors: [],
        data_flows: [],
        pii_categories: [],
        migration_adrs: [],
      };
      for (const key of MANIFEST_SUMMARY_KEYS) {
        const actualValues = sortedUnique(asStringArray(summaryMap[key]));
        const expectedValues = expected[key];
        if (!arraysEqual(actualValues, expectedValues)) {
          completenessPass = false;
          break;
        }
      }
      if (!completenessPass) {
        break;
      }
    }
    checks.push({
      name: "manifest:entity_identity",
      pass: identityPass,
      detail: identityPass ? "manifest entity id/pointer/class matched inventory" : "manifest identity mismatch",
    });
    checks.push({
      name: "manifest:completeness",
      pass: completenessPass,
      detail: completenessPass
        ? "manifest anchors and ir_summary complete for all entities"
        : "manifest missing anchors or ir_summary mappings",
    });
    checks.push({
      name: "manifest:typed_ir_presence",
      pass: typedIrPass,
      detail: typedIrPass
        ? "manifest typed ir payload present and aligned for all entities"
        : "manifest typed ir payload missing or kind mismatch",
    });
    checks.push({
      name: "manifest:typed_ir_critical_fields",
      pass: typedIrCriticalPass,
      detail: typedIrCriticalPass
        ? "discriminated typed ir fields present for privacy/workflow/api/external/user/page-element/style/custom_state classes"
        : "discriminated typed ir fields missing for at least one targeted entity class",
    });
    checks.push({
      name: "manifest:typed_ir_capabilities",
      pass: typedIrCapabilityPass,
      detail: typedIrCapabilityPass
        ? "typed ir capabilities/requires_adrs fields are present and include oauth2/rls near-term arms"
        : "typed ir capabilities/requires_adrs missing or missing oauth2/rls near-term arms",
    });
    checks.push({
      name: "manifest:workflow_action_type_mapping",
      pass: workflowActionTypePass,
      detail: workflowActionTypePass
        ? "workflow.action typed ir action_type matches inventory meta.action_type"
        : "workflow.action typed ir action_type does not match inventory meta.action_type",
    });
    checks.push({
      name: "manifest:refs_cross_validation",
      pass: refsParityPass,
      detail: refsParityPass
        ? "manifest references are in parity with index/refs.json"
        : "manifest references differ from index/refs.json for at least one entity",
    });

    if (entities.length === 0) {
      checks.push({
        name: "synthetic:manifest_refs_drift_detection",
        pass: false,
        detail: "cannot run synthetic refs drift detector without manifest entities",
      });
      checks.push({
        name: "synthetic:manifest_entity_index_drift_detection",
        pass: false,
        detail: "cannot run synthetic entity-index drift detector without manifest entities",
      });
    } else {
      const tamperedRefsEntities = deepCloneJson(entities);
      const firstEntity = tamperedRefsEntities.find(
        (entity): entity is Record<string, unknown> => isRecord(entity) && typeof entity.id === "string",
      );
      if (firstEntity) {
        const currentReferences = parseManifestReferences(firstEntity.references);
        if (currentReferences.length > 0) {
          firstEntity.references = currentReferences.slice(1);
        } else {
          firstEntity.references = [{ edge_kind: "synthetic.drift", to_id: "synthetic:missing", source_path: "$.synthetic" }];
        }
      }
      const refsDriftDetected = !hasManifestRefsParity(tamperedRefsEntities, refsByFromId);
      checks.push({
        name: "synthetic:manifest_refs_drift_detection",
        pass: refsDriftDetected,
        detail: refsDriftDetected
          ? "tampered manifest references were detected as parity mismatch"
          : "tampered manifest references were not detected by refs parity detector",
      });

      const tamperedEntityIndexEntities = deepCloneJson(entities);
      const identityTarget = tamperedEntityIndexEntities.find(
        (entity): entity is Record<string, unknown> => isRecord(entity) && typeof entity.id === "string",
      );
      if (identityTarget) {
        identityTarget.pointer =
          typeof identityTarget.pointer === "string" ? `${identityTarget.pointer}#synthetic-drift` : "#synthetic-drift";
      }
      const entityIndexDriftDetected = !hasManifestEntityIndexParity(tamperedEntityIndexEntities, inventory);
      checks.push({
        name: "synthetic:manifest_entity_index_drift_detection",
        pass: entityIndexDriftDetected,
        detail: entityIndexDriftDetected
          ? "tampered manifest entity identity triple was detected as index mismatch"
          : "tampered manifest entity identity triple was not detected by entity-index detector",
      });
    }
  }
  checks.push({
    name: "manifest:alias_parse",
    pass: isRecord(manifestAliasDoc),
    detail: isRecord(manifestAliasDoc) ? "agent/manifest.json parses as JSON" : "agent/manifest.json invalid JSON",
  });

  const incomingOpenApi = parseJsonArtifact(first.artifacts, "agent/contracts/openapi-incoming.json");
  const outgoingOpenApi = parseJsonArtifact(first.artifacts, "agent/contracts/openapi-outgoing.json");
  const artifactPathSet = new Set(first.artifacts.map((artifact) => artifact.path));
  const requiredArtifacts = [
    "agent/manifest.m2.json",
    "agent/manifest.json",
    "agent/rtm.csv",
    "agent/contracts/openapi-incoming.json",
    "agent/contracts/openapi-incoming.yaml",
    "agent/contracts/openapi-outgoing.json",
    "agent/contracts/openapi-outgoing.yaml",
    "agent/contracts/asyncapi.json",
    "agent/acceptance/_index.yaml",
    "agent/acceptance/_fixtures/users.yaml",
    "agent/schema/uds.json",
    "agent/schema/uds.yaml",
    "agent/schema/uds.prisma",
    "agent/schema/uds.ddl.sql",
    "agent/schema/uds.graphql",
    "agent/schema/uds.types.ts",
    "agent/schema/rls.sql",
    "agent/schema/migrations/0001_uds_scaffold.sql",
    "agent/depgraph.json",
    "agent/adr-index.json",
    "agent/security/threat-index.json",
    "agent/security/dpia-index.json",
    "docs/security/threat-model.md",
    "docs/privacy/dpia-lite.md",
  ];
  const missingRequiredArtifacts = requiredArtifacts.filter((path) => !artifactPathSet.has(path));
  checks.push({
    name: "artifact:emitter_presence",
    pass: missingRequiredArtifacts.length === 0,
    detail:
      missingRequiredArtifacts.length === 0
        ? `required artifacts present (${requiredArtifacts.length})`
        : `missing artifacts: ${missingRequiredArtifacts.join(", ")}`,
  });
  const threatDocArtifact = first.artifacts.find((artifact) => artifact.path === "docs/security/threat-model.md");
  const dpiaDocArtifact = first.artifacts.find((artifact) => artifact.path === "docs/privacy/dpia-lite.md");
  const threatHasBanner = threatDocArtifact?.content.includes(SECURITY_REVIEW_BANNER) ?? false;
  const dpiaHasBanner = dpiaDocArtifact?.content.includes(SECURITY_REVIEW_BANNER) ?? false;
  checks.push({
    name: "gate:threat_dpia_banner",
    pass: threatHasBanner && dpiaHasBanner,
    detail: `threat_banner=${threatHasBanner}, dpia_banner=${dpiaHasBanner}`,
  });
  const incomingNamespaceYamlCount = first.artifacts.filter(
    (artifact) =>
      artifact.path.startsWith("agent/contracts/openapi-incoming/") &&
      artifact.path.endsWith(".yaml") &&
      artifact.path !== "agent/contracts/openapi-incoming.yaml",
  ).length;
  const outgoingNamespaceYamlCount = first.artifacts.filter(
    (artifact) =>
      artifact.path.startsWith("agent/contracts/openapi-outgoing/") &&
      artifact.path.endsWith(".yaml") &&
      artifact.path !== "agent/contracts/openapi-outgoing.yaml",
  ).length;
  const incomingExpectedOps = sortedUnique(
    views.openapi_operations
      .filter((operation) => operation.source_kind === "api_event")
      .map((operation) => operation.operation_id),
  );
  const outgoingExpectedOps = sortedUnique(
    views.openapi_operations
      .filter((operation) => operation.source_kind === "external_http_call")
      .map((operation) => operation.operation_id),
  );
  const incomingExpectedNamespaceFiles = sortedUnique(
    views.openapi_operations
      .filter((operation) => operation.source_kind === "api_event")
      .map((operation) => `agent/contracts/openapi-incoming/${deriveOpenApiNamespaceSlug("api_event", operation.source_id)}.yaml`),
  );
  const outgoingExpectedNamespaceFiles = sortedUnique(
    views.openapi_operations
      .filter((operation) => operation.source_kind === "external_http_call")
      .map(
        (operation) =>
          `agent/contracts/openapi-outgoing/${deriveOpenApiNamespaceSlug("external_http_call", operation.source_id)}.yaml`,
      ),
  );
  const incomingActualNamespaceFiles = sortedUnique(
    first.artifacts
      .map((artifact) => artifact.path)
      .filter(
        (path) =>
          path.startsWith("agent/contracts/openapi-incoming/") &&
          path.endsWith(".yaml") &&
          path !== "agent/contracts/openapi-incoming.yaml",
      ),
  );
  const outgoingActualNamespaceFiles = sortedUnique(
    first.artifacts
      .map((artifact) => artifact.path)
      .filter(
        (path) =>
          path.startsWith("agent/contracts/openapi-outgoing/") &&
          path.endsWith(".yaml") &&
          path !== "agent/contracts/openapi-outgoing.yaml",
      ),
  );
  checks.push({
    name: "artifact:openapi_namespace_yaml_presence",
    pass:
      arraysEqual(incomingActualNamespaceFiles, incomingExpectedNamespaceFiles) &&
      arraysEqual(outgoingActualNamespaceFiles, outgoingExpectedNamespaceFiles) &&
      (incomingExpectedOps.length === 0 || incomingNamespaceYamlCount > 0) &&
      (outgoingExpectedOps.length === 0 || outgoingNamespaceYamlCount > 0),
    detail: `incoming namespace yaml=${incomingNamespaceYamlCount}/${incomingExpectedNamespaceFiles.length}, outgoing namespace yaml=${outgoingNamespaceYamlCount}/${outgoingExpectedNamespaceFiles.length}`,
  });
  const featureCount = first.artifacts.filter(
    (artifact) => artifact.path.startsWith("agent/acceptance/") && artifact.path.endsWith(".feature"),
  ).length;
  checks.push({
    name: "artifact:gherkin_bijection",
    pass: featureCount === views.acceptance_scenarios.length,
    detail: `feature files=${featureCount}, scenarios=${views.acceptance_scenarios.length}`,
  });
  const adrCount = first.artifacts.filter(
    (artifact) => artifact.path.startsWith("docs/adr/") && artifact.path.endsWith(".md"),
  ).length;
  checks.push({
    name: "artifact:adr_bijection",
    pass: adrCount === views.migration_adrs.length,
    detail: `adr files=${adrCount}, migration_adrs=${views.migration_adrs.length}`,
  });
  const incomingExtract = extractOpenApiOperationIds(incomingOpenApi);
  const outgoingExtract = extractOpenApiOperationIds(outgoingOpenApi);
  checks.push({
    name: "artifact:openapi_integrity",
    pass:
      arraysEqual(incomingExtract.operationIds, incomingExpectedOps) &&
      arraysEqual(outgoingExtract.operationIds, outgoingExpectedOps) &&
      incomingExtract.hasSourceMetadata &&
      outgoingExtract.hasSourceMetadata,
    detail: `incoming ops=${incomingExtract.operationIds.length}, outgoing ops=${outgoingExtract.operationIds.length}`,
  });
  const expectedPairKeys = views.openapi_operations
    .map((operation) => `${operation.operation_id}|${operation.source_id}`)
    .sort((a, b) => a.localeCompare(b));
  const actualPairKeys = [...extractOpenApiPairKeys(incomingOpenApi), ...extractOpenApiPairKeys(outgoingOpenApi)].sort((a, b) =>
    a.localeCompare(b),
  );
  const manifestPairKeys = extractManifestOpenApiPairKeys(manifestDoc);
  checks.push({
    name: "gate:openapi_ir_roundtrip",
    pass: arraysEqual(actualPairKeys, expectedPairKeys) && arraysEqual(manifestPairKeys, expectedPairKeys),
    detail: `pairs expected=${expectedPairKeys.length}, openapi=${actualPairKeys.length}, manifest=${manifestPairKeys.length}`,
  });

  if (expectedPairKeys.length === 0) {
    checks.push({
      name: "synthetic:openapi_ir_roundtrip_drift_detection",
      pass: false,
      detail: "cannot run synthetic openapi roundtrip drift detector without expected operation/source pairs",
    });
  } else {
    const tamperedIncoming = deepCloneJson(incomingOpenApi);
    const tamperedOutgoing = deepCloneJson(outgoingOpenApi);
    let tampered = false;
    const docs = [tamperedIncoming, tamperedOutgoing];
    for (const doc of docs) {
      if (!isRecord(doc) || !isRecord(doc.paths)) {
        continue;
      }
      for (const pathValue of Object.values(doc.paths)) {
        if (!isRecord(pathValue)) {
          continue;
        }
        for (const operation of Object.values(pathValue)) {
          if (!isRecord(operation) || typeof operation.operationId !== "string") {
            continue;
          }
          const metadata = operation["x-b2c"];
          if (!isRecord(metadata) || typeof metadata.source_id !== "string") {
            continue;
          }
          metadata.source_id = `${metadata.source_id}#synthetic-drift`;
          tampered = true;
          break;
        }
        if (tampered) {
          break;
        }
      }
      if (tampered) {
        break;
      }
    }
    const tamperedActualPairKeys = [...extractOpenApiPairKeys(tamperedIncoming), ...extractOpenApiPairKeys(tamperedOutgoing)].sort(
      (a, b) => a.localeCompare(b),
    );
    const openApiDriftDetected = tampered && !arraysEqual(tamperedActualPairKeys, expectedPairKeys);
    checks.push({
      name: "synthetic:openapi_ir_roundtrip_drift_detection",
      pass: openApiDriftDetected,
      detail: openApiDriftDetected
        ? "tampered openapi operation/source pairing was detected by roundtrip gate"
        : "tampered openapi operation/source pairing was not detected by roundtrip gate",
    });
  }

  const asyncApiDoc = parseJsonArtifact(first.artifacts, "agent/contracts/asyncapi.json");
  if (!isRecord(asyncApiDoc) || !isRecord(asyncApiDoc.components) || !isRecord(asyncApiDoc.components.messages)) {
    checks.push({
      name: "artifact:asyncapi_integrity",
      pass: false,
      detail: "asyncapi scaffold missing components.messages",
    });
    checks.push({
      name: "gate:asyncapi_namespace_depth",
      pass: false,
      detail: "cannot evaluate asyncapi namespace gate without valid asyncapi components.messages",
    });
    checks.push({
      name: "synthetic:asyncapi_namespace_drift_detection",
      pass: false,
      detail: "cannot run synthetic asyncapi namespace drift detector without valid asyncapi scaffold",
    });
  } else {
    const expectedIds = sortedUnique(views.asyncapi_messages.map((message) => message.message_id));
    const actualIds = sortedUnique(Object.keys(asyncApiDoc.components.messages));
    const expectedPairKeys = sortedUnique(
      views.asyncapi_messages.map((message) => {
        const parsed = parseExternalCallSourceId(message.source_id);
        const channel = asyncApiChannelForNamespace(parsed.namespaceId);
        return `${message.message_id}|${message.source_id}|${parsed.namespaceId}|${parsed.callId}|${channel}`;
      }),
    );
    const expectedNamespaceMap = new Map<string, string[]>();
    for (const message of views.asyncapi_messages) {
      const parsed = parseExternalCallSourceId(message.source_id);
      const channel = asyncApiChannelForNamespace(parsed.namespaceId);
      const bucket = expectedNamespaceMap.get(channel) ?? [];
      bucket.push(message.message_id);
      expectedNamespaceMap.set(channel, bucket);
    }

    let hasMetadata = true;
    let metadataAligned = true;
    const actualPairKeys: string[] = [];
    const actualNamespaceMap = new Map<string, string[]>();
    for (const [messageId, message] of Object.entries(asyncApiDoc.components.messages)) {
      if (!isRecord(message)) {
        hasMetadata = false;
        break;
      }
      const metadata = message["x-b2c"];
      if (
        !isRecord(metadata) ||
        typeof metadata.source_id !== "string" ||
        typeof metadata.source_namespace_id !== "string" ||
        typeof metadata.source_call_id !== "string"
      ) {
        hasMetadata = false;
        break;
      }
      const parsed = parseExternalCallSourceId(metadata.source_id);
      if (parsed.namespaceId !== metadata.source_namespace_id || parsed.callId !== metadata.source_call_id) {
        metadataAligned = false;
      }
      const channel = asyncApiChannelForNamespace(metadata.source_namespace_id);
      actualPairKeys.push(
        `${messageId}|${metadata.source_id}|${metadata.source_namespace_id}|${metadata.source_call_id}|${channel}`,
      );
      const bucket = actualNamespaceMap.get(channel) ?? [];
      bucket.push(messageId);
      actualNamespaceMap.set(channel, bucket);
    }

    const channelsRecord = isRecord(asyncApiDoc.channels) ? asyncApiDoc.channels : null;
    let channelShapeOk = channelsRecord !== null;
    const channelListings = new Map<string, string[]>();
    if (channelsRecord) {
      for (const [channel, value] of Object.entries(channelsRecord)) {
        if (!isRecord(value) || !Array.isArray(value.messages)) {
          channelShapeOk = false;
          break;
        }
        const messageIds = value.messages.filter((item): item is string => typeof item === "string");
        if (messageIds.length !== value.messages.length) {
          channelShapeOk = false;
          break;
        }
        const channelMetadata = value["x-b2c"];
        if (
          !isRecord(channelMetadata) ||
          typeof channelMetadata.source_namespace_id !== "string" ||
          asyncApiChannelForNamespace(channelMetadata.source_namespace_id) !== channel
        ) {
          channelShapeOk = false;
          break;
        }
        channelListings.set(channel, messageIds);
      }
    }
    const namespaceDepthPass =
      channelShapeOk &&
      metadataAligned &&
      arraysEqual(sortedUnique(actualPairKeys), expectedPairKeys) &&
      mapStringArrayEqual(actualNamespaceMap, expectedNamespaceMap) &&
      mapStringArrayEqual(channelListings, expectedNamespaceMap);
    checks.push({
      name: "artifact:asyncapi_integrity",
      pass: arraysEqual(actualIds, expectedIds) && hasMetadata,
      detail: `asyncapi messages=${actualIds.length}, expected=${expectedIds.length}`,
    });
    checks.push({
      name: "gate:asyncapi_namespace_depth",
      pass: namespaceDepthPass,
      detail: `namespaces expected=${expectedNamespaceMap.size}, actual=${channelListings.size}, metadata_aligned=${metadataAligned}`,
    });

    if (expectedPairKeys.length === 0) {
      checks.push({
        name: "synthetic:asyncapi_namespace_drift_detection",
        pass: true,
        detail: "skipped synthetic asyncapi namespace drift detector (no asyncapi messages)",
      });
    } else {
      const tamperedAsyncApiDoc = deepCloneJson(asyncApiDoc);
      let tampered = false;
      if (
        isRecord(tamperedAsyncApiDoc) &&
        isRecord(tamperedAsyncApiDoc.components) &&
        isRecord(tamperedAsyncApiDoc.components.messages)
      ) {
        for (const message of Object.values(tamperedAsyncApiDoc.components.messages)) {
          if (!isRecord(message)) {
            continue;
          }
          const metadata = message["x-b2c"];
          if (!isRecord(metadata) || typeof metadata.source_namespace_id !== "string") {
            continue;
          }
          metadata.source_namespace_id = `${metadata.source_namespace_id}__synthetic_drift`;
          tampered = true;
          break;
        }
      }
      const tamperedPairKeys: string[] = [];
      if (
        tampered &&
        isRecord(tamperedAsyncApiDoc) &&
        isRecord(tamperedAsyncApiDoc.components) &&
        isRecord(tamperedAsyncApiDoc.components.messages)
      ) {
        for (const [messageId, message] of Object.entries(tamperedAsyncApiDoc.components.messages)) {
          if (!isRecord(message)) {
            continue;
          }
          const metadata = message["x-b2c"];
          if (
            !isRecord(metadata) ||
            typeof metadata.source_id !== "string" ||
            typeof metadata.source_namespace_id !== "string" ||
            typeof metadata.source_call_id !== "string"
          ) {
            continue;
          }
          const channel = asyncApiChannelForNamespace(metadata.source_namespace_id);
          tamperedPairKeys.push(
            `${messageId}|${metadata.source_id}|${metadata.source_namespace_id}|${metadata.source_call_id}|${channel}`,
          );
        }
      }
      const driftDetected = tampered && !arraysEqual(sortedUnique(tamperedPairKeys), expectedPairKeys);
      checks.push({
        name: "synthetic:asyncapi_namespace_drift_detection",
        pass: driftDetected,
        detail: driftDetected
          ? "tampered asyncapi namespace metadata was detected by namespace-depth gate"
          : "tampered asyncapi namespace metadata was not detected by namespace-depth gate",
      });
    }
  }

  const udsDoc = parseJsonArtifact(first.artifacts, "agent/schema/uds.json");
  if (!isRecord(udsDoc) || !Array.isArray(udsDoc.types)) {
    checks.push({
      name: "artifact:uds_integrity",
      pass: false,
      detail: "uds scaffold missing types array",
    });
  } else {
    const expectedTypeIds = sortedUnique(views.uds_types.map((item) => item.id));
    const actualTypeIds = sortedUnique(
      udsDoc.types.filter(isRecord).map((item) => item.id).filter((id): id is string => typeof id === "string"),
    );
    const metadataPresent = udsDoc.types
      .filter(isRecord)
      .every((item) => Object.prototype.hasOwnProperty.call(item, "source_pointer"));
    checks.push({
      name: "artifact:uds_integrity",
      pass: arraysEqual(actualTypeIds, expectedTypeIds) && metadataPresent,
      detail: `uds types=${actualTypeIds.length}, expected=${expectedTypeIds.length}`,
    });
  }

  const depgraphDoc = parseJsonArtifact(first.artifacts, "agent/depgraph.json");
  if (!isRecord(depgraphDoc) || !Array.isArray(depgraphDoc.nodes) || !Array.isArray(depgraphDoc.edges)) {
    checks.push({
      name: "artifact:depgraph_integrity",
      pass: false,
      detail: "depgraph missing nodes/edges arrays",
    });
  } else {
    const nodeIds = depgraphDoc.nodes
      .filter(isRecord)
      .map((node) => node.id)
      .filter((id): id is string => typeof id === "string")
      .sort((a, b) => a.localeCompare(b));
    const expectedNodeIds = sortedUnique([
      ...inventory.entries.map((entry) => entry.id),
      ...views.acceptance_scenarios.map((scenario) => `view:acceptance_scenario:${scenario.scenario_id}`),
      ...views.openapi_operations.map((operation) => `view:openapi_operation:${operation.operation_id}`),
      ...views.asyncapi_messages.map((message) => `view:asyncapi_message:${message.message_id}`),
      ...views.uds_types.map((udsType) => `view:uds_type:${udsType.id}`),
    ]);
    const edgeShapeOk = depgraphDoc.edges.filter(isRecord).every((edge) => {
      return (
        typeof edge.from_id === "string" &&
        typeof edge.to_id === "string" &&
        typeof edge.kind === "string" &&
        typeof edge.source === "string"
      );
    });
    checks.push({
      name: "artifact:depgraph_integrity",
      pass: arraysEqual(nodeIds, expectedNodeIds) && edgeShapeOk,
      detail: `depgraph nodes=${nodeIds.length}, expected=${expectedNodeIds.length}`,
    });
  }

  const rtmArtifact = first.artifacts.find((artifact) => artifact.path === "agent/rtm.csv");
  if (!rtmArtifact) {
    checks.push({
      name: "artifact:rtm_integrity",
      pass: false,
      detail: "rtm artifact missing",
    });
  } else {
    const lines = rtmArtifact.content.trimEnd().split("\n");
    const rows = lines.slice(1).map((line) => csvCell(line));
    const actualTriples = rows
      .map((row) => `${row[0] ?? ""}|${row[2] ?? ""}|${row[1] ?? ""}`)
      .sort((a, b) => a.localeCompare(b));
    const expectedTriples = inventory.entries
      .map((entry) => `${entry.id}|${entry.pointer}|${entry.entity_class}`)
      .sort((a, b) => a.localeCompare(b));
    const statusSet = new Set(rows.map((row) => row[8] ?? ""));
    checks.push({
      name: "artifact:rtm_integrity",
      pass: arraysEqual(actualTriples, expectedTriples) && statusSet.size > 0,
      detail: `rtm rows=${rows.length}, statuses=${[...statusSet].sort().join(",")}`,
    });
  }

  checks.push(...first.checks);
  checks.push(...second.checks.map((check) => ({ ...check, name: `${check.name}:rerun` })));
  const idempotency = compareArtifactSets(artifactHashes(first.artifacts), artifactHashes(second.artifacts));
  checks.push({
    name: "idempotency",
    pass: idempotency.pass,
    detail: idempotency.detail,
  });

  return {
    ok: checks.every((check) => check.pass),
    checks,
  };
}
