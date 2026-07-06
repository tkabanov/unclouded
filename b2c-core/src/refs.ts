import type { BubbleRoot, InventoryEntry, InventoryFile, JsonValue, RefEdge } from "./types.js";
import { buildRuntimeAccessorCatalog, decodeAccessor } from "./decoders/accessor.js";
import { decodeMessageTreeAccessors } from "./decoders/message-tree.js";
import { getRecord, getString, isRecord } from "./utils/index.js";

function getValueAtPointer(root: JsonValue | BubbleRoot, pointer: string): JsonValue | undefined {
  if (!pointer.startsWith("/")) {
    return undefined;
  }
  const parts = pointer
    .split("/")
    .slice(1)
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));

  let cursor: unknown = root;
  for (const part of parts) {
    if (Array.isArray(cursor)) {
      const index = Number(part);
      if (!Number.isInteger(index)) {
        return undefined;
      }
      cursor = cursor[index];
      continue;
    }
    if (!isRecord(cursor)) {
      return undefined;
    }
    cursor = cursor[part];
  }
  return cursor as JsonValue | undefined;
}

function externalCallMaps(root: BubbleRoot): {
  accessorToCall: Map<string, string>;
  retValueToCall: Map<string, string>;
  nsToId: Map<string, string>;
  callByNsAndCall: Map<string, string>;
} {
  const accessorToCall = new Map<string, string>();
  const retValueToCall = new Map<string, string>();
  const nsToId = new Map<string, string>();
  const callByNsAndCall = new Map<string, string>();
  const apiConnector = getRecord(root.settings?.client_safe?.apiconnector2);
  if (!apiConnector) {
    return { accessorToCall, retValueToCall, nsToId, callByNsAndCall };
  }
  for (const [nsId, nsUnknown] of Object.entries(apiConnector)) {
    nsToId.set(nsId, `external_ns:${nsId}`);
    const ns = getRecord(nsUnknown);
    if (!ns) {
      continue;
    }
    const calls = getRecord(ns.calls);
    if (!calls) {
      continue;
    }
    for (const [callId, callUnknown] of Object.entries(calls)) {
      const call = getRecord(callUnknown);
      if (!call) {
        continue;
      }
      const invCallId = `external_call:${nsId}:${callId}`;
      callByNsAndCall.set(`${nsId}::${callId}`, invCallId);
      const retValue = getString(call.ret_value);
      if (retValue) {
        retValueToCall.set(retValue, invCallId);
      }
      const typesRaw = getString(call.types);
      if (!typesRaw) {
        continue;
      }
      try {
        const parsed = JSON.parse(typesRaw) as unknown;
        if (!isRecord(parsed)) {
          continue;
        }
        for (const schema of Object.values(parsed)) {
          if (!isRecord(schema)) {
            continue;
          }
          const fields = getRecord(schema.fields);
          if (!fields) {
            continue;
          }
          for (const accessorName of Object.keys(fields)) {
            if (accessorName.startsWith("_api_c2_")) {
              accessorToCall.set(accessorName, invCallId);
            }
          }
        }
      } catch {
        // keep processing other calls
      }
    }
  }
  return { accessorToCall, retValueToCall, nsToId, callByNsAndCall };
}

function requireTargetId(
  targetId: string | undefined,
  context: string,
): string {
  if (targetId) {
    return targetId;
  }
  throw new Error(`Unresolved inventory target: ${context}`);
}

function contentTypeRequiresRef(kind: string | undefined): boolean {
  if (kind === undefined) {
    return false;
  }
  return kind !== "opaque_scalar" && kind !== "url_param";
}

