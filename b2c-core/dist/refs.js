"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRefs = buildRefs;
var accessor_js_1 = require("./decoders/accessor.js");
var message_tree_js_1 = require("./decoders/message-tree.js");
var index_js_1 = require("./utils/index.js");
function getValueAtPointer(root, pointer) {
    if (!pointer.startsWith("/")) {
        return undefined;
    }
    var parts = pointer
        .split("/")
        .slice(1)
        .map(function (part) { return part.replaceAll("~1", "/").replaceAll("~0", "~"); });
    var cursor = root;
    for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
        var part = parts_1[_i];
        if (Array.isArray(cursor)) {
            var index = Number(part);
            if (!Number.isInteger(index)) {
                return undefined;
            }
            cursor = cursor[index];
            continue;
        }
        if (!(0, index_js_1.isRecord)(cursor)) {
            return undefined;
        }
        cursor = cursor[part];
    }
    return cursor;
}
function externalCallMaps(root) {
    var _a, _b;
    var accessorToCall = new Map();
    var retValueToCall = new Map();
    var nsToId = new Map();
    var callByNsAndCall = new Map();
    var apiConnector = (0, index_js_1.getRecord)((_b = (_a = root.settings) === null || _a === void 0 ? void 0 : _a.client_safe) === null || _b === void 0 ? void 0 : _b.apiconnector2);
    if (!apiConnector) {
        return { accessorToCall: accessorToCall, retValueToCall: retValueToCall, nsToId: nsToId, callByNsAndCall: callByNsAndCall };
    }
    for (var _i = 0, _c = Object.entries(apiConnector); _i < _c.length; _i++) {
        var _d = _c[_i], nsId = _d[0], nsUnknown = _d[1];
        nsToId.set(nsId, "external_ns:".concat(nsId));
        var ns = (0, index_js_1.getRecord)(nsUnknown);
        if (!ns) {
            continue;
        }
        var calls = (0, index_js_1.getRecord)(ns.calls);
        if (!calls) {
            continue;
        }
        for (var _e = 0, _f = Object.entries(calls); _e < _f.length; _e++) {
            var _g = _f[_e], callId = _g[0], callUnknown = _g[1];
            var call = (0, index_js_1.getRecord)(callUnknown);
            if (!call) {
                continue;
            }
            var invCallId = "external_call:".concat(nsId, ":").concat(callId);
            callByNsAndCall.set("".concat(nsId, "::").concat(callId), invCallId);
            var retValue = (0, index_js_1.getString)(call.ret_value);
            if (retValue) {
                retValueToCall.set(retValue, invCallId);
            }
            var typesRaw = (0, index_js_1.getString)(call.types);
            if (!typesRaw) {
                continue;
            }
            try {
                var parsed = JSON.parse(typesRaw);
                if (!(0, index_js_1.isRecord)(parsed)) {
                    continue;
                }
                for (var _h = 0, _j = Object.values(parsed); _h < _j.length; _h++) {
                    var schema = _j[_h];
                    if (!(0, index_js_1.isRecord)(schema)) {
                        continue;
                    }
                    var fields = (0, index_js_1.getRecord)(schema.fields);
                    if (!fields) {
                        continue;
                    }
                    for (var _k = 0, _l = Object.keys(fields); _k < _l.length; _k++) {
                        var accessorName = _l[_k];
                        if (accessorName.startsWith("_api_c2_")) {
                            accessorToCall.set(accessorName, invCallId);
                        }
                    }
                }
            }
            catch (_m) {
                // keep processing other calls
            }
        }
    }
    return { accessorToCall: accessorToCall, retValueToCall: retValueToCall, nsToId: nsToId, callByNsAndCall: callByNsAndCall };
}
function requireTargetId(targetId, context) {
    if (targetId) {
        return targetId;
    }
    throw new Error("Unresolved inventory target: ".concat(context));
}
function contentTypeRequiresRef(kind) {
    if (kind === undefined) {
        return false;
    }
    return kind !== "opaque_scalar" && kind !== "url_param";
}
function buildRefs(root, inventory) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
    var edges = [];
    var inventoryByClass = new Map();
    var inventoryById = new Map();
    for (var _i = 0, _w = inventory.entries; _i < _w.length; _i++) {
        var entry = _w[_i];
        inventoryById.set(entry.id, entry);
        var list = (_a = inventoryByClass.get(entry.entity_class)) !== null && _a !== void 0 ? _a : [];
        list.push(entry);
        inventoryByClass.set(entry.entity_class, list);
    }
    var _x = externalCallMaps(root), accessorToCall = _x.accessorToCall, retValueToCall = _x.retValueToCall, nsToId = _x.nsToId, callByNsAndCall = _x.callByNsAndCall;
    for (var _y = 0, _z = (_b = inventoryByClass.get("style_ref")) !== null && _b !== void 0 ? _b : []; _y < _z.length; _y++) {
        var styleRef = _z[_y];
        var styleTarget = (_c = styleRef.meta) === null || _c === void 0 ? void 0 : _c.style_target;
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
    var customStates = (_d = inventoryByClass.get("custom_state")) !== null && _d !== void 0 ? _d : [];
    var customStateSuffixToId = new Map();
    for (var _0 = 0, customStates_1 = customStates; _0 < customStates_1.length; _0++) {
        var state = customStates_1[_0];
        var parts = state.id.split(":");
        var suffix = (_e = parts[parts.length - 1]) !== null && _e !== void 0 ? _e : "";
        customStateSuffixToId.set(suffix, state.id);
    }
    var optionValueByKey = new Map();
    for (var _1 = 0, _2 = (_f = inventoryByClass.get("option_set.value")) !== null && _f !== void 0 ? _f : []; _1 < _2.length; _1++) {
        var optionValue = _2[_1];
        var key = (0, index_js_1.getString)((_g = optionValue.meta) === null || _g === void 0 ? void 0 : _g.value_key);
        if (key) {
            optionValueByKey.set(key, optionValue.id);
        }
    }
    var optionSetById = new Map();
    for (var _3 = 0, _4 = (_h = inventoryByClass.get("option_set")) !== null && _h !== void 0 ? _h : []; _3 < _4.length; _3++) {
        var optionSet = _4[_3];
        optionSetById.set(optionSet.id, optionSet.id);
    }
    var customNameToId = (_k = (0, index_js_1.getRecord)((_j = root._index) === null || _j === void 0 ? void 0 : _j.custom_name_to_id)) !== null && _k !== void 0 ? _k : null;
    var runtimeAccessorCatalog = (0, accessor_js_1.buildRuntimeAccessorCatalog)(root);
    var bindingHosts = inventory.entries.filter(function (entry) { var _a; return (0, index_js_1.isRecord)((_a = entry.meta) === null || _a === void 0 ? void 0 : _a.data_binding); });
    for (var _5 = 0, bindingHosts_1 = bindingHosts; _5 < bindingHosts_1.length; _5++) {
        var host = bindingHosts_1[_5];
        var fragment = (_m = (0, index_js_1.getRecord)((_l = host.meta) === null || _l === void 0 ? void 0 : _l.data_binding)) !== null && _m !== void 0 ? _m : {};
        var bindingKind = (0, index_js_1.getString)(fragment.kind);
        var contentType = (0, index_js_1.getString)(fragment.content_type);
        if (typeof contentType === "string" && contentTypeRequiresRef(bindingKind)) {
            var target = void 0;
            if (inventoryById.has(contentType)) {
                target = contentType;
            }
            else if (retValueToCall.has(contentType)) {
                target = retValueToCall.get(contentType);
            }
            else if (inventoryById.has("option_set:".concat(contentType))) {
                target = "option_set:".concat(contentType);
            }
            if (target) {
                edges.push({
                    from_id: host.id,
                    to_id: target,
                    edge_kind: "data_binding_content_type",
                    source_path: "".concat(host.pointer, "/properties"),
                });
            }
        }
        var properties = getValueAtPointer(root, "".concat(host.pointer, "/properties"));
        var propertiesRecord = (0, index_js_1.getRecord)(properties);
        var dataSource = propertiesRecord === null || propertiesRecord === void 0 ? void 0 : propertiesRecord.data_source;
        var names = (0, message_tree_js_1.decodeMessageTreeAccessors)(dataSource, {
            strict: true,
            runtimeAccessorCatalog: runtimeAccessorCatalog,
        });
        for (var _6 = 0, names_1 = names; _6 < names_1.length; _6++) {
            var rawAccessor = names_1[_6];
            var accessor = (0, accessor_js_1.decodeAccessor)(rawAccessor, {
                customNameToId: customNameToId,
                runtimeAccessorCatalog: runtimeAccessorCatalog,
                strict: true,
            });
            if (accessor.kind === "external_api_field") {
                var toId = requireTargetId(accessorToCall.get(accessor.raw), "external_call_response_field host=".concat(host.id, " accessor=").concat(accessor.raw));
                edges.push({
                    from_id: host.id,
                    to_id: toId,
                    edge_kind: "external_call_response_field",
                    source_path: "".concat(host.pointer, "/properties/data_source"),
                });
            }
            if (accessor.kind === "custom_state_ref") {
                var stateKey = accessor.resolver.lookup_key;
                var toId = requireTargetId(stateKey ? customStateSuffixToId.get(stateKey) : undefined, "data_binding_custom_state_ref host=".concat(host.id, " accessor=").concat(accessor.raw));
                edges.push({
                    from_id: host.id,
                    to_id: toId,
                    edge_kind: "data_binding_custom_state_ref",
                    source_path: "".concat(host.pointer, "/properties/data_source"),
                });
            }
            if (accessor.kind === "privacy_role_option") {
                var optionKey = accessor.resolver.lookup_key;
                requireTargetId(optionKey
                    ? ((_o = optionValueByKey.get(optionKey)) !== null && _o !== void 0 ? _o : optionSetById.get(optionKey))
                    : undefined, "privacy_role_option host=".concat(host.id, " accessor=").concat(accessor.raw));
            }
            if (accessor.kind === "custom_name_lookup") {
                var resolvedCustomStates = accessor.resolver.candidate_ids.filter(function (candidateId) {
                    var candidate = inventoryById.get(candidateId);
                    return (candidate === null || candidate === void 0 ? void 0 : candidate.entity_class) === "custom_state";
                });
                if (resolvedCustomStates.length === 0) {
                    throw new Error("Unresolved inventory target: custom_name_lookup host=".concat(host.id, " accessor=").concat(accessor.raw));
                }
                for (var _7 = 0, resolvedCustomStates_1 = resolvedCustomStates; _7 < resolvedCustomStates_1.length; _7++) {
                    var toId = resolvedCustomStates_1[_7];
                    edges.push({
                        from_id: host.id,
                        to_id: toId,
                        edge_kind: "data_binding_custom_state_ref",
                        source_path: "".concat(host.pointer, "/properties/data_source"),
                    });
                }
            }
        }
    }
    var apiConnector = (0, index_js_1.getRecord)((_q = (_p = root.settings) === null || _p === void 0 ? void 0 : _p.client_safe) === null || _q === void 0 ? void 0 : _q.apiconnector2);
    if (!apiConnector) {
        return dedupeEdges(edges);
    }
    var secure = (_s = (0, index_js_1.getRecord)((_r = root.settings) === null || _r === void 0 ? void 0 : _r.secure)) !== null && _s !== void 0 ? _s : {};
    for (var _8 = 0, _9 = Object.entries(apiConnector); _8 < _9.length; _8++) {
        var _10 = _9[_8], nsId = _10[0], nsUnknown = _10[1];
        var ns = (0, index_js_1.getRecord)(nsUnknown);
        if (!ns) {
            continue;
        }
        var nsInvId = nsToId.get(nsId);
        var calls = (_t = (0, index_js_1.getRecord)(ns.calls)) !== null && _t !== void 0 ? _t : {};
        var oauthUserDataCall = (0, index_js_1.getString)(ns.oauth_user_data_call);
        if (nsInvId && (0, index_js_1.getString)(ns.auth) === "oauth2_user" && oauthUserDataCall) {
            for (var _11 = 0, _12 = Object.entries(calls); _11 < _12.length; _11++) {
                var _13 = _12[_11], callId = _13[0], callUnknown = _13[1];
                var call = (0, index_js_1.getRecord)(callUnknown);
                if (!call) {
                    continue;
                }
                var url = (0, index_js_1.getString)(call.url);
                if (!url || url !== oauthUserDataCall) {
                    continue;
                }
                var targetId = callByNsAndCall.get("".concat(nsId, "::").concat(callId));
                if (!targetId) {
                    continue;
                }
                edges.push({
                    from_id: nsInvId,
                    to_id: targetId,
                    edge_kind: "oauth_user_data_call",
                    source_path: "/settings/client_safe/apiconnector2/".concat(nsId, "/oauth_user_data_call"),
                });
            }
        }
        for (var _14 = 0, _15 = Object.entries(calls); _14 < _15.length; _14++) {
            var _16 = _15[_14], callId = _16[0], callUnknown = _16[1];
            var call = (0, index_js_1.getRecord)(callUnknown);
            if (!call) {
                continue;
            }
            var callInvId = callByNsAndCall.get("".concat(nsId, "::").concat(callId));
            if (!callInvId) {
                continue;
            }
            var headers = (_u = (0, index_js_1.getRecord)(call.headers)) !== null && _u !== void 0 ? _u : {};
            for (var _17 = 0, _18 = Object.entries(headers); _17 < _18.length; _17++) {
                var _19 = _18[_17], headerId = _19[0], headerUnknown = _19[1];
                var header = (0, index_js_1.getRecord)(headerUnknown);
                if (!header || header.private !== true) {
                    continue;
                }
                var keyA = "".concat(nsId, "__").concat(callId, "__").concat(headerId);
                var keyB = headerId;
                var secureKey = Object.hasOwn(secure, keyA)
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
                    source_path: "/settings/client_safe/apiconnector2/".concat(nsId, "/calls/").concat(callId, "/headers/").concat(headerId),
                });
            }
            var bodyParams = (_v = (0, index_js_1.getRecord)(call.body_params)) !== null && _v !== void 0 ? _v : {};
            for (var _20 = 0, _21 = Object.entries(bodyParams); _20 < _21.length; _20++) {
                var _22 = _21[_20], paramId = _22[0], paramUnknown = _22[1];
                var param = (0, index_js_1.getRecord)(paramUnknown);
                if (!param || param.private !== true) {
                    continue;
                }
                var keyA = "".concat(nsId, "__").concat(callId, "__").concat(paramId);
                var keyB = paramId;
                var secureKey = Object.hasOwn(secure, keyA)
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
                    source_path: "/settings/client_safe/apiconnector2/".concat(nsId, "/calls/").concat(callId, "/body_params/").concat(paramId),
                });
            }
        }
    }
    return dedupeEdges(edges);
}
function dedupeEdges(edges) {
    var seen = new Set();
    var out = [];
    for (var _i = 0, edges_1 = edges; _i < edges_1.length; _i++) {
        var edge = edges_1[_i];
        var key = "".concat(edge.edge_kind, "|").concat(edge.from_id, "|").concat(edge.to_id, "|").concat(edge.source_path);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        out.push(edge);
    }
    out.sort(function (a, b) {
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
