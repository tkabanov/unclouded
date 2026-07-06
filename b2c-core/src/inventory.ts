import type {
  BubbleElement,
  BubbleRoot,
  BubbleWorkflow,
  EntityClass,
  InventoryBuildResult,
  InventoryEntry,
  InventoryFile,
  JsonValue,
  LintFile,
  ReservedViewClass,
} from "./types.js";
import { accessorRefToJson, buildRuntimeAccessorCatalog, decodeAccessor } from "./decoders/accessor.js";
import { decodeDataSource } from "./decoders/data-source.js";
import {
  decodeMessageTree,
  decodeMessageTreeAccessors,
  decodeMessageTreeTypedAst,
  summarizeMessageTreeAstCoverage,
} from "./decoders/message-tree.js";
import { resolveTextExpressionHostClass } from "./decoders/text-expression-hosts.js";
import { scanPublicIntegrationKeys } from "./inventory/public-keys.js";
import { getRecord, getString, isRecord, shortHash, toPointer } from "./utils/index.js";

interface BuildState {
  entries: InventoryEntry[];
  ids: Set<string>;
  errors: string[];
  secureKeys: Set<string>;
  dataBindingByEntityId: Map<string, Record<string, JsonValue>>;
  textExpressionsByEntityId: Map<
    string,
    Array<{ pointer: string; host_key: string; host_class: string }>
  >;
  customNameToId: Record<string, JsonValue> | null;
  runtimeAccessorCatalog: ReadonlySet<string>;
}

const VIEW_CLASS_RESERVATION: ReservedViewClass[] = [
  "acceptance_scenario",
  "openapi_operation",
  "asyncapi_message",
  "uds_type",
  "threat_actor",
  "data_flow",
  "migration_adr",
];

function normalizeIndexPath(rawPath: string): string {
  const compact = rawPath.startsWith("/") ? rawPath.slice(1) : rawPath;
  if (compact.includes("%") || (compact.includes(".") && !compact.includes("/"))) {
    const canonical = compact
      .replace(/^%p3\./, "pages.")
      .replace(/^%ed\./, "element_definitions.")
      .replace(/^%api\./, "api.")
      .replace(/\.%el\./g, ".elements.")
      .replace(/\.%wf\./g, ".workflows.");
    const parts = canonical.split(".").filter((part) => part.length > 0);
    return `/${parts.join("/")}`;
  }
  return rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
}

function pushEntry(
  state: BuildState,
  id: string,
  pointer: string,
  entityClass: EntityClass,
  parentId?: string,
  meta?: Record<string, JsonValue>,
): void {
  const uniqueKey = `${entityClass}:${pointer}`;
  if (state.ids.has(uniqueKey)) {
    return;
  }
  state.ids.add(uniqueKey);
  const entry: InventoryEntry = {
    id,
    pointer,
    entity_class: entityClass,
  };
  if (parentId !== undefined) {
    entry.parent_id = parentId;
  }
  if (meta !== undefined) {
    entry.meta = meta;
  }
  state.entries.push(entry);
}

function addDataBindingFragment(
  state: BuildState,
  entityId: string,
  fragment: Record<string, JsonValue>,
): void {
  state.dataBindingByEntityId.set(entityId, fragment);
}

function addTextExpressionFragment(
  state: BuildState,
  entityId: string,
  fragment: { pointer: string; host_key: string; host_class: string },
): void {
  const existing = state.textExpressionsByEntityId.get(entityId) ?? [];
  if (
    existing.some(
      (item) =>
        item.pointer === fragment.pointer &&
        item.host_key === fragment.host_key &&
        item.host_class === fragment.host_class,
    )
  ) {
    return;
  }
  existing.push(fragment);
  state.textExpressionsByEntityId.set(entityId, existing);
}

function classifyResponseSchemaFormat(rawTypes: unknown): "json_object" | "missing" | "invalid" {
  if (rawTypes === undefined) {
    return "missing";
  }
  if (typeof rawTypes !== "string") {
    return "invalid";
  }
  try {
    const parsed = JSON.parse(rawTypes) as unknown;
    return isRecord(parsed) ? "json_object" : "invalid";
  } catch {
    return "invalid";
  }
}

function getBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function getFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function walkTextExpressions(
  state: BuildState,
  value: unknown,
  pathParts: string[],
  parentId: string,
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      walkTextExpressions(state, item, [...pathParts, String(index)], parentId);
    });
    return;
  }
  if (!isRecord(value)) {
    return;
  }

  const pointer = toPointer(pathParts);
  if (value.type === "TextExpression") {
    const hostKey = pathParts[pathParts.length - 1] ?? "";
    const resolvedHostClass = resolveTextExpressionHostClass(pointer, hostKey);
    if (resolvedHostClass === null) {
      state.errors.push(`Unknown TextExpression host at ${pointer} (host_key=${hostKey})`);
      return;
    }
    addTextExpressionFragment(state, parentId, {
      pointer,
      host_key: hostKey,
      host_class: resolvedHostClass,
    });
  }

  for (const [key, child] of Object.entries(value)) {
    walkTextExpressions(state, child, [...pathParts, key], parentId);
  }
}

function walkCustomStatesAny(
  state: BuildState,
  value: unknown,
  pathParts: string[],
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      walkCustomStatesAny(state, item, [...pathParts, String(index)]);
    });
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  if (isRecord(value.custom_states)) {
    const parentPointer = toPointer(pathParts);
    const parentId = shortHash(parentPointer, 10);
    for (const stateKey of Object.keys(value.custom_states)) {
      pushEntry(
        state,
        `custom_state:${parentId}:${stateKey}`,
        `${parentPointer}/custom_states/${stateKey}`,
        "custom_state",
        parentId,
      );
    }
  }
  for (const [key, child] of Object.entries(value)) {
    walkCustomStatesAny(state, child, [...pathParts, key]);
  }
}

function findEntryIdByPointer(state: BuildState, pointer: string): string | null {
  for (const entry of state.entries) {
    if (entry.pointer === pointer) {
      return entry.id;
    }
  }
  return null;
}

function walkGenericDataBindings(
  state: BuildState,
  value: unknown,
  pathParts: string[],
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      walkGenericDataBindings(state, item, [...pathParts, String(index)]);
    });
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  const hasDataSource = Object.hasOwn(value, "data_source");
  const hasGroupType = Object.hasOwn(value, "group_type");
  if ((hasDataSource || hasGroupType) && pathParts[pathParts.length - 1] === "properties") {
    const propertiesPointer = toPointer(pathParts);
    const entityPointer = propertiesPointer.replace(/\/properties$/, "");
    const entityId = findEntryIdByPointer(state, entityPointer);
    if (entityId) {
      const dataSourceRaw = hasDataSource ? (value.data_source ?? null) : null;
      const decoded = decodeDataSource(dataSourceRaw);
      const accessorRefs = hasDataSource
        ? collectAccessorRefs(state, dataSourceRaw, `${propertiesPointer}/data_source`)
        : [];
      if (hasDataSource && decoded.isUnknown) {
        state.errors.push(`Unknown data_source kind at ${propertiesPointer}/data_source`);
      }
      addDataBindingFragment(state, entityId, {
        kind: decoded.kind,
        content_type: (typeof value.group_type === "string" ? value.group_type : null) as JsonValue,
        source_type: decoded.sourceType as JsonValue,
        accessor_refs: accessorRefs,
      });
    }
  }
  for (const [key, child] of Object.entries(value)) {
    walkGenericDataBindings(state, child, [...pathParts, key]);
  }
}