export function buildRefs(root: BubbleRoot, inventory: InventoryFile): RefEdge[] {
  const edges: RefEdge[] = [];
  const inventoryByClass = new Map<string, InventoryEntry[]>();
  const inventoryById = new Map<string, InventoryEntry>();
  for (const entry of inventory.entries) {
    inventoryById.set(entry.id, entry);
    const list = inventoryByClass.get(entry.entity_class) ?? [];
    list.push(entry);
    inventoryByClass.set(entry.entity_class, list);
  }

  const { accessorToCall, retValueToCall, nsToId, callByNsAndCall } = externalCallMaps(root);

  for (const styleRef of inventoryByClass.get("style_ref") ?? []) {
    const styleTarget = styleRef.meta?.style_target;
    if (typeof styleTarget !== "string") {
      continue;
    }
    if (!inventoryById.has(styleTarget)) {
      continue;
    }
    if (!styleRef.parent_id) {
      continue;
    }
    edges.push({
      from_id: styleRef.parent_id,
      to_id: styleTarget,
      edge_kind: "style_ref",
      source_path: styleRef.pointer,
    });
  }

  const customStates = inventoryByClass.get("custom_state") ?? [];
  const customStateSuffixToId = new Map<string, string>();
  for (const state of customStates) {
    const parts = state.id.split(":");
    const suffix = parts[parts.length - 1] ?? "";
    customStateSuffixToId.set(suffix, state.id);
  }
  const optionValueByKey = new Map<string, string>();
  for (const optionValue of inventoryByClass.get("option_set.value") ?? []) {
    const key = getString(optionValue.meta?.value_key);
    if (key) {
      optionValueByKey.set(key, optionValue.id);
    }
  }
  const optionSetById = new Map<string, string>();
  for (const optionSet of inventoryByClass.get("option_set") ?? []) {
    optionSetById.set(optionSet.id, optionSet.id);
  }
  const customNameToId = getRecord(root._index?.custom_name_to_id) ?? null;
  const runtimeAccessorCatalog = buildRuntimeAccessorCatalog(root);

  const bindingHosts = inventory.entries.filter((entry) => isRecord(entry.meta?.data_binding));
  for (const host of bindingHosts) {
    const fragment = getRecord(host.meta?.data_binding) ?? {};
    const bindingKind = getString(fragment.kind);
    const contentType = getString(fragment.content_type);
    if (typeof contentType === "string" && contentTypeRequiresRef(bindingKind)) {
      let target: string | undefined;
      if (inventoryById.has(contentType)) {
        target = contentType;
      } else if (retValueToCall.has(contentType)) {
        target = retValueToCall.get(contentType);
      } else if (inventoryById.has(`option_set:${contentType}`)) {
        target = `option_set:${contentType}`;
      }
      if (target) {
        edges.push({
          from_id: host.id,
          to_id: target,
          edge_kind: "data_binding_content_type",
          source_path: `${host.pointer}/properties`,
        });
      }
    }

    const properties = getValueAtPointer(root, `${host.pointer}/properties`);
    const propertiesRecord = getRecord(properties);
    const dataSource = propertiesRecord?.data_source;
    const names = decodeMessageTreeAccessors(dataSource, {
      strict: true,
      runtimeAccessorCatalog,
    });
    for (const rawAccessor of names) {
      const accessor = decodeAccessor(rawAccessor, {
        customNameToId,
        runtimeAccessorCatalog,
        strict: true,
      });
      if (accessor.kind === "external_api_field") {
        const toId = requireTargetId(
          accessorToCall.get(accessor.raw),
          `external_call_response_field host=${host.id} accessor=${accessor.raw}`,
        );
        edges.push({
          from_id: host.id,
          to_id: toId,
          edge_kind: "external_call_response_field",
          source_path: `${host.pointer}/properties/data_source`,
        });
      }
      if (accessor.kind === "custom_state_ref") {
        const stateKey = accessor.resolver.lookup_key;
        const toId = requireTargetId(
          stateKey ? customStateSuffixToId.get(stateKey) : undefined,
          `data_binding_custom_state_ref host=${host.id} accessor=${accessor.raw}`,
        );
        edges.push({
          from_id: host.id,
          to_id: toId,
          edge_kind: "data_binding_custom_state_ref",
          source_path: `${host.pointer}/properties/data_source`,
        });
      }
      if (accessor.kind === "privacy_role_option") {
        const optionKey = accessor.resolver.lookup_key;
        requireTargetId(
          optionKey
            ? (optionValueByKey.get(optionKey) ?? optionSetById.get(optionKey))
            : undefined,
          `privacy_role_option host=${host.id} accessor=${accessor.raw}`,
        );
      }
      if (accessor.kind === "custom_name_lookup") {
        const resolvedCustomStates = accessor.resolver.candidate_ids.filter((candidateId) => {
          const candidate = inventoryById.get(candidateId);
          return candidate?.entity_class === "custom_state";
        });
        if (resolvedCustomStates.length === 0) {
          throw new Error(
            `Unresolved inventory target: custom_name_lookup host=${host.id} accessor=${accessor.raw}`,
          );
        }
        for (const toId of resolvedCustomStates) {
          edges.push({
            from_id: host.id,
            to_id: toId,
            edge_kind: "data_binding_custom_state_ref",
            source_path: `${host.pointer}/properties/data_source`,
          });
        }
      }
    }
  }

  const apiConnector = getRecord(root.settings?.client_safe?.apiconnector2);
  if (!apiConnector) {
    return dedupeEdges(edges);
  }
  const secure = getRecord(root.settings?.secure) ?? {};

  for (const [nsId, nsUnknown] of Object.entries(apiConnector)) {
    const ns = getRecord(nsUnknown);
    if (!ns) {
      continue;
    }
    const nsInvId = nsToId.get(nsId);
    const calls = getRecord(ns.calls) ?? {};

    const oauthUserDataCall = getString(ns.oauth_user_data_call);
    if (nsInvId && getString(ns.auth) === "oauth2_user" && oauthUserDataCall) {
      for (const [callId, callUnknown] of Object.entries(calls)) {
        const call = getRecord(callUnknown);
        if (!call) {
          continue;
        }
        const url = getString(call.url);
        if (!url || url !== oauthUserDataCall) {
          continue;
        }
        const targetId = callByNsAndCall.get(`${nsId}::${callId}`);
        if (!targetId) {
          continue;
        }
        edges.push({
          from_id: nsInvId,
          to_id: targetId,
          edge_kind: "oauth_user_data_call",
          source_path: `/settings/client_safe/apiconnector2/${nsId}/oauth_user_data_call`,
        });
      }
    }

    for (const [callId, callUnknown] of Object.entries(calls)) {
      const call = getRecord(callUnknown);
      if (!call) {
        continue;
      }
      const callInvId = callByNsAndCall.get(`${nsId}::${callId}`);
      if (!callInvId) {
        continue;
      }
      const headers = getRecord(call.headers) ?? {};
      for (const [headerId, headerUnknown] of Object.entries(headers)) {
        const header = getRecord(headerUnknown);
        if (!header || header.private !== true) {
          continue;
        }
        const keyA = `${nsId}__${callId}__${headerId}`;
        const keyB = headerId;
        const secureKey = Object.hasOwn(secure, keyA)
          ? keyA
          : Object.hasOwn(secure, keyB)
            ? keyB
            : null;
        if (!secureKey) {
          continue;
        }
        edges.push({
          from_id: callInvId,
          to_id: secureKey,
          edge_kind: "external_call_secret",
          source_path: `/settings/client_safe/apiconnector2/${nsId}/calls/${callId}/headers/${headerId}`,
        });
      }

      const bodyParams = getRecord(call.body_params) ?? {};
      for (const [paramId, paramUnknown] of Object.entries(bodyParams)) {
        const param = getRecord(paramUnknown);
        if (!param || param.private !== true) {
          continue;
        }
        const keyA = `${nsId}__${callId}__${paramId}`;
        const keyB = paramId;
        const secureKey = Object.hasOwn(secure, keyA)
          ? keyA
          : Object.hasOwn(secure, keyB)
            ? keyB
            : null;
        if (!secureKey) {
          continue;
        }
        edges.push({
          from_id: callInvId,
          to_id: secureKey,
          edge_kind: "external_call_secret",
          source_path: `/settings/client_safe/apiconnector2/${nsId}/calls/${callId}/body_params/${paramId}`,
        });
      }
    }
  }

  return dedupeEdges(edges);
}

function dedupeEdges(edges: RefEdge[]): RefEdge[] {
  const seen = new Set<string>();
  const out: RefEdge[] = [];
  for (const edge of edges) {
    const key = `${edge.edge_kind}|${edge.from_id}|${edge.to_id}|${edge.source_path}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(edge);
  }
  out.sort((a, b) => {
    if (a.edge_kind !== b.edge_kind) {
      return a.edge_kind.localeCompare(b.edge_kind);
    }
    if (a.from_id !== b.from_id) {
      return a.from_id.localeCompare(b.from_id);
    }
    if (a.to_id !== b.to_id) {
      return a.to_id.localeCompare(b.to_id);
    }
    return a.source_path.localeCompare(b.source_path);
  });
  return out;
}
