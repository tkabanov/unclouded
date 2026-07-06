"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitAllPhase6Scaffolds = emitAllPhase6Scaffolds;
var adr_scaffold_js_1 = require("./adr-scaffold.js");
var asyncapi_js_1 = require("./asyncapi.js");
var gherkin_js_1 = require("./gherkin.js");
var openapi_js_1 = require("./openapi.js");
var order_js_1 = require("./order.js");
var rtm_js_1 = require("./rtm.js");
var threat_dpia_js_1 = require("./threat-dpia.js");
var depgraph_js_1 = require("./depgraph.js");
var uds_js_1 = require("./uds.js");
var accessor_js_1 = require("../../decoders/accessor.js");
var message_tree_js_1 = require("../../decoders/message-tree.js");
var capabilities_js_1 = require("../../ir/capabilities.js");
function byIdIndex(entries) {
    return new Map(entries.map(function (entry) { return [entry.id, entry]; }));
}
function sanitizePathSegment(value) {
    return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}
function operationMethod(method) {
    if (typeof method !== "string" || method.length === 0) {
        return "post";
    }
    return method === "delete_method" ? "delete" : method.toLowerCase();
}
function sortedUnique(values) {
    return __spreadArray([], new Set(values), true).sort(function (a, b) { return a.localeCompare(b); });
}
function emptyManifestSummary() {
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
function migrationEntityClass(entityId) {
    var prefix = "entity_class:";
    if (!entityId.startsWith(prefix)) {
        return null;
    }
    var className = entityId.slice(prefix.length);
    return className.length > 0 ? className : null;
}
function asString(value) {
    return typeof value === "string" ? value : null;
}
function asNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function asBoolean(value) {
    return typeof value === "boolean" ? value : null;
}
function asStringArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter(function (item) { return typeof item === "string"; });
}
function assertNever(value) {
    throw new Error("Unhandled entity_class: ".concat(String(value)));
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseExternalCallId(entryId) {
    var _a;
    var prefix = "external_call:";
    if (!entryId.startsWith(prefix)) {
        return null;
    }
    var remainder = entryId.slice(prefix.length);
    var parts = remainder.split(":");
    if (parts.length < 2) {
        return null;
    }
    var namespaceId = (_a = parts[0]) !== null && _a !== void 0 ? _a : "";
    var callId = parts.slice(1).join(":");
    if (namespaceId.length === 0 || callId.length === 0) {
        return null;
    }
    return { namespaceId: namespaceId, callId: callId };
}
function parsePrivacyRoleId(entryId) {
    var prefix = "privacy_role:";
    if (!entryId.startsWith(prefix)) {
        return null;
    }
    var remainder = entryId.slice(prefix.length);
    var separator = remainder.indexOf(":");
    if (separator <= 0 || separator >= remainder.length - 1) {
        return null;
    }
    return {
        userTypeId: remainder.slice(0, separator),
        roleId: remainder.slice(separator + 1),
    };
}
function firstStyleRefTarget(refsByFromId, fromId) {
    var _a, _b;
    var refs = (_a = refsByFromId.get(fromId)) !== null && _a !== void 0 ? _a : [];
    var styleRef = refs.find(function (ref) { return ref.edge_kind === "style_ref"; });
    return (_b = styleRef === null || styleRef === void 0 ? void 0 : styleRef.to_id) !== null && _b !== void 0 ? _b : null;
}
function typedIrForEntry(entry, context) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27;
    var capabilities = (0, capabilities_js_1.capabilitiesForEntityClass)(entry.entity_class);
    var base = {
        id: entry.id,
        pointer: entry.pointer,
        capabilities: __spreadArray([], capabilities, true),
        requires_adrs: capabilities
            .flatMap(function (capability) { return (0, capabilities_js_1.requiresAdrForCapability)(capability); })
            .sort(function (a, b) { return a.localeCompare(b); }),
    };
    var meta = (_a = entry.meta) !== null && _a !== void 0 ? _a : {};
    var actionCount = ((_b = context.childrenByParentId.get(entry.id)) !== null && _b !== void 0 ? _b : []).filter(function (child) {
        return child.entity_class.endsWith(".action");
    }).length;
    switch (entry.entity_class) {
        case "user_type":
            return __assign(__assign({ kind: entry.entity_class }, base), { display: (_c = asString(meta.display)) !== null && _c !== void 0 ? _c : null });
        case "user_type.field":
            return __assign(__assign({ kind: entry.entity_class }, base), { field_id: (_d = asString(meta.field_id)) !== null && _d !== void 0 ? _d : entry.id, type: (_e = asString(meta.type)) !== null && _e !== void 0 ? _e : null, currency_code: (_f = asString(meta.currency_code)) !== null && _f !== void 0 ? _f : null, storage_path: (_g = asString(meta.storage_path)) !== null && _g !== void 0 ? _g : null, mime_type: (_h = asString(meta.mime_type)) !== null && _h !== void 0 ? _h : null });
        case "privacy_role": {
            var privacyRole = parsePrivacyRoleId(entry.id);
            var rawCondition = Object.hasOwn(meta, "condition") ? meta.condition : null;
            var conditionTree = Object.hasOwn(meta, "condition_tree")
                ? meta.condition_tree
                : (0, message_tree_js_1.decodeMessageTree)(rawCondition, {
                    strict: true,
                    runtimeAccessorCatalog: context.runtimeAccessorCatalog,
                });
            var conditionTypedAst = Object.hasOwn(meta, "condition_typed_ast")
                ? meta.condition_typed_ast
                : (0, message_tree_js_1.decodeMessageTreeTypedAst)(rawCondition, {
                    strict: true,
                    runtimeAccessorCatalog: context.runtimeAccessorCatalog,
                });
            var conditionAstCoverage = Object.hasOwn(meta, "condition_ast_coverage")
                ? meta.condition_ast_coverage
                : (0, message_tree_js_1.summarizeMessageTreeAstCoverage)((0, message_tree_js_1.decodeMessageTreeTypedAst)(rawCondition, {
                    strict: true,
                    runtimeAccessorCatalog: context.runtimeAccessorCatalog,
                }));
            var conditionAccessors = Array.isArray(meta.condition_accessors)
                ? __spreadArray([], meta.condition_accessors, true).filter(function (item) { return isRecord(item); })
                    .sort(function (a, b) {
                    var left = typeof a.raw === "string" ? a.raw : "";
                    var right = typeof b.raw === "string" ? b.raw : "";
                    return left.localeCompare(right);
                })
                : (0, message_tree_js_1.decodeMessageTreeAccessors)(rawCondition, {
                    strict: true,
                    runtimeAccessorCatalog: context.runtimeAccessorCatalog,
                })
                    .map(function (accessor) {
                    return (0, accessor_js_1.accessorRefToJson)((0, accessor_js_1.decodeAccessor)(accessor, {
                        runtimeAccessorCatalog: context.runtimeAccessorCatalog,
                        strict: true,
                    }));
                })
                    .sort(function (a, b) {
                    var left = typeof a.raw === "string" ? a.raw : "";
                    var right = typeof b.raw === "string" ? b.raw : "";
                    return left.localeCompare(right);
                });
            if (conditionTree === null || conditionTypedAst === null || !isRecord(conditionAstCoverage)) {
                throw new Error("privacy_role ".concat(entry.id, " missing condition typed AST coverage metadata"));
            }
            var unknownNodeCount = conditionAstCoverage.unknown_node_count;
            if (typeof unknownNodeCount !== "number" || unknownNodeCount !== 0) {
                throw new Error("privacy_role ".concat(entry.id, " condition typed AST has unsupported nodes (unknown_node_count=").concat(String(unknownNodeCount), ")"));
            }
            return __assign(__assign({ kind: entry.entity_class }, base), { role_id: (_j = privacyRole === null || privacyRole === void 0 ? void 0 : privacyRole.roleId) !== null && _j !== void 0 ? _j : entry.id, user_type_id: (_k = privacyRole === null || privacyRole === void 0 ? void 0 : privacyRole.userTypeId) !== null && _k !== void 0 ? _k : null, condition_tree: conditionTree, condition_typed_ast: conditionTypedAst, condition_ast_coverage: conditionAstCoverage, condition_accessors: conditionAccessors });
        }
        case "workflow":
        case "element_definition.workflow":
            var intervalSeconds = asNumber(meta.interval_seconds);
            var scheduled = intervalSeconds !== null
                ? {
                    frequency_iso8601: "PT".concat(Math.max(1, Math.round(intervalSeconds)), "S"),
                    expected_payload_bytes: 0,
                    retries: 0,
                    idempotent: false,
                    interval_seconds: intervalSeconds,
                }
                : null;
            return __assign(__assign({ kind: entry.entity_class }, base), { trigger_type: (_l = asString(meta.trigger_type)) !== null && _l !== void 0 ? _l : null, trigger_condition_type: (_m = asString(meta.trigger_condition_type)) !== null && _m !== void 0 ? _m : null, trigger_element_id: (_o = asString(meta.trigger_element_id)) !== null && _o !== void 0 ? _o : null, action_count: actionCount, scheduled: scheduled });
        case "workflow.action":
        case "element_definition.action":
            return __assign(__assign({ kind: entry.entity_class }, base), { action_type: (_p = asString(meta.action_type)) !== null && _p !== void 0 ? _p : null });
        case "api_event.action":
            return __assign(__assign({ kind: entry.entity_class }, base), { action_type: (_q = asString(meta.action_type)) !== null && _q !== void 0 ? _q : null, scheduled_api_event_id: (_r = asString(meta.scheduled_api_event_id)) !== null && _r !== void 0 ? _r : null, schedule_in_seconds: (_s = asNumber(meta.schedule_in_seconds)) !== null && _s !== void 0 ? _s : null });
        case "api_event":
            return __assign(__assign({ kind: entry.entity_class }, base), { method: operationMethod(meta.method), path: "/ops/".concat(sanitizePathSegment(entry.id)), action_count: actionCount, event_type: (_t = asString(meta.event_type)) !== null && _t !== void 0 ? _t : null, data_type: (_u = asString(meta.data_type)) !== null && _u !== void 0 ? _u : null, parameter_count: (_v = asNumber(meta.parameter_count)) !== null && _v !== void 0 ? _v : null, waiting_for_data: (_w = asBoolean(meta.waiting_for_data)) !== null && _w !== void 0 ? _w : null, auth_unecessary: (_x = asBoolean(meta.auth_unecessary)) !== null && _x !== void 0 ? _x : null, ignore_privacy_rules: (_y = asBoolean(meta.ignore_privacy_rules)) !== null && _y !== void 0 ? _y : null });
        case "external_http_call": {
            var externalCall = parseExternalCallId(entry.id);
            return __assign(__assign({ kind: entry.entity_class }, base), { method: operationMethod(meta.method), url: (_z = asString(meta.url)) !== null && _z !== void 0 ? _z : null, data_type: (_0 = asString(meta.data_type)) !== null && _0 !== void 0 ? _0 : null, body_type: (_1 = asString(meta.body_type)) !== null && _1 !== void 0 ? _1 : null, ret_value: (_2 = asString(meta.ret_value)) !== null && _2 !== void 0 ? _2 : null, response_schema_format: (_3 = asString(meta.response_schema_format)) !== null && _3 !== void 0 ? _3 : null, namespace_id: (_4 = externalCall === null || externalCall === void 0 ? void 0 : externalCall.namespaceId) !== null && _4 !== void 0 ? _4 : null, call_id: (_5 = externalCall === null || externalCall === void 0 ? void 0 : externalCall.callId) !== null && _5 !== void 0 ? _5 : null, data_binding: isRecord(meta.data_binding) ? meta.data_binding : null });
        }
        case "external_http_namespace":
        case "oauth_namespace":
            return __assign(__assign({ kind: entry.entity_class }, base), { auth_kind: (_6 = asString(meta.auth_kind)) !== null && _6 !== void 0 ? _6 : "none", token_url: (_7 = asString(meta.token_url)) !== null && _7 !== void 0 ? _7 : null, authorize_url: (_8 = asString(meta.authorize_url)) !== null && _8 !== void 0 ? _8 : null, redirect_uri: (_9 = asString(meta.redirect_uri)) !== null && _9 !== void 0 ? _9 : null, user_info_url: (_10 = asString(meta.user_info_url)) !== null && _10 !== void 0 ? _10 : null, client_id_env: (_11 = asString(meta.client_id_env)) !== null && _11 !== void 0 ? _11 : null, client_secret_env: (_12 = asString(meta.client_secret_env)) !== null && _12 !== void 0 ? _12 : null });
        case "page":
            return __assign(__assign({ kind: entry.entity_class }, base), { type: (_13 = asString(meta.type)) !== null && _13 !== void 0 ? _13 : null, style_ref: firstStyleRefTarget(context.refsByFromId, entry.id) });
        case "element":
        case "element_definition":
            return __assign(__assign({ kind: entry.entity_class }, base), { type: (_15 = (_14 = asString(meta.type)) !== null && _14 !== void 0 ? _14 : asString(meta.element_type)) !== null && _15 !== void 0 ? _15 : null, style_ref: firstStyleRefTarget(context.refsByFromId, entry.id) });
        case "element_definition.field":
        case "element_definition.state":
            return __assign({ kind: entry.entity_class }, base);
        case "mobile_view":
            return __assign(__assign({ kind: entry.entity_class }, base), { breakpoint: (_16 = asString(meta.breakpoint)) !== null && _16 !== void 0 ? _16 : null });
        case "option_set":
            return __assign(__assign({ kind: entry.entity_class }, base), { display: (_17 = asString(meta.display)) !== null && _17 !== void 0 ? _17 : null });
        case "option_set.value":
            return __assign(__assign({ kind: entry.entity_class }, base), { option_set_ref: (_18 = asString(meta.option_set_id)) !== null && _18 !== void 0 ? _18 : null, value: (_19 = asString(meta.value_key)) !== null && _19 !== void 0 ? _19 : null });
        case "style":
        case "style_ref":
            return __assign(__assign({ kind: entry.entity_class }, base), { style_id: (_21 = (_20 = asString(meta.style_id)) !== null && _20 !== void 0 ? _20 : asString(meta.style_target)) !== null && _21 !== void 0 ? _21 : entry.id });
        case "custom_state":
            var stateSuffix = entry.id.includes(":") ? entry.id.slice(entry.id.lastIndexOf(":") + 1) : null;
            return __assign(__assign({ kind: entry.entity_class }, base), { state_key: (_22 = asString(meta.state_key)) !== null && _22 !== void 0 ? _22 : stateSuffix });
        case "plugin":
            return __assign(__assign({ kind: entry.entity_class }, base), { plugin_id: (_23 = asString(meta.plugin_id)) !== null && _23 !== void 0 ? _23 : entry.id.replace(/^plugin:/, "") });
        case "color_token":
        case "font_token":
            var tokenName = entry.id.includes(":") ? entry.id.slice(entry.id.indexOf(":") + 1) : entry.id;
            return __assign(__assign({ kind: entry.entity_class }, base), { token_name: (_24 = asString(meta.name)) !== null && _24 !== void 0 ? _24 : tokenName });
        case "settings_singleton":
            return __assign(__assign({ kind: entry.entity_class }, base), { key_path: (_25 = asString(meta.key_path)) !== null && _25 !== void 0 ? _25 : entry.pointer });
        case "secret_ref":
            return __assign(__assign({ kind: entry.entity_class }, base), { key_name: entry.id, source_path: entry.pointer });
        case "public_integration_key":
            return __assign(__assign({ kind: entry.entity_class }, base), { suffix: (_26 = asString(meta.suffix)) !== null && _26 !== void 0 ? _26 : null, plugin_id_ref: (_27 = asString(meta.plugin_id_ref)) !== null && _27 !== void 0 ? _27 : null });
        case "index_only":
            return __assign(__assign({ kind: entry.entity_class }, base), { children: asStringArray(meta.children) });
        default:
            return assertNever(entry.entity_class);
    }
}
function refsByFromId(refs) {
    var _a;
    var byFrom = new Map();
    for (var _i = 0, refs_1 = refs; _i < refs_1.length; _i++) {
        var edge = refs_1[_i];
        var bucket = (_a = byFrom.get(edge.from_id)) !== null && _a !== void 0 ? _a : [];
        bucket.push(edge);
        byFrom.set(edge.from_id, bucket);
    }
    return byFrom;
}
function childrenByParentId(entries) {
    var _a;
    var byParent = new Map();
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
        var entry = entries_1[_i];
        if (!entry.parent_id) {
            continue;
        }
        var bucket = (_a = byParent.get(entry.parent_id)) !== null && _a !== void 0 ? _a : [];
        bucket.push(entry);
        byParent.set(entry.parent_id, bucket);
    }
    return byParent;
}
function renderManifest(inventory, views, byId, refsIndex) {
    var _a;
    var runtimeAccessorCatalog = (0, accessor_js_1.buildRuntimeAccessorCatalog)(inventory.entries.map(function (entry) {
        return entry.meta && Object.hasOwn(entry.meta, "condition") ? entry.meta.condition : null;
    }));
    var typedIrContext = {
        childrenByParentId: childrenByParentId(inventory.entries),
        runtimeAccessorCatalog: runtimeAccessorCatalog,
        refsByFromId: refsIndex,
    };
    var manifestIndex = new Map();
    var ensure = function (entityId) {
        var current = manifestIndex.get(entityId);
        if (current) {
            return current;
        }
        var created = { summary: emptyManifestSummary(), anchors: [] };
        manifestIndex.set(entityId, created);
        return created;
    };
    var push = function (entityId, key, value, anchors) {
        var _a;
        var slot = ensure(entityId);
        slot.summary[key].push(value);
        (_a = slot.anchors).push.apply(_a, anchors);
    };
    for (var _i = 0, _b = views.acceptance_scenarios; _i < _b.length; _i++) {
        var scenario = _b[_i];
        var fileName = sanitizePathSegment(scenario.scenario_id);
        push(scenario.workflow_ref, "acceptance_scenarios", scenario.scenario_id, [
            "agent/acceptance/".concat(fileName, ".feature#scenario:").concat(scenario.scenario_id),
        ]);
    }
    for (var _c = 0, _d = views.openapi_operations; _c < _d.length; _c++) {
        var operation = _d[_c];
        var source = byId.get(operation.source_id);
        var contractPath = operation.source_kind === "api_event"
            ? "agent/contracts/openapi-incoming.json"
            : "agent/contracts/openapi-outgoing.json";
        var method = operation.source_kind === "api_event" ? "post" : operationMethod((_a = source === null || source === void 0 ? void 0 : source.meta) === null || _a === void 0 ? void 0 : _a.method);
        var path = "/ops/".concat(sanitizePathSegment(operation.source_id));
        push(operation.source_id, "openapi_operations", operation.operation_id, [
            "".concat(contractPath, "#operationId:").concat(operation.operation_id),
            "".concat(contractPath, "#").concat(method, ":").concat(path),
        ]);
    }
    for (var _e = 0, _f = views.asyncapi_messages; _e < _f.length; _e++) {
        var message = _f[_e];
        var channel = (0, asyncapi_js_1.asyncApiChannelForNamespace)((0, asyncapi_js_1.parseExternalCallSourceId)(message.source_id).namespaceId);
        push(message.source_id, "asyncapi_messages", message.message_id, [
            "agent/contracts/asyncapi.json#message:".concat(message.message_id),
            "agent/contracts/asyncapi.json#channel:".concat(channel),
        ]);
    }
    for (var _g = 0, _h = views.uds_types; _g < _h.length; _g++) {
        var udsType = _h[_g];
        push(udsType.user_type_ref, "uds_types", udsType.id, [
            "agent/schema/uds.json#type:".concat(udsType.id),
            "agent/schema/uds.yaml#type:".concat(udsType.id),
        ]);
    }
    for (var _j = 0, _k = views.actors; _j < _k.length; _j++) {
        var actor = _k[_j];
        for (var _l = 0, _m = actor.privacy_role_refs; _l < _m.length; _l++) {
            var role = _m[_l];
            push(role, "threat_actors", actor.actor_id, [
                "docs/security/threat-model.md#actor:".concat(actor.actor_id),
                "agent/security/threat-index.json#actor:".concat(actor.actor_id),
            ]);
        }
    }
    for (var _o = 0, _p = views.data_flows; _o < _p.length; _o++) {
        var flow = _p[_o];
        push(flow.source_id, "data_flows", flow.flow_id, [
            "docs/security/threat-model.md#flow:".concat(flow.flow_id),
            "docs/privacy/dpia-lite.md#flow:".concat(flow.flow_id),
            "agent/security/threat-index.json#flow:".concat(flow.flow_id),
            "agent/security/dpia-index.json#flow:".concat(flow.flow_id),
        ]);
    }
    for (var _q = 0, _r = views.pii_categories; _q < _r.length; _q++) {
        var pii = _r[_q];
        push(pii.field_id, "pii_categories", pii.category, [
            "docs/privacy/dpia-lite.md#pii:".concat(pii.field_id),
            "agent/security/dpia-index.json#pii:".concat(pii.field_id),
        ]);
    }
    for (var _s = 0, _t = views.migration_adrs; _s < _t.length; _s++) {
        var adr = _t[_s];
        var className = migrationEntityClass(adr.entity_id);
        if (!className) {
            continue;
        }
        for (var _u = 0, _v = inventory.entries; _u < _v.length; _u++) {
            var entry = _v[_u];
            if (entry.entity_class !== className) {
                continue;
            }
            push(entry.id, "migration_adrs", adr.adr_id, [
                "docs/adr/".concat(sanitizePathSegment(adr.adr_id), ".md"),
                "agent/adr-index.json#adr:".concat(adr.adr_id),
            ]);
        }
    }
    var entities = inventory.entries
        .slice()
        .sort(function (a, b) { return a.id.localeCompare(b.id); })
        .map(function (entry) {
        var _a, _b, _c;
        var slot = manifestIndex.get(entry.id);
        var summary = (_a = slot === null || slot === void 0 ? void 0 : slot.summary) !== null && _a !== void 0 ? _a : emptyManifestSummary();
        var anchors = (_b = slot === null || slot === void 0 ? void 0 : slot.anchors) !== null && _b !== void 0 ? _b : [];
        return {
            id: entry.id,
            pointer: entry.pointer,
            entity_class: entry.entity_class,
            doc_anchors: sortedUnique(__spreadArray(["agent/rtm.csv#entity_id:".concat(entry.id)], anchors, true)),
            ir: typedIrForEntry(entry, typedIrContext),
            references: ((_c = refsIndex.get(entry.id)) !== null && _c !== void 0 ? _c : [])
                .slice()
                .sort(function (a, b) {
                if (a.edge_kind !== b.edge_kind) {
                    return a.edge_kind.localeCompare(b.edge_kind);
                }
                if (a.to_id !== b.to_id) {
                    return a.to_id.localeCompare(b.to_id);
                }
                return a.source_path.localeCompare(b.source_path);
            })
                .map(function (edge) { return ({
                edge_kind: edge.edge_kind,
                to_id: edge.to_id,
                source_path: edge.source_path,
            }); }),
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
    var doc = {
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
        entities: entities,
    };
    return "".concat(JSON.stringify(doc, null, 2), "\n");
}
function validateRtm(artifacts, inventory) {
    var _a;
    var rtm = artifacts.find(function (artifact) { return artifact.path === "agent/rtm.csv"; });
    if (!rtm) {
        return {
            name: "rtm-validate",
            pass: false,
            detail: "Missing agent/rtm.csv artifact.",
        };
    }
    var lines = rtm.content.trimEnd().split("\n");
    var header = (_a = lines[0]) !== null && _a !== void 0 ? _a : "";
    var expectedColumns = 11;
    var rowCount = lines.length - 1;
    if (rowCount !== inventory.entries.length) {
        return {
            name: "rtm-validate",
            pass: false,
            detail: "RTM rows mismatch: expected ".concat(inventory.entries.length, ", got ").concat(rowCount, "."),
        };
    }
    if (header.split(",").length !== expectedColumns) {
        return {
            name: "rtm-validate",
            pass: false,
            detail: "RTM header columns mismatch: expected ".concat(expectedColumns, "."),
        };
    }
    return {
        name: "rtm-validate",
        pass: true,
        detail: "RTM rows=".concat(rowCount, ", columns=").concat(expectedColumns, "."),
    };
}
function emitAllPhase6Scaffolds(inventory, views, refs) {
    if (refs === void 0) { refs = []; }
    var byId = byIdIndex(inventory.entries);
    var refsIndex = refsByFromId(refs);
    var userTypeFields = inventory.entries.filter(function (entry) { return entry.entity_class === "user_type.field"; });
    var artifacts = [];
    var checks = [];
    for (var _i = 0, PHASE6_EMITTER_ORDER_1 = order_js_1.PHASE6_EMITTER_ORDER; _i < PHASE6_EMITTER_ORDER_1.length; _i++) {
        var emitterName = PHASE6_EMITTER_ORDER_1[_i];
        switch (emitterName) {
            case "manifest": {
                var manifestContent = renderManifest(inventory, views, byId, refsIndex);
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
                artifacts.push.apply(artifacts, (0, gherkin_js_1.emitGherkinScaffold)(views.acceptance_scenarios));
                break;
            case "uds":
                artifacts.push.apply(artifacts, (0, uds_js_1.emitUdsScaffold)(views, byId, userTypeFields));
                break;
            case "openapi-incoming":
            case "openapi-outgoing":
                if (!artifacts.some(function (artifact) { return artifact.path === "agent/contracts/openapi-incoming.json"; })) {
                    artifacts.push.apply(artifacts, (0, openapi_js_1.emitOpenApiScaffold)(views, byId));
                }
                break;
            case "asyncapi":
                artifacts.push.apply(artifacts, (0, asyncapi_js_1.emitAsyncApiScaffold)(views));
                break;
            case "adr-scaffold":
                artifacts.push.apply(artifacts, (0, adr_scaffold_js_1.emitAdrScaffold)(views));
                break;
            case "threat-model":
                artifacts.push.apply(artifacts, (0, threat_dpia_js_1.emitThreatModelScaffold)(views));
                break;
            case "dpia":
                artifacts.push.apply(artifacts, (0, threat_dpia_js_1.emitDpiaScaffold)(views));
                break;
            case "depgraph":
                artifacts.push.apply(artifacts, (0, depgraph_js_1.emitDepgraphScaffold)(inventory, refs, views));
                break;
            case "rtm":
                artifacts.push.apply(artifacts, (0, rtm_js_1.emitRtmScaffold)(inventory, views));
                break;
            case "rtm-validate":
                checks.push(validateRtm(artifacts, inventory));
                break;
            default: {
                var exhaustive = emitterName;
                throw new Error("Unhandled emitter ".concat(String(exhaustive)));
            }
        }
    }
    artifacts.sort(function (a, b) { return a.path.localeCompare(b.path); });
    return { artifacts: artifacts, checks: checks };
}