function collectAccessorRefs(state: BuildState, dataSourceRaw: unknown, sourcePath: string): JsonValue[] {
  try {
    return decodeMessageTreeAccessors(dataSourceRaw, {
      strict: true,
      runtimeAccessorCatalog: state.runtimeAccessorCatalog,
    }).map((accessor) =>
      accessorRefToJson(
        decodeAccessor(accessor, {
          customNameToId: state.customNameToId,
          runtimeAccessorCatalog: state.runtimeAccessorCatalog,
          strict: true,
        }),
      ),
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    state.errors.push(`Accessor decode failed at ${sourcePath}: ${detail}`);
    return [];
  }
}

function walkWorkflowCollection(
  state: BuildState,
  workflows: Record<string, BubbleWorkflow> | undefined,
  pathPrefix: string[],
  parentId: string,
  workflowClass: EntityClass,
  actionClass: EntityClass,
): void {
  if (!workflows) {
    return;
  }
  for (const [workflowKey, workflow] of Object.entries(workflows)) {
    const workflowId = workflow.id ?? workflowKey;
    const workflowPointer = toPointer([...pathPrefix, workflowKey]);
    const workflowMeta: Record<string, JsonValue> = {
      trigger_type: getString(workflow.type) ?? null,
    };
    const workflowProperties = getRecord(workflow.properties);
    const workflowCondition = workflowProperties ? getRecord(workflowProperties.condition) : null;
    const workflowConditionProperties = workflowCondition ? getRecord(workflowCondition.properties) : null;
    workflowMeta.trigger_condition_type = workflowCondition
      ? (getString(workflowCondition.type) ?? null)
      : null;
    workflowMeta.trigger_element_id = workflowConditionProperties
      ? (getString(workflowConditionProperties.element_id) ?? null)
      : null;
    if (workflowProperties && typeof workflowProperties.interval === "number" && Number.isFinite(workflowProperties.interval)) {
      workflowMeta.interval_seconds = workflowProperties.interval;
    }
    pushEntry(state, workflowId, workflowPointer, workflowClass, parentId, workflowMeta);

    const actions = getRecord(workflow.actions) as Record<string, BubbleWorkflow> | undefined;
    if (!actions) {
      continue;
    }
    for (const [actionKey, action] of Object.entries(actions)) {
      const actionId = getString(action.id) ?? `${workflowId}:action:${actionKey}`;
      const actionPointer = toPointer([...pathPrefix, workflowKey, "actions", actionKey]);
      pushEntry(state, actionId, actionPointer, actionClass, workflowId, {
        action_type: getString(action.type) ?? null,
      });
      walkTextExpressions(state, action, [...pathPrefix, workflowKey, "actions", actionKey], actionId);
    }
  }
}

function walkElementTree(
  state: BuildState,
  elements: Record<string, BubbleElement> | undefined,
  pathPrefix: string[],
  parentId: string,
): void {
  if (!elements) {
    return;
  }
  for (const [elementKey, element] of Object.entries(elements)) {
    const elementId = element.id ?? elementKey;
    const elementPointerParts = [...pathPrefix, elementKey];
    const elementPointer = toPointer(elementPointerParts);
    pushEntry(state, elementId, elementPointer, "element", parentId, {
      element_type: getString(element.type) ?? null,
    });

    if (typeof element.style === "string" && element.style.length > 0) {
      pushEntry(
        state,
        `style_ref:${elementId}`,
        `${elementPointer}/style`,
        "style_ref",
        elementId,
        { style_target: element.style },
      );
    }

    const customStates = getRecord(element.custom_states);
    if (customStates) {
      for (const stateKey of Object.keys(customStates)) {
        pushEntry(
          state,
          `custom_state:${elementId}:${stateKey}`,
          `${elementPointer}/custom_states/${stateKey}`,
          "custom_state",
          elementId,
        );
      }
    }

    const properties = getRecord(element.properties);
    if (properties) {
      if (Object.hasOwn(properties, "data_source") || Object.hasOwn(properties, "group_type")) {
        const hasDataSource = Object.hasOwn(properties, "data_source");
        const dataSourceRaw = hasDataSource ? (properties.data_source ?? null) : null;
        const decoded = decodeDataSource(dataSourceRaw);
        const accessorRefs = hasDataSource
          ? collectAccessorRefs(state, dataSourceRaw, `${elementPointer}/properties/data_source`)
          : [];
        if (hasDataSource && decoded.isUnknown) {
          state.errors.push(`Unknown data_source kind at ${elementPointer}/properties/data_source`);
        }
        addDataBindingFragment(state, elementId, {
          kind: decoded.kind,
          content_type: (typeof properties.group_type === "string"
            ? properties.group_type
            : null) as JsonValue,
          source_type: decoded.sourceType as JsonValue,
          accessor_refs: accessorRefs,
        });
      }
    }

    walkTextExpressions(state, element, elementPointerParts, elementId);
    walkWorkflowCollection(
      state,
      getRecord(element.workflows) as Record<string, BubbleWorkflow> | undefined,
      [...elementPointerParts, "workflows"],
      elementId,
      "workflow",
      "workflow.action",
    );
    walkElementTree(
      state,
      getRecord(element.elements) as Record<string, BubbleElement> | undefined,
      [...elementPointerParts, "elements"],
      elementId,
    );
  }
}

function parseExternalCalls(
  state: BuildState,
  root: BubbleRoot,
  clientSafe: Record<string, JsonValue>,
): void {
  const apiConnector = getRecord(clientSafe.apiconnector2);
  if (!apiConnector) {
    return;
  }
  const secure = getRecord(root.settings?.secure) ?? {};

  for (const [nsId, nsValueUnknown] of Object.entries(apiConnector)) {
    const nsValue = getRecord(nsValueUnknown);
    if (!nsValue) {
      continue;
    }
    const nsInventoryId = `external_ns:${nsId}`;
    const nsPointer = `/settings/client_safe/apiconnector2/${nsId}`;
    const authRaw = getString(nsValue.auth);
    const authSource = Object.hasOwn(nsValue, "auth")
      ? authRaw ?? "null"
      : "absent";
    pushEntry(state, nsInventoryId, nsPointer, "external_http_namespace", undefined, {
      human: getString(nsValue.human) ?? nsId,
      auth_source: authSource,
      auth_kind:
        authRaw === "oauth2_user"
          ? "oauth2_user"
          : authRaw === "private_key_header"
            ? "api_key_header"
            : "none",
    });

    if (authRaw === "oauth2_user") {
      pushEntry(state, `oauth_ns:${nsId}`, nsPointer, "oauth_namespace", nsInventoryId, {
        oauth_user_data_call: (getString(nsValue.oauth_user_data_call) ?? null) as JsonValue,
        token_url: (getString(nsValue.generate_token_from_code_uri) ?? null) as JsonValue,
        authorize_url: (getString(nsValue.authentication_url) ?? null) as JsonValue,
        redirect_uri: null,
        user_info_url: (getString(nsValue.oauth_user_data_call) ?? null) as JsonValue,
        client_id_env: getString(nsValue.appid) ? (`B2C_OAUTH_CLIENT_ID_${nsId}` as JsonValue) : null,
        client_secret_env: getString(nsValue.appid) ? (`B2C_OAUTH_CLIENT_SECRET_${nsId}` as JsonValue) : null,
      });
    }

    const calls = getRecord(nsValue.calls);
    if (!calls) {
      continue;
    }
    for (const [callId, callUnknown] of Object.entries(calls)) {
      const call = getRecord(callUnknown);
      if (!call) {
        continue;
      }
      const callInventoryId = `external_call:${nsId}:${callId}`;
      const callPointer = `${nsPointer}/calls/${callId}`;
      const responseSchemaFormat = classifyResponseSchemaFormat(call.types);
      if (responseSchemaFormat === "invalid") {
        state.errors.push(`Invalid response schema format at ${callPointer}/types`);
      }
      pushEntry(state, callInventoryId, callPointer, "external_http_call", nsInventoryId, {
        method: (getString(call.method) ?? null) as JsonValue,
        url: (getString(call.url) ?? null) as JsonValue,
        ret_value: (getString(call.ret_value) ?? null) as JsonValue,
        data_type: (getString(call.data_type) ?? null) as JsonValue,
        body_type: (getString(call.body_type) ?? null) as JsonValue,
        response_schema_format: responseSchemaFormat,
      });

      const headers = getRecord(call.headers) ?? {};
      for (const [headerId, headerValueUnknown] of Object.entries(headers)) {
        const headerValue = getRecord(headerValueUnknown);
        if (!headerValue || headerValue.private !== true) {
          continue;
        }
        const keyA = `${nsId}__${callId}__${headerId}`;
        const keyB = headerId;
        const matchedKey = Object.hasOwn(secure, keyA)
          ? keyA
          : Object.hasOwn(secure, keyB)
            ? keyB
            : null;
        void matchedKey;
      }

      const bodyParams = getRecord(call.body_params) ?? {};
      for (const [paramId, paramUnknown] of Object.entries(bodyParams)) {
        const param = getRecord(paramUnknown);
        if (!param || param.private !== true) {
          continue;
        }
        const keyA = `${nsId}__${callId}__${paramId}`;
        const keyB = paramId;
        const matchedKey = Object.hasOwn(secure, keyA)
          ? keyA
          : Object.hasOwn(secure, keyB)
            ? keyB
            : null;
        void matchedKey;
      }
    }
  }
}

export function buildInventory(root: BubbleRoot): InventoryBuildResult {
  const secure = getRecord(root.settings?.secure) ?? {};
  const state: BuildState = {
    entries: [],
    ids: new Set<string>(),
    errors: [],
    secureKeys: new Set(Object.keys(secure)),
    dataBindingByEntityId: new Map<string, Record<string, JsonValue>>(),
    textExpressionsByEntityId: new Map<string, Array<{ pointer: string; host_key: string; host_class: string }>>(),
    customNameToId: getRecord(root._index?.custom_name_to_id) ?? null,
    runtimeAccessorCatalog: buildRuntimeAccessorCatalog(root),
  };
  let suspiciousPublicKeys: LintFile["suspicious_public_integration_keys"] = [];

  const userTypes = root.user_types ?? {};
  for (const [userTypeId, userType] of Object.entries(userTypes)) {
    const userTypePointer = `/user_types/${userTypeId}`;
    pushEntry(state, userTypeId, userTypePointer, "user_type", undefined, {
      display: (getString(userType.display) ?? userTypeId) as JsonValue,
    });

    const fields = getRecord(userType.fields);
    if (fields) {
      for (const [fieldId, fieldUnknown] of Object.entries(fields)) {
        const field = getRecord(fieldUnknown);
        const invId = fieldId;
        const pointer = `${userTypePointer}/fields/${fieldId}`;
        const fileSettings = getRecord(field?.file_settings);
        pushEntry(state, invId, pointer, "user_type.field", userTypeId, {
          field_id: fieldId,
          type: (getString(field?.type) ?? null) as JsonValue,
          currency_code: (getString(field?.currency) ?? null) as JsonValue,
          storage_path: (getString(fileSettings?.storage_path) ?? null) as JsonValue,
          mime_type: (getString(fileSettings?.mime_type) ?? null) as JsonValue,
        });
      }
    }

    const roles = getRecord(userType.privacy_role);
    if (roles) {
      for (const [roleId, roleUnknown] of Object.entries(roles)) {
        const role = getRecord(roleUnknown);
        const invId = `privacy_role:${userTypeId}:${roleId}`;
        const rawCondition = role?.condition ?? null;
        let conditionTree: JsonValue | null = null;
        let conditionTypedAst: JsonValue | null = null;
        let conditionAstCoverage: JsonValue | null = null;
        let conditionAccessors: JsonValue[] = [];
        try {
          conditionTree = decodeMessageTree(rawCondition, {
            strict: true,
            runtimeAccessorCatalog: state.runtimeAccessorCatalog,
          }) as JsonValue;
          const typedAst = decodeMessageTreeTypedAst(rawCondition, {
            strict: true,
            customNameToId: state.customNameToId,
            runtimeAccessorCatalog: state.runtimeAccessorCatalog,
          });
          conditionTypedAst = typedAst as JsonValue;
          conditionAstCoverage = summarizeMessageTreeAstCoverage(typedAst) as unknown as JsonValue;
          conditionAccessors = decodeMessageTreeAccessors(rawCondition, {
            strict: true,
            runtimeAccessorCatalog: state.runtimeAccessorCatalog,
          }).map((accessor) =>
            accessorRefToJson(
              decodeAccessor(accessor, {
                customNameToId: state.customNameToId,
                runtimeAccessorCatalog: state.runtimeAccessorCatalog,
                strict: true,
              }),
            ),
          ) as JsonValue[];
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          state.errors.push(`privacy_role condition decode failed for ${invId}: ${detail}`);
        }
        const coverageRecord = isRecord(conditionAstCoverage) ? conditionAstCoverage : null;
        if (
          coverageRecord &&
          typeof coverageRecord.unknown_node_count === "number" &&
          coverageRecord.unknown_node_count > 0
        ) {
          state.errors.push(
            `privacy_role condition typed AST has unsupported nodes for ${invId} (unknown_node_count=${String(
              coverageRecord.unknown_node_count,
            )})`,
          );
        }
        if (conditionTree === null || conditionTypedAst === null || conditionAstCoverage === null) {
          state.errors.push(`privacy_role condition IR coverage incomplete for ${invId}`);
        }
        pushEntry(
          state,
          invId,
          `${userTypePointer}/privacy_role/${roleId}`,
          "privacy_role",
          userTypeId,
          {
            condition: rawCondition as JsonValue,
            condition_tree: conditionTree,
            condition_typed_ast: conditionTypedAst,
            condition_ast_coverage: conditionAstCoverage,
            condition_accessors: conditionAccessors,
          },
        );
      }
    }
  }

  const optionSets = root.option_sets ?? {};
  for (const [optionSetId, optionSet] of Object.entries(optionSets)) {
    const pointer = `/option_sets/${optionSetId}`;
    pushEntry(state, optionSetId, pointer, "option_set", undefined, {
      display: (getString(optionSet.display) ?? optionSetId) as JsonValue,
    });
    const values = getRecord(optionSet.values);
    if (!values) {
      continue;
    }
    for (const valueId of Object.keys(values)) {
      pushEntry(
        state,
        valueId,
        `${pointer}/values/${valueId}`,
        "option_set.value",
        optionSetId,
        { option_set_id: optionSetId, value_key: valueId },
      );
    }
  }

  const pages = root.pages ?? {};
  for (const [pageKey, page] of Object.entries(pages)) {
    const pageId = page.id ?? pageKey;
    const pagePointerParts = ["pages", pageKey];
    const pagePointer = toPointer(pagePointerParts);
    pushEntry(state, pageId, pagePointer, "page", undefined, {
      name: (getString(page.name) ?? pageKey) as JsonValue,
    });

    if (typeof page.style === "string" && page.style.length > 0) {
      pushEntry(
        state,
        `style_ref:${pageId}`,
        `${pagePointer}/style`,
        "style_ref",
        pageId,
        { style_target: page.style },
      );
    }

    const customStates = getRecord(page.custom_states);
    if (customStates) {
      for (const stateKey of Object.keys(customStates)) {
        pushEntry(
          state,
          `custom_state:${pageId}:${stateKey}`,
          `${pagePointer}/custom_states/${stateKey}`,
          "custom_state",
          pageId,
        );
      }
    }

    walkWorkflowCollection(
      state,
      getRecord(page.workflows) as Record<string, BubbleWorkflow> | undefined,
      [...pagePointerParts, "workflows"],
      pageId,
      "workflow",
      "workflow.action",
    );
    walkElementTree(
      state,
      getRecord(page.elements) as Record<string, BubbleElement> | undefined,
      [...pagePointerParts, "elements"],
      pageId,
    );
    walkTextExpressions(state, page, pagePointerParts, pageId);
  }

  const elementDefinitions = root.element_definitions ?? {};
  for (const [edefKey, edef] of Object.entries(elementDefinitions)) {
    const defId = edef.id ?? edefKey;
    const defPointerParts = ["element_definitions", edefKey];
    const defPointer = toPointer(defPointerParts);
    pushEntry(state, defId, defPointer, "element_definition");

    const fields = getRecord(edef.fields);
    if (fields) {
      for (const fieldKey of Object.keys(fields)) {
        pushEntry(
          state,
          `edef_field:${defId}:${fieldKey}`,
          `${defPointer}/fields/${fieldKey}`,
          "element_definition.field",
          defId,
        );
      }
    }
    const states = getRecord(edef.states);
    if (states) {
      for (const stateKey of Object.keys(states)) {
        pushEntry(
          state,
          `edef_state:${defId}:${stateKey}`,
          `${defPointer}/states/${stateKey}`,
          "element_definition.state",
          defId,
        );
      }
    }

    walkWorkflowCollection(
      state,
      getRecord(edef.workflows) as Record<string, BubbleWorkflow> | undefined,
      [...defPointerParts, "workflows"],
      defId,
      "element_definition.workflow",
      "element_definition.action",
    );
    walkElementTree(
      state,
      getRecord(edef.elements) as Record<string, BubbleElement> | undefined,
      [...defPointerParts, "elements"],
      defId,
    );
    walkTextExpressions(state, edef, defPointerParts, defId);
  }

  const apiEvents = root.api ?? {};
  for (const [apiKey, apiEvent] of Object.entries(apiEvents)) {
    const apiId = apiEvent.id ?? apiKey;
    const pointerParts = ["api", apiKey];
    const pointer = toPointer(pointerParts);
    const apiProperties = getRecord(apiEvent.properties) ?? {};
    const parameterDef = getRecord(apiProperties.parameter_def);
    const parameters = getRecord(apiProperties.parameters);
    const parameterCount =
      parameterDef !== undefined
        ? Object.keys(parameterDef).length
        : parameters !== undefined
          ? Object.keys(parameters).length
          : 0;
    pushEntry(state, apiId, pointer, "api_event", undefined, {
      event_type: (getString(apiEvent.type) ?? null) as JsonValue,
      data_type: (getString(apiProperties.data_type) ?? null) as JsonValue,
      expose: (getBoolean(apiProperties.expose) ?? null) as JsonValue,
      waiting_for_data: (getBoolean(apiProperties.waiting_for_data) ?? null) as JsonValue,
      auth_unecessary: (getBoolean(apiProperties.auth_unecessary) ?? null) as JsonValue,
      ignore_privacy_rules: (getBoolean(apiProperties.ignore_privacy_rules) ?? null) as JsonValue,
      parameter_count: parameterCount as JsonValue,
    });

    const actions = getRecord(apiEvent.actions);
    if (actions) {
      for (const [actionKey, actionUnknown] of Object.entries(actions)) {
        const action = getRecord(actionUnknown);
        const actionId = getString(action?.id) ?? `${apiId}:action:${actionKey}`;
        const actionProperties = getRecord(action?.properties) ?? {};
        const scheduleInSeconds =
          getFiniteNumber(actionProperties.time_span_for_schedule) ??
          getFiniteNumber(actionProperties.interval) ??
          getFiniteNumber(actionProperties.seconds);
        pushEntry(
          state,
          actionId,
          `${pointer}/actions/${actionKey}`,
          "api_event.action",
          apiId,
          {
            action_type: (getString(action?.type) ?? null) as JsonValue,
            scheduled_api_event_id: (getString(actionProperties.api_event) ?? null) as JsonValue,
            schedule_in_seconds: (scheduleInSeconds ?? null) as JsonValue,
          },
        );
      }
    }
  }

  const styles = getRecord(root.styles);
  if (styles) {
    for (const styleId of Object.keys(styles)) {
      pushEntry(state, styleId, `/styles/${styleId}`, "style");
    }
  }

  const mobileViews = getRecord(root.mobile_views);
  if (mobileViews) {
    for (const [mvKey, mvValue] of Object.entries(mobileViews)) {
      const id =
        isRecord(mvValue) && typeof mvValue.id === "string" ? mvValue.id : `mobile_view:${mvKey}`;
      pushEntry(state, id, `/mobile_views/${mvKey}`, "mobile_view");
    }
  }

  const clientSafe = getRecord(root.settings?.client_safe);
  if (clientSafe) {
    const singletonKeys = [
      "app_language",
      "pw_length",
      "pw_protection",
      "pw_require_capital_letter",
      "pw_require_number",
      "pw_require_special_char",
      "have_pw_policy",
      "restricted_google",
    ];
    for (const key of singletonKeys) {
      if (!Object.hasOwn(clientSafe, key)) {
        continue;
      }
      pushEntry(
        state,
        `settings_singleton:${key}`,
        `/settings/client_safe/${key}`,
        "settings_singleton",
      );
    }
    const featureFlags = clientSafe.feature_flags;
    if (Array.isArray(featureFlags)) {
      featureFlags.forEach((_item, index) => {
        pushEntry(
          state,
          `settings_singleton:feature_flags:${index}`,
          `/settings/client_safe/feature_flags/${index}`,
          "settings_singleton",
        );
      });
    }
    const sitemapPages = clientSafe.sitemap_pages;
    if (Array.isArray(sitemapPages)) {
      sitemapPages.forEach((_item, index) => {
        pushEntry(
          state,
          `settings_singleton:sitemap_pages:${index}`,
          `/settings/client_safe/sitemap_pages/${index}`,
          "settings_singleton",
        );
      });
    }

    const plugins = getRecord(clientSafe.plugins);
    if (plugins) {
      for (const pluginId of Object.keys(plugins)) {
        pushEntry(state, `plugin:${pluginId}`, `/settings/client_safe/plugins/${pluginId}`, "plugin");
      }
    }
    const colorTokens = getRecord(clientSafe.color_tokens);
    if (colorTokens) {
      for (const key of Object.keys(colorTokens)) {
        pushEntry(
          state,
          `color_token:${key}`,
          `/settings/client_safe/color_tokens/${key}`,
          "color_token",
        );
      }
    }
    const fontTokens = getRecord(clientSafe.font_tokens);
    if (fontTokens) {
      for (const key of Object.keys(fontTokens)) {
        pushEntry(
          state,
          `font_token:${key}`,
          `/settings/client_safe/font_tokens/${key}`,
          "font_token",
        );
      }
    }

    parseExternalCalls(state, root, clientSafe);
    const publicKeyScan = scanPublicIntegrationKeys(clientSafe, ["settings", "client_safe"]);
    suspiciousPublicKeys = publicKeyScan.suspicious_matches;
    for (const match of publicKeyScan.matches) {
      const meta: Record<string, JsonValue> = {
        value: match.value,
        suffix: match.suffix,
        match_source: match.match_source,
      };
      if (match.plugin_id_ref !== undefined) {
        meta.plugin_id_ref = match.plugin_id_ref;
      }
      pushEntry(state, `public_key:${match.key}`, match.pointer, "public_integration_key", undefined, meta);
    }
  }

  for (const secureKey of state.secureKeys) {
    pushEntry(
      state,
      secureKey,
      `/settings/secure/${secureKey}`,
      "secret_ref",
      undefined,
      { key_name: secureKey },
    );
  }

  walkCustomStatesAny(state, root, []);
  walkGenericDataBindings(state, root, []);

  const presentIds = new Set(state.entries.map((entry) => entry.id));
  const idToPath = root._index?.id_to_path ?? {};
  for (const [indexId, rawPath] of Object.entries(idToPath)) {
    if (presentIds.has(indexId)) {
      continue;
    }
    const pointer = typeof rawPath === "string" ? normalizeIndexPath(rawPath) : `/__index/id_to_path/${indexId}`;
    pushEntry(
      state,
      indexId,
      pointer,
      "index_only",
      undefined,
      { raw_path: rawPath },
    );
  }

  if (state.errors.length > 0) {
    throw new Error(
      `Inventory build failed with ${state.errors.length} error(s):\n${state.errors.join("\n")}`,
    );
  }

  const entryById = new Map(state.entries.map((entry) => [entry.id, entry]));
  for (const [entityId, fragment] of state.dataBindingByEntityId.entries()) {
    const entry = entryById.get(entityId);
    if (!entry) {
      continue;
    }
    entry.meta = {
      ...(entry.meta ?? {}),
      data_binding: fragment,
    };
  }
  for (const [entityId, fragments] of state.textExpressionsByEntityId.entries()) {
    const entry = entryById.get(entityId);
    if (!entry) {
      continue;
    }
    const sorted = [...fragments].sort((a, b) => a.pointer.localeCompare(b.pointer));
    entry.meta = {
      ...(entry.meta ?? {}),
      text_expressions: sorted as JsonValue,
    };
  }

  state.entries.sort((a, b) => {
    if (a.entity_class !== b.entity_class) {
      return a.entity_class.localeCompare(b.entity_class);
    }
    return a.id.localeCompare(b.id);
  });

  const inventory: InventoryFile = {
    entries: state.entries,
    reserved_view_classes: VIEW_CLASS_RESERVATION,
  };
  const lint: LintFile = {
    status: suspiciousPublicKeys.length > 0 ? "fail" : "pass",
    suspicious_public_integration_keys: suspiciousPublicKeys,
  };
  return {
    inventory,
    lint,
  };
}
