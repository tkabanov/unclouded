import { join } from "node:path";

import { runIngest } from "../ingest.js";
import { decodeAccessor } from "../decoders/accessor.js";
import { decodeDataSource } from "../decoders/data-source.js";
import { decodeMessageTree, decodeMessageTreeAccessors } from "../decoders/message-tree.js";
import { resolveTextExpressionHostClass } from "../decoders/text-expression-hosts.js";
import { scanPublicIntegrationKeys } from "../inventory/public-keys.js";
import { decomposeUrlTemplate } from "../m2/views/url-decompose.js";
import type { InventoryEntry, InventoryFile, RefEdge, SliceRecord } from "../types.js";
import { listFilesRecursively, readTextFile, removeDirIfExists } from "../utils/index.js";
import { sha256Text } from "../utils/hash.js";

interface CountExpectation {
  className: string;
  min: number;
}

interface AppExpectation {
  appFile: string;
  counts: CountExpectation[];
}

const APPS: AppExpectation[] = [
  {
    appFile: "smartqms-33414.bubble",
    counts: [
      { className: "user_type.field", min: 800 },
      { className: "workflow_total", min: 860 },
      { className: "action_total", min: 2060 },
      { className: "style_ref", min: 4000 },
      { className: "custom_state", min: 190 },
      { className: "option_set.value", min: 390 },
      { className: "mobile_view", min: 1 },
      { className: "element_definition", min: 37 },
      { className: "element_definition.workflow", min: 590 },
      { className: "plugin", min: 15 },
      { className: "data_binding", min: 1450 },
      { className: "text_expression", min: 3030 },
      { className: "external_http_call", min: 16 },
      { className: "external_http_namespace", min: 4 },
      { className: "oauth_namespace", min: 0 },
      { className: "secret_ref", min: 10 },
      { className: "public_integration_key", min: 4 },
    ],
  },
  {
    appFile: "teamapp-75292.bubble",
    counts: [
      { className: "style_ref", min: 2700 },
      { className: "custom_state", min: 180 },
      { className: "mobile_view", min: 1 },
      { className: "option_set.value", min: 240 },
      { className: "data_binding", min: 980 },
      { className: "text_expression", min: 1590 },
      { className: "external_http_call", min: 70 },
      { className: "external_http_namespace", min: 8 },
      { className: "oauth_namespace", min: 2 },
      { className: "secret_ref", min: 14 },
      { className: "public_integration_key", min: 6 },
    ],
  },
  {
    appFile: "barrow-no-temp.bubble",
    counts: [
      { className: "user_type.field", min: 280 },
      { className: "workflow_total", min: 377 },
      { className: "action_total", min: 744 },
      { className: "style_ref", min: 1500 },
      { className: "custom_state", min: 20 },
      { className: "option_set.value", min: 100 },
      { className: "data_binding", min: 440 },
      { className: "text_expression", min: 730 },
      { className: "external_http_call", min: 18 },
      { className: "external_http_namespace", min: 4 },
      { className: "oauth_namespace", min: 0 },
      { className: "secret_ref", min: 9 },
      { className: "public_integration_key", min: 9 },
    ],
  },
];

function countByClass(inventory: InventoryFile, className: string): number {
  if (className === "workflow_total") {
    return (
      inventory.entries.filter((entry) => entry.entity_class === "workflow").length +
      inventory.entries.filter((entry) => entry.entity_class === "element_definition.workflow").length
    );
  }
  if (className === "action_total") {
    return (
      inventory.entries.filter((entry) => entry.entity_class === "workflow.action").length +
      inventory.entries.filter((entry) => entry.entity_class === "element_definition.action").length +
      inventory.entries.filter((entry) => entry.entity_class === "api_event.action").length
    );
  }
  if (className === "data_binding") {
    return inventory.entries.filter((entry) => entry.meta?.data_binding).length;
  }
  if (className === "text_expression") {
    return inventory.entries.reduce((sum, entry) => {
      const fragments = entry.meta?.text_expressions;
      return sum + (Array.isArray(fragments) ? fragments.length : 0);
    }, 0);
  }
  return inventory.entries.filter((entry) => entry.entity_class === className).length;
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertThrows(action: () => void, message: string): void {
  let threw = false;
  try {
    action();
  } catch {
    threw = true;
  }
  assert(threw, message);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function assertM1Arms(inventory: InventoryFile): void {
  const dataBindings = inventory.entries
    .filter((entry) => entry.meta?.data_binding)
    .map((entry) => asRecord(entry.meta?.data_binding))
    .filter((binding): binding is Record<string, unknown> => binding !== null);
  const dataBindingKinds = new Set(
    dataBindings
      .map((binding) => binding.kind)
      .filter((kind): kind is string => typeof kind === "string"),
  );

  const requiredDataBindingKinds = [
    "parent_data",
    "search",
    "option_set_value",
    "current_user",
    "current_page_item",
    "element_ref",
    "url_param",
    "previous_step",
    "api_result",
    "external_api_result",
    "api_event_param",
    "opaque_scalar",
  ];
  const allowedDataBindingKinds = new Set(requiredDataBindingKinds);
  for (const kind of requiredDataBindingKinds) {
    assert(dataBindingKinds.has(kind), `Missing DataSourceIR kind coverage: ${kind}`);
  }
  for (const kind of dataBindingKinds) {
    assert(allowedDataBindingKinds.has(kind), `Unexpected DataSourceIR kind: ${kind}`);
  }

  const sourceTypes = new Set(
    dataBindings
      .map((binding) => binding.source_type)
      .filter(
        (sourceType): sourceType is string | null =>
          typeof sourceType === "string" || sourceType === null,
      ),
  );
  const requiredSourceTypes = [
    "ElementParent",
    "Search",
    "AllOptionValue",
    "OneOptionValue",
    "OptionValue",
    "CurrentUser",
    "CurrentPageItem",
    "GetElement",
    "GetParamFromUrl",
    "PreviousStep",
    "GetDataFromAPI",
    "APIEventParameter",
  ];
  for (const sourceType of requiredSourceTypes) {
    assert(sourceTypes.has(sourceType), `Missing source_type coverage: ${sourceType}`);
  }
  assert(sourceTypes.has(null), "Missing source_type null-arm coverage");

  const textHosts = new Set<string>();
  for (const entry of inventory.entries) {
    const fragments = entry.meta?.text_expressions;
    if (!Array.isArray(fragments)) {
      continue;
    }
    for (const fragment of fragments) {
      const record = asRecord(fragment);
      if (record && typeof record.host_class === "string") {
        textHosts.add(record.host_class);
      }
    }
  }
  for (const host of [
    "render_prop",
    "formatting_utility",
    "workflow_api_substitution",
    "element_definition_opaque",
  ]) {
    assert(textHosts.has(host), `Missing text host class coverage: ${host}`);
  }

  const calls = inventory.entries.filter((entry) => entry.entity_class === "external_http_call");
  const methods = new Set(
    calls.map((entry) => entry.meta?.method).filter((method): method is string => typeof method === "string"),
  );
  const allowedMethods = new Set(["get", "post", "put", "patch", "delete_method"]);
  for (const method of allowedMethods) {
    assert(methods.has(method), `Missing HttpMethod coverage: ${method}`);
  }
  for (const method of methods) {
    assert(allowedMethods.has(method), `Unexpected HttpMethod value: ${method}`);
  }

  const bodyTypes = new Set(
    calls
      .map((entry) => entry.meta?.body_type)
      .filter((body): body is string => typeof body === "string"),
  );
  const allowedBodyTypes = new Set(["form_data", "json", "plain_text"]);
  for (const bodyType of allowedBodyTypes) {
    assert(bodyTypes.has(bodyType), `Missing body_type coverage: ${bodyType}`);
  }
  for (const bodyType of bodyTypes) {
    assert(allowedBodyTypes.has(bodyType), `Unexpected body_type value: ${bodyType}`);
  }
  assert(
    calls.some((entry) => entry.meta?.body_type === null),
    "Missing body_type null-arm coverage",
  );

  const dataTypes = new Set(
    calls
      .map((entry) => entry.meta?.data_type)
      .filter((dataType): dataType is string => typeof dataType === "string"),
  );
  const allowedDataTypes = new Set(["stream", "JSON", "file"]);
  for (const dataType of allowedDataTypes) {
    assert(dataTypes.has(dataType), `Missing data_type coverage: ${dataType}`);
  }
  for (const dataType of dataTypes) {
    assert(allowedDataTypes.has(dataType), `Unexpected data_type value: ${dataType}`);
  }
  assert(
    calls.some((entry) => entry.meta?.data_type === null),
    "Missing data_type null-arm coverage",
  );

  const responseSchemaFormats = new Set(
    calls
      .map((entry) => entry.meta?.response_schema_format)
      .filter((format): format is string => typeof format === "string"),
  );
  for (const format of ["json_object", "missing"]) {
    assert(responseSchemaFormats.has(format), `Missing response_schema_format coverage: ${format}`);
  }
  for (const format of responseSchemaFormats) {
    assert(
      format === "json_object" || format === "missing",
      `Unexpected response_schema_format value: ${format}`,
    );
  }

  const authKinds = new Set(
    inventory.entries
      .filter((entry) => entry.entity_class === "external_http_namespace")
      .map((entry) => entry.meta?.auth_kind)
      .filter((auth): auth is string => typeof auth === "string"),
  );
  for (const authKind of ["none", "api_key_header", "oauth2_user"]) {
    assert(authKinds.has(authKind), `Missing AuthIR kind coverage: ${authKind}`);
  }

  const privacyRoles = inventory.entries.filter((entry) => entry.entity_class === "privacy_role");
  assert(privacyRoles.length > 0, "Missing privacy_role inventory coverage");
  for (const privacyRole of privacyRoles) {
    const typedAst = privacyRole.meta?.condition_typed_ast;
    const coverage = asRecord(privacyRole.meta?.condition_ast_coverage);
    assert(
      typedAst !== undefined && typedAst !== null,
      `privacy_role ${privacyRole.id} missing condition_typed_ast metadata`,
    );
    assert(
      Array.isArray(privacyRole.meta?.condition_accessors),
      `privacy_role ${privacyRole.id} missing condition_accessors metadata`,
    );
    assert(
      coverage !== null && coverage.schema === "b2c.message_tree_ast_coverage.v1",
      `privacy_role ${privacyRole.id} missing condition_ast_coverage schema`,
    );
    assert(
      typeof coverage?.unknown_node_count === "number" && coverage.unknown_node_count === 0,
      `privacy_role ${privacyRole.id} typed AST must be fail-closed (unknown_node_count=0)`,
    );
  }
}

function assertTeamappOAuthUserDataCallMapping(inventory: InventoryFile, refs: RefEdge[]): void {
  const oauthNamespaces = inventory.entries.filter((entry) => entry.entity_class === "oauth_namespace");
  assert(oauthNamespaces.length > 0, "teamapp: expected at least one oauth_namespace entry");

  const oauthRefs = refs.filter((edge) => edge.edge_kind === "oauth_user_data_call");
  const callIds = new Set(
    inventory.entries
      .filter((entry) => entry.entity_class === "external_http_call")
      .map((entry) => entry.id),
  );

  let seenOAuthNamespaceWithUserDataCall = 0;
  let seenOAuthNamespaceWithNullUserDataCall = 0;
  for (const oauthNamespace of oauthNamespaces) {
    const oauthUserDataCall = oauthNamespace.meta?.oauth_user_data_call;
    const namespaceRefs = oauthRefs.filter((edge) => edge.from_id === oauthNamespace.parent_id);
    if (typeof oauthUserDataCall === "string" && oauthUserDataCall.length > 0) {
      seenOAuthNamespaceWithUserDataCall += 1;
      assert(
        namespaceRefs.length > 0,
        `teamapp: missing oauth_user_data_call ref edge for namespace ${oauthNamespace.id}`,
      );
      for (const edge of namespaceRefs) {
        assert(
          callIds.has(edge.to_id),
          `teamapp: oauth_user_data_call edge target must resolve to external_http_call (${edge.to_id})`,
        );
      }
    } else if (oauthUserDataCall === null) {
      seenOAuthNamespaceWithNullUserDataCall += 1;
      assert(
        namespaceRefs.length === 0,
        `teamapp: oauth namespace ${oauthNamespace.id} with null oauth_user_data_call must not emit oauth_user_data_call refs`,
      );
    }
  }
  assert(
    seenOAuthNamespaceWithUserDataCall > 0,
    "teamapp: expected at least one oauth_namespace with non-null oauth_user_data_call",
  );
  assert(
    seenOAuthNamespaceWithNullUserDataCall > 0,
    "teamapp: expected at least one oauth_namespace with normalized-null oauth_user_data_call path",
  );

  const authSourceFallbackNamespaces = inventory.entries.filter(
    (entry) =>
      entry.entity_class === "external_http_namespace" &&
      (entry.meta?.auth_source === "absent" || entry.meta?.auth_source === "null"),
  );
  assert(
    authSourceFallbackNamespaces.length > 0,
    "teamapp: expected at least one external_http_namespace with auth_source absent/null normalization",
  );
  for (const namespaceEntry of authSourceFallbackNamespaces) {
    const namespaceRefs = oauthRefs.filter((edge) => edge.from_id === namespaceEntry.id);
    assert(
      namespaceRefs.length === 0,
      `teamapp: auth_source fallback namespace ${namespaceEntry.id} must not emit oauth_user_data_call refs`,
    );
  }
}

function assertFailClosedDecoderBehavior(): void {
  assertThrows(
    () => decodeMessageTree({ type: "UnknownMessageTreeOperator" }, { strict: true }),
    "decodeMessageTree(strict=true) must throw on unknown operators",
  );
  assertThrows(
    () => decodeMessageTree({ type: "Message", name: "unknown@@message@@token" }, { strict: true }),
    "decodeMessageTree(strict=true) must reject malformed Message operator/accessor names",
  );
  assertThrows(
    () => decodeMessageTree({ type: "Message", name: "totally_valid_identifier_token" }, { strict: true }),
    "decodeMessageTree(strict=true) must reject identifier-shaped unknown Message operator/accessor names",
  );
  const normalPrivacyCondition = {
    type: "Message",
    name: "and_",
    args: {
      type: "InjectedValue",
      args: { name: "role_option_admin" },
    },
    next: {
      type: "CurrentUser",
    },
  };
  const decodedPrivacyCondition = decodeMessageTree(normalPrivacyCondition, { strict: true });
  assert(
    decodedPrivacyCondition.kind === "operation" && decodedPrivacyCondition.op === "Message",
    "decodeMessageTree(strict=true) must support Message/InjectedValue nodes for privacy conditions",
  );
  const privacyAccessors = decodeMessageTreeAccessors(normalPrivacyCondition, { strict: true });
  assert(
    privacyAccessors.includes("role_option_admin"),
    "decodeMessageTreeAccessors(strict=true) must collect accessors nested in Message/InjectedValue args",
  );
  assertThrows(
    () => decodeMessageTree({ type: "Message", next: 42 }, { strict: true }),
    "decodeMessageTree(strict=true) must throw on malformed Message next nodes",
  );

  const externalApi = decodeAccessor("_api_c2_customer_email", { strict: true });
  assert(
    externalApi.kind === "external_api_field" && externalApi.precedence === "_api_c2",
    "decodeAccessor must deterministically resolve _api_c2_* as external_api_field",
  );
  const roleOption = decodeAccessor("role_option_admin", { strict: true });
  assert(
    roleOption.kind === "privacy_role_option" && roleOption.precedence === "role_option",
    "decodeAccessor must deterministically resolve role_option_* before fallback patterns",
  );
  const customLookup = decodeAccessor("custom_state_dashboard", {
    strict: true,
    customNameToId: {
      custom_state_dashboard: {
        ref: "state_entry",
      },
    },
  });
  assert(
    customLookup.kind === "custom_name_lookup" && customLookup.precedence === "custom_name_to_id",
    "decodeAccessor must prioritize customNameToId lookup before custom_state suffix matching",
  );
  const customState = decodeAccessor("custom_state_dashboard", { strict: true });
  assert(
    customState.kind === "custom_state_ref" && customState.precedence === "custom_state",
    "decodeAccessor must resolve custom_state_* suffixes when customNameToId misses",
  );
  assertThrows(
    () => decodeAccessor("unknown@@accessor@@token", { strict: true }),
    "decodeAccessor(strict=true) must throw on unknown accessors",
  );
  assertThrows(
    () => decodeAccessor("totally_valid_identifier_token", { strict: true }),
    "decodeAccessor(strict=true) must reject identifier-shaped unknown runtime accessors",
  );
  assertThrows(
    () => decodeAccessor("role_option_", { strict: true }),
    "decodeAccessor(strict=true) must reject empty role_option suffix",
  );

  const knownHostClass = resolveTextExpressionHostClass(
    "/pages/p1/elements/e1/properties/text",
    "text",
  );
  assert(
    knownHostClass === "render_prop",
    "resolveTextExpressionHostClass must deterministically resolve known host keys",
  );
  const formattingHostClass = resolveTextExpressionHostClass(
    "/pages/p1/elements/e1/properties/label",
    "label",
  );
  assert(
    formattingHostClass === "formatting_utility",
    "resolveTextExpressionHostClass must resolve formatting utility hosts",
  );
  const workflowSubstitutionHost = resolveTextExpressionHostClass(
    "/pages/p1/workflows/w1/actions/a1/properties/body_params_name",
    "body_params_name",
  );
  assert(
    workflowSubstitutionHost === "workflow_api_substitution",
    "resolveTextExpressionHostClass must resolve workflow API substitution hosts",
  );
  const opaqueElementDefinitionHost = resolveTextExpressionHostClass(
    "/element_definitions/ed1/properties/custom_dynamic_value",
    "custom_dynamic_value",
  );
  assert(
    opaqueElementDefinitionHost === "element_definition_opaque",
    "resolveTextExpressionHostClass must resolve element definition opaque hosts",
  );
  const unknownHostClass = resolveTextExpressionHostClass("/pages/p1/elements/e1/properties/unknown_host", "zzz");
  assert(
    unknownHostClass === null,
    "resolveTextExpressionHostClass must fail closed on unknown host keys",
  );
  assertThrows(
    () => assert(unknownHostClass !== null, "unknown TextExpression hosts must fail acceptance assertions"),
    "acceptance assertions must treat unknown TextExpression hosts as failure",
  );

  for (const rawValue of [0, 1, true, false, null]) {
    const decoded = decodeDataSource(rawValue);
    assert(
      decoded.kind === "opaque_scalar" && decoded.isUnknown === false && decoded.sourceType === null,
      "decodeDataSource must classify number/bool/null as opaque_scalar",
    );
  }
  for (const rawValue of ["plain-text", undefined, () => null]) {
    const decoded = decodeDataSource(rawValue);
    assert(
      decoded.kind === "unknown" && decoded.isUnknown === true,
      "decodeDataSource must classify unsupported non-object forms as unknown",
    );
  }
}

export function extractBodyTemplateRefs(template: string): string[] {
  const refs = new Set<string>();
  const pattern = /<([A-Za-z0-9_]+)>/g;
  let match = pattern.exec(template);
  while (match) {
    const name = match[1];
    if (name) {
      refs.add(name);
    }
    match = pattern.exec(template);
  }
  return [...refs].sort((a, b) => a.localeCompare(b));
}

export function validateTemplateParams(
  urlTemplate: string,
  bodyTemplate: string,
  declaredParams: readonly string[],
): void {
  const declaredSet = new Set(declaredParams);
  const url = decomposeUrlTemplate(urlTemplate);
  const urlRefs = new Set([
    ...url.pathParams,
    ...url.queryParams
      .filter((item) => item.templated)
      .map((item) => item.name),
  ]);
  for (const ref of urlRefs) {
    if (!declaredSet.has(ref)) {
      throw new Error(`Dangling URL template ref: ${ref}`);
    }
  }
  const bodyRefs = extractBodyTemplateRefs(bodyTemplate);
  for (const ref of bodyRefs) {
    if (!declaredSet.has(ref)) {
      throw new Error(`Dangling body template ref: ${ref}`);
    }
  }
}

function assertTemplateAndPublicCredentialSyntheticTests(): void {
  validateTemplateParams(
    "https://api.example.com/users/[user_id]/posts?status=[status]&sort=desc",
    "{\"user\":\"<user_id>\",\"status\":\"<status>\",\"limit\":\"<limit>\"}",
    ["user_id", "status", "limit"],
  );
  assertThrows(
    () =>
      validateTemplateParams(
        "https://api.example.com/users/[user_id]/posts?status=[status]",
        "{\"user\":\"<user_id>\",\"status\":\"<status>\",\"cursor\":\"<cursor>\"}",
        ["user_id", "status"],
      ),
    "Template validator must fail on dangling URL/body refs",
  );
  assertThrows(
    () => decomposeUrlTemplate("/relative/path/[id]"),
    "decomposeUrlTemplate must fail on malformed URL templates",
  );

  const publicKeyScan = scanPublicIntegrationKeys(
    {
      plugins: {
        pluginfoo: true,
      },
      stripe_publishable_key: "pk_live_123",
      pluginfoo_site_key: "foo_site",
      pluginfoo_secret_token: "should_not_be_public",
      pluginfoo_installed_version: "1.2.3",
      unclassified_value: "noop",
    },
    ["settings", "client_safe"],
  );
  const matchedKeys = new Set(publicKeyScan.matches.map((entry) => entry.key));
  const suspiciousKeys = new Set(publicKeyScan.suspicious_matches.map((entry) => entry.key));
  assert(matchedKeys.has("stripe_publishable_key"), "Expected prefix/suffix public key to be emitted");
  assert(matchedKeys.has("pluginfoo_site_key"), "Expected plugin-scoped public key to be emitted");
  assert(!matchedKeys.has("pluginfoo_installed_version"), "Cosmetic denylist key must not be emitted");
  assert(!matchedKeys.has("unclassified_value"), "Non-pattern key must not be emitted");
  assert(
    suspiciousKeys.has("pluginfoo_secret_token"),
    "Suspicious denylist suffix must route to suspicious bucket",
  );
}

async function hashOutputTree(rootPath: string): Promise<Map<string, string>> {
  const files = await listFilesRecursively(rootPath);
  const map = new Map<string, string>();
  for (const file of files) {
    const text = await readTextFile(file);
    map.set(file.replace(`${rootPath}/`, ""), sha256Text(text));
  }
  return map;
}

function compareHashes(a: Map<string, string>, b: Map<string, string>): void {
  assert(a.size === b.size, `Output file count changed between runs: ${a.size} vs ${b.size}`);
  for (const [path, hash] of a.entries()) {
    const other = b.get(path);
    assert(other === hash, `Output hash mismatch for ${path}`);
  }
}

function assertSliceConstraints(slices: SliceRecord[]): void {
  for (const slice of slices) {
    assert(slice.tokens_estimate <= 48_000, `Slice over budget: ${slice.slice_id}`);
  }
}

function assertSmartqmsSliceRegression(slices: SliceRecord[]): void {
  const bTbjuSlices = slices.filter((slice) => slice.slice_id.startsWith("bTbju/"));
  const expectedSliceIds = [
    "bTbju/__root",
    "bTbju/workflows/__part_A",
    "bTbju/workflows/__part_B",
    "bTbju/workflows/__part_C",
    "bTbju/elements/__remaining_children",
    "bTbju/elements/bUDUL/elements/__remaining_children",
    "bTbju/elements/bUDUL/elements/bUDUM/elements/__remaining_children",
  ].sort();
  const actualSliceIds = bTbjuSlices.map((slice) => slice.slice_id).sort();
  assert(
    actualSliceIds.length === expectedSliceIds.length,
    `Expected ${expectedSliceIds.length} slices for bTbju, got ${actualSliceIds.length}`,
  );
  for (let index = 0; index < expectedSliceIds.length; index += 1) {
    const expected = expectedSliceIds[index];
    const actual = actualSliceIds[index];
    assert(actual === expected, `Unexpected bTbju slice tree entry at ${index}: ${actual} vs ${expected}`);
  }

  const workflowSlices = bTbjuSlices.filter((slice) => slice.slice_id.includes("/workflows/"));
  assert(
    workflowSlices.length > 0,
    "Expected at least one workflow sub-slice for bTbju",
  );
  for (const slice of workflowSlices) {
    const envelope = slice.neighbour_context?.trigger_envelope;
    assert(Boolean(envelope), `Missing trigger_envelope for workflow slice ${slice.slice_id}`);
    assert(Boolean(envelope?.pointer), `Missing trigger pointer for ${slice.slice_id}`);
    assert((envelope?.parent_chain.length ?? 0) <= 3, `parent_chain > 3 for ${slice.slice_id}`);
  }
}

export async function runM1Acceptance(workspaceRoot: string, outputDir = join(workspaceRoot, "b2c")): Promise<void> {
  const inputDir = join(workspaceRoot, "bubble-apps-metadata-examples");
  const pass1 = join(outputDir, "__run1");
  const pass2 = join(outputDir, "__run2");
  await removeDirIfExists(pass1);
  await removeDirIfExists(pass2);

  for (const app of APPS) {
    const inputPath = join(inputDir, app.appFile);
    const out1 = join(pass1, app.appFile.replace(".bubble", ""));
    const out2 = join(pass2, app.appFile.replace(".bubble", ""));
    const first = await runIngest(inputPath, out1);
    const second = await runIngest(inputPath, out2);

    for (const expectation of app.counts) {
      const count = countByClass(first.inventory, expectation.className);
      assert(
        count >= expectation.min,
        `${app.appFile}: ${expectation.className} expected >= ${expectation.min}, got ${count}`,
      );
    }

    assertSliceConstraints(first.slices);
    if (app.appFile === "smartqms-33414.bubble") {
      assertSmartqmsSliceRegression(first.slices);
    }
    if (app.appFile === "teamapp-75292.bubble") {
      assertTeamappOAuthUserDataCallMapping(first.inventory, first.refs);
    }

    const hashA = await hashOutputTree(out1);
    const hashB = await hashOutputTree(out2);
    compareHashes(hashA, hashB);

    // Check per-arm coverage on union by progressively merging inventories.
    if (app.appFile === "barrow-no-temp.bubble") {
      // deferred union check below after all runs
    }
  }

  // Build union inventory check by re-reading pass1 inventories.
  const unionEntries: InventoryEntry[] = [];
  for (const app of APPS) {
    const appName = app.appFile.replace(".bubble", "");
    const inventoryPath = join(pass1, appName, "index", "inventory.json");
    const raw = JSON.parse(await readTextFile(inventoryPath)) as InventoryFile;
    unionEntries.push(...raw.entries);
  }
  const unionInventory: InventoryFile = {
    entries: unionEntries,
    reserved_view_classes: [
      "acceptance_scenario",
      "openapi_operation",
      "asyncapi_message",
      "uds_type",
      "threat_actor",
      "data_flow",
      "migration_adr",
    ],
  };
  assertM1Arms(unionInventory);
  assertFailClosedDecoderBehavior();
  assertTemplateAndPublicCredentialSyntheticTests();
}
