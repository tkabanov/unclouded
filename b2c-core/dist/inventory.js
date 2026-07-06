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
exports.buildInventory = buildInventory;
var accessor_js_1 = require("./decoders/accessor.js");
var data_source_js_1 = require("./decoders/data-source.js");
var message_tree_js_1 = require("./decoders/message-tree.js");
var text_expression_hosts_js_1 = require("./decoders/text-expression-hosts.js");
var public_keys_js_1 = require("./inventory/public-keys.js");
var index_js_1 = require("./utils/index.js");
var VIEW_CLASS_RESERVATION = [
    "acceptance_scenario",
    "openapi_operation",
    "asyncapi_message",
    "uds_type",
    "threat_actor",
    "data_flow",
    "migration_adr",
];
function normalizeIndexPath(rawPath) {
    var compact = rawPath.startsWith("/") ? rawPath.slice(1) : rawPath;
    if (compact.includes("%") || (compact.includes(".") && !compact.includes("/"))) {
        var canonical = compact
            .replace(/^%p3\./, "pages.")
            .replace(/^%ed\./, "element_definitions.")
            .replace(/^%api\./, "api.")
            .replace(/\.%el\./g, ".elements.")
            .replace(/\.%wf\./g, ".workflows.");
        var parts = canonical.split(".").filter(function (part) { return part.length > 0; });
        return "/".concat(parts.join("/"));
    }
    return rawPath.startsWith("/") ? rawPath : "/".concat(rawPath);
}
function pushEntry(state, id, pointer, entityClass, parentId, meta) {
    var uniqueKey = "".concat(entityClass, ":").concat(pointer);
    if (state.ids.has(uniqueKey)) {
        return;
    }
    state.ids.add(uniqueKey);
    var entry = {
        id: id,
        pointer: pointer,
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
function addDataBindingFragment(state, entityId, fragment) {
    state.dataBindingByEntityId.set(entityId, fragment);
}
function addTextExpressionFragment(state, entityId, fragment) {
    var _a;
    var existing = (_a = state.textExpressionsByEntityId.get(entityId)) !== null && _a !== void 0 ? _a : [];
    if (existing.some(function (item) {
        return item.pointer === fragment.pointer &&
            item.host_key === fragment.host_key &&
            item.host_class === fragment.host_class;
    })) {
        return;
    }
    existing.push(fragment);
    state.textExpressionsByEntityId.set(entityId, existing);
}
function classifyResponseSchemaFormat(rawTypes) {
    if (rawTypes === undefined) {
        return "missing";
    }
    if (typeof rawTypes !== "string") {
        return "invalid";
    }
    try {
        var parsed = JSON.parse(rawTypes);
        return (0, index_js_1.isRecord)(parsed) ? "json_object" : "invalid";
    }
    catch (_a) {
        return "invalid";
    }
}
function getBoolean(value) {
    return typeof value === "boolean" ? value : null;
}
function getFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function walkTextExpressions(state, value, pathParts, parentId) {
    var _a;
    if (Array.isArray(value)) {
        value.forEach(function (item, index) {
            walkTextExpressions(state, item, __spreadArray(__spreadArray([], pathParts, true), [String(index)], false), parentId);
        });
        return;
    }
    if (!(0, index_js_1.isRecord)(value)) {
        return;
    }
    var pointer = (0, index_js_1.toPointer)(pathParts);
    if (value.type === "TextExpression") {
        var hostKey = (_a = pathParts[pathParts.length - 1]) !== null && _a !== void 0 ? _a : "";
        var resolvedHostClass = (0, text_expression_hosts_js_1.resolveTextExpressionHostClass)(pointer, hostKey);
        if (resolvedHostClass === null) {
            state.errors.push("Unknown TextExpression host at ".concat(pointer, " (host_key=").concat(hostKey, ")"));
            return;
        }
        addTextExpressionFragment(state, parentId, {
            pointer: pointer,
            host_key: hostKey,
            host_class: resolvedHostClass,
        });
    }
    for (var _i = 0, _b = Object.entries(value); _i < _b.length; _i++) {
        var _c = _b[_i], key = _c[0], child = _c[1];
        walkTextExpressions(state, child, __spreadArray(__spreadArray([], pathParts, true), [key], false), parentId);
    }
}
function walkCustomStatesAny(state, value, pathParts) {
    if (Array.isArray(value)) {
        value.forEach(function (item, index) {
            walkCustomStatesAny(state, item, __spreadArray(__spreadArray([], pathParts, true), [String(index)], false));
        });
        return;
    }
    if (!(0, index_js_1.isRecord)(value)) {
        return;
    }
    if ((0, index_js_1.isRecord)(value.custom_states)) {
        var parentPointer = (0, index_js_1.toPointer)(pathParts);
        var parentId = (0, index_js_1.shortHash)(parentPointer, 10);
        for (var _i = 0, _a = Object.keys(value.custom_states); _i < _a.length; _i++) {
            var stateKey = _a[_i];
            pushEntry(state, "custom_state:".concat(parentId, ":").concat(stateKey), "".concat(parentPointer, "/custom_states/").concat(stateKey), "custom_state", parentId);
        }
    }
    for (var _b = 0, _c = Object.entries(value); _b < _c.length; _b++) {
        var _d = _c[_b], key = _d[0], child = _d[1];
        walkCustomStatesAny(state, child, __spreadArray(__spreadArray([], pathParts, true), [key], false));
    }
}
function findEntryIdByPointer(state, pointer) {
    for (var _i = 0, _a = state.entries; _i < _a.length; _i++) {
        var entry = _a[_i];
        if (entry.pointer === pointer) {
            return entry.id;
        }
    }
    return null;
}
function walkGenericDataBindings(state, value, pathParts) {
    var _a;
    if (Array.isArray(value)) {
        value.forEach(function (item, index) {
            walkGenericDataBindings(state, item, __spreadArray(__spreadArray([], pathParts, true), [String(index)], false));
        });
        return;
    }
    if (!(0, index_js_1.isRecord)(value)) {
        return;
    }
    var hasDataSource = Object.hasOwn(value, "data_source");
    var hasGroupType = Object.hasOwn(value, "group_type");
    if ((hasDataSource || hasGroupType) && pathParts[pathParts.length - 1] === "properties") {
        var propertiesPointer = (0, index_js_1.toPointer)(pathParts);
        var entityPointer = propertiesPointer.replace(/\/properties$/, "");
        var entityId = findEntryIdByPointer(state, entityPointer);
        if (entityId) {
            var dataSourceRaw = hasDataSource ? ((_a = value.data_source) !== null && _a !== void 0 ? _a : null) : null;
            var decoded = (0, data_source_js_1.decodeDataSource)(dataSourceRaw);
            var accessorRefs = hasDataSource
                ? collectAccessorRefs(state, dataSourceRaw, "".concat(propertiesPointer, "/data_source"))
                : [];
            if (hasDataSource && decoded.isUnknown) {
                state.errors.push("Unknown data_source kind at ".concat(propertiesPointer, "/data_source"));
            }
            addDataBindingFragment(state, entityId, {
                kind: decoded.kind,
                content_type: (typeof value.group_type === "string" ? value.group_type : null),
                source_type: decoded.sourceType,
                accessor_refs: accessorRefs,
            });
        }
    }
    for (var _i = 0, _b = Object.entries(value); _i < _b.length; _i++) {
        var _c = _b[_i], key = _c[0], child = _c[1];
        walkGenericDataBindings(state, child, __spreadArray(__spreadArray([], pathParts, true), [key], false));
    }
}
function collectAccessorRefs(state, dataSourceRaw, sourcePath) {
    try {
        return (0, message_tree_js_1.decodeMessageTreeAccessors)(dataSourceRaw, {
            strict: true,
            runtimeAccessorCatalog: state.runtimeAccessorCatalog,
        }).map(function (accessor) {
            return (0, accessor_js_1.accessorRefToJson)((0, accessor_js_1.decodeAccessor)(accessor, {
                customNameToId: state.customNameToId,
                runtimeAccessorCatalog: state.runtimeAccessorCatalog,
                strict: true,
            }));
        });
    }
    catch (error) {
        var detail = error instanceof Error ? error.message : String(error);
        state.errors.push("Accessor decode failed at ".concat(sourcePath, ": ").concat(detail));
        return [];
    }
}
function walkWorkflowCollection(state, workflows, pathPrefix, parentId, workflowClass, actionClass) {
    var _a, _b, _c, _d, _e, _f;
    if (!workflows) {
        return;
    }
    for (var _i = 0, _g = Object.entries(workflows); _i < _g.length; _i++) {
        var _h = _g[_i], workflowKey = _h[0], workflow = _h[1];
        var workflowId = (_a = workflow.id) !== null && _a !== void 0 ? _a : workflowKey;
        var workflowPointer = (0, index_js_1.toPointer)(__spreadArray(__spreadArray([], pathPrefix, true), [workflowKey], false));
        var workflowMeta = {
            trigger_type: (_b = (0, index_js_1.getString)(workflow.type)) !== null && _b !== void 0 ? _b : null,
        };
        var workflowProperties = (0, index_js_1.getRecord)(workflow.properties);
        var workflowCondition = workflowProperties ? (0, index_js_1.getRecord)(workflowProperties.condition) : null;
        var workflowConditionProperties = workflowCondition ? (0, index_js_1.getRecord)(workflowCondition.properties) : null;
        workflowMeta.trigger_condition_type = workflowCondition
            ? ((_c = (0, index_js_1.getString)(workflowCondition.type)) !== null && _c !== void 0 ? _c : null)
            : null;
        workflowMeta.trigger_element_id = workflowConditionProperties
            ? ((_d = (0, index_js_1.getString)(workflowConditionProperties.element_id)) !== null && _d !== void 0 ? _d : null)
            : null;
        if (workflowProperties && typeof workflowProperties.interval === "number" && Number.isFinite(workflowProperties.interval)) {
            workflowMeta.interval_seconds = workflowProperties.interval;
        }
        pushEntry(state, workflowId, workflowPointer, workflowClass, parentId, workflowMeta);
        var actions = (0, index_js_1.getRecord)(workflow.actions);
        if (!actions) {
            continue;
        }
        for (var _j = 0, _k = Object.entries(actions); _j < _k.length; _j++) {
            var _l = _k[_j], actionKey = _l[0], action = _l[1];
            var actionId = (_e = (0, index_js_1.getString)(action.id)) !== null && _e !== void 0 ? _e : "".concat(workflowId, ":action:").concat(actionKey);
            var actionPointer = (0, index_js_1.toPointer)(__spreadArray(__spreadArray([], pathPrefix, true), [workflowKey, "actions", actionKey], false));
            pushEntry(state, actionId, actionPointer, actionClass, workflowId, {
                action_type: (_f = (0, index_js_1.getString)(action.type)) !== null && _f !== void 0 ? _f : null,
            });
            walkTextExpressions(state, action, __spreadArray(__spreadArray([], pathPrefix, true), [workflowKey, "actions", actionKey], false), actionId);
        }
    }
}
function walkElementTree(state, elements, pathPrefix, parentId) {
    var _a, _b, _c;
    if (!elements) {
        return;
    }
    for (var _i = 0, _d = Object.entries(elements); _i < _d.length; _i++) {
        var _e = _d[_i], elementKey = _e[0], element = _e[1];
        var elementId = (_a = element.id) !== null && _a !== void 0 ? _a : elementKey;
        var elementPointerParts = __spreadArray(__spreadArray([], pathPrefix, true), [elementKey], false);
        var elementPointer = (0, index_js_1.toPointer)(elementPointerParts);
        pushEntry(state, elementId, elementPointer, "element", parentId, {
            element_type: (_b = (0, index_js_1.getString)(element.type)) !== null && _b !== void 0 ? _b : null,
        });
        if (typeof element.style === "string" && element.style.length > 0) {
            pushEntry(state, "style_ref:".concat(elementId), "".concat(elementPointer, "/style"), "style_ref", elementId, { style_target: element.style });
        }
        var customStates = (0, index_js_1.getRecord)(element.custom_states);
        if (customStates) {
            for (var _f = 0, _g = Object.keys(customStates); _f < _g.length; _f++) {
                var stateKey = _g[_f];
                pushEntry(state, "custom_state:".concat(elementId, ":").concat(stateKey), "".concat(elementPointer, "/custom_states/").concat(stateKey), "custom_state", elementId);
            }
        }
        var properties = (0, index_js_1.getRecord)(element.properties);
        if (properties) {
            if (Object.hasOwn(properties, "data_source") || Object.hasOwn(properties, "group_type")) {
                var hasDataSource = Object.hasOwn(properties, "data_source");
                var dataSourceRaw = hasDataSource ? ((_c = properties.data_source) !== null && _c !== void 0 ? _c : null) : null;
                var decoded = (0, data_source_js_1.decodeDataSource)(dataSourceRaw);
                var accessorRefs = hasDataSource
                    ? collectAccessorRefs(state, dataSourceRaw, "".concat(elementPointer, "/properties/data_source"))
                    : [];
                if (hasDataSource && decoded.isUnknown) {
                    state.errors.push("Unknown data_source kind at ".concat(elementPointer, "/properties/data_source"));
                }
                addDataBindingFragment(state, elementId, {
                    kind: decoded.kind,
                    content_type: (typeof properties.group_type === "string"
                        ? properties.group_type
                        : null),
                    source_type: decoded.sourceType,
                    accessor_refs: accessorRefs,
                });
            }
        }
        walkTextExpressions(state, element, elementPointerParts, elementId);
        walkWorkflowCollection(state, (0, index_js_1.getRecord)(element.workflows), __spreadArray(__spreadArray([], elementPointerParts, true), ["workflows"], false), elementId, "workflow", "workflow.action");
        walkElementTree(state, (0, index_js_1.getRecord)(element.elements), __spreadArray(__spreadArray([], elementPointerParts, true), ["elements"], false), elementId);
    }
}
function parseExternalCalls(state, root, clientSafe) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    var apiConnector = (0, index_js_1.getRecord)(clientSafe.apiconnector2);
    if (!apiConnector) {
        return;
    }
    var secure = (_b = (0, index_js_1.getRecord)((_a = root.settings) === null || _a === void 0 ? void 0 : _a.secure)) !== null && _b !== void 0 ? _b : {};
    for (var _i = 0, _q = Object.entries(apiConnector); _i < _q.length; _i++) {
        var _r = _q[_i], nsId = _r[0], nsValueUnknown = _r[1];
        var nsValue = (0, index_js_1.getRecord)(nsValueUnknown);
        if (!nsValue) {
            continue;
        }
        var nsInventoryId = "external_ns:".concat(nsId);
        var nsPointer = "/settings/client_safe/apiconnector2/".concat(nsId);
        var authRaw = (0, index_js_1.getString)(nsValue.auth);
        var authSource = Object.hasOwn(nsValue, "auth")
            ? authRaw !== null && authRaw !== void 0 ? authRaw : "null"
            : "absent";
        pushEntry(state, nsInventoryId, nsPointer, "external_http_namespace", undefined, {
            human: (_c = (0, index_js_1.getString)(nsValue.human)) !== null && _c !== void 0 ? _c : nsId,
            auth_source: authSource,
            auth_kind: authRaw === "oauth2_user"
                ? "oauth2_user"
                : authRaw === "private_key_header"
                    ? "api_key_header"
                    : "none",
        });
        if (authRaw === "oauth2_user") {
            pushEntry(state, "oauth_ns:".concat(nsId), nsPointer, "oauth_namespace", nsInventoryId, {
                oauth_user_data_call: ((_d = (0, index_js_1.getString)(nsValue.oauth_user_data_call)) !== null && _d !== void 0 ? _d : null),
                token_url: ((_e = (0, index_js_1.getString)(nsValue.generate_token_from_code_uri)) !== null && _e !== void 0 ? _e : null),
                authorize_url: ((_f = (0, index_js_1.getString)(nsValue.authentication_url)) !== null && _f !== void 0 ? _f : null),
                redirect_uri: null,
                user_info_url: ((_g = (0, index_js_1.getString)(nsValue.oauth_user_data_call)) !== null && _g !== void 0 ? _g : null),
                client_id_env: (0, index_js_1.getString)(nsValue.appid) ? "B2C_OAUTH_CLIENT_ID_".concat(nsId) : null,
                client_secret_env: (0, index_js_1.getString)(nsValue.appid) ? "B2C_OAUTH_CLIENT_SECRET_".concat(nsId) : null,
            });
        }
        var calls = (0, index_js_1.getRecord)(nsValue.calls);
        if (!calls) {
            continue;
        }
        for (var _s = 0, _t = Object.entries(calls); _s < _t.length; _s++) {
            var _u = _t[_s], callId = _u[0], callUnknown = _u[1];
            var call = (0, index_js_1.getRecord)(callUnknown);
            if (!call) {
                continue;
            }
            var callInventoryId = "external_call:".concat(nsId, ":").concat(callId);
            var callPointer = "".concat(nsPointer, "/calls/").concat(callId);
            var responseSchemaFormat = classifyResponseSchemaFormat(call.types);
            if (responseSchemaFormat === "invalid") {
                state.errors.push("Invalid response schema format at ".concat(callPointer, "/types"));
            }
            pushEntry(state, callInventoryId, callPointer, "external_http_call", nsInventoryId, {
                method: ((_h = (0, index_js_1.getString)(call.method)) !== null && _h !== void 0 ? _h : null),
                url: ((_j = (0, index_js_1.getString)(call.url)) !== null && _j !== void 0 ? _j : null),
                ret_value: ((_k = (0, index_js_1.getString)(call.ret_value)) !== null && _k !== void 0 ? _k : null),
                data_type: ((_l = (0, index_js_1.getString)(call.data_type)) !== null && _l !== void 0 ? _l : null),
                body_type: ((_m = (0, index_js_1.getString)(call.body_type)) !== null && _m !== void 0 ? _m : null),
                response_schema_format: responseSchemaFormat,
            });
            var headers = (_o = (0, index_js_1.getRecord)(call.headers)) !== null && _o !== void 0 ? _o : {};
            for (var _v = 0, _w = Object.entries(headers); _v < _w.length; _v++) {
                var _x = _w[_v], headerId = _x[0], headerValueUnknown = _x[1];
                var headerValue = (0, index_js_1.getRecord)(headerValueUnknown);
                if (!headerValue || headerValue.private !== true) {
                    continue;
                }
                var keyA = "".concat(nsId, "__").concat(callId, "__").concat(headerId);
                var keyB = headerId;
                var matchedKey = Object.hasOwn(secure, keyA)
                    ? keyA
                    : Object.hasOwn(secure, keyB)
                        ? keyB
                        : null;
                void matchedKey;
            }
            var bodyParams = (_p = (0, index_js_1.getRecord)(call.body_params)) !== null && _p !== void 0 ? _p : {};
            for (var _y = 0, _z = Object.entries(bodyParams); _y < _z.length; _y++) {
                var _0 = _z[_y], paramId = _0[0], paramUnknown = _0[1];
                var param = (0, index_js_1.getRecord)(paramUnknown);
                if (!param || param.private !== true) {
                    continue;
                }
                var keyA = "".concat(nsId, "__").concat(callId, "__").concat(paramId);
                var keyB = paramId;
                var matchedKey = Object.hasOwn(secure, keyA)
                    ? keyA
                    : Object.hasOwn(secure, keyB)
                        ? keyB
                        : null;
                void matchedKey;
            }
        }
    }
}
function buildInventory(root) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13;
    var secure = (_b = (0, index_js_1.getRecord)((_a = root.settings) === null || _a === void 0 ? void 0 : _a.secure)) !== null && _b !== void 0 ? _b : {};
    var state = {
        entries: [],
        ids: new Set(),
        errors: [],
        secureKeys: new Set(Object.keys(secure)),
        dataBindingByEntityId: new Map(),
        textExpressionsByEntityId: new Map(),
        customNameToId: (_d = (0, index_js_1.getRecord)((_c = root._index) === null || _c === void 0 ? void 0 : _c.custom_name_to_id)) !== null && _d !== void 0 ? _d : null,
        runtimeAccessorCatalog: (0, accessor_js_1.buildRuntimeAccessorCatalog)(root),
    };
    var suspiciousPublicKeys = [];
    var userTypes = (_e = root.user_types) !== null && _e !== void 0 ? _e : {};
    for (var _i = 0, _14 = Object.entries(userTypes); _i < _14.length; _i++) {
        var _15 = _14[_i], userTypeId = _15[0], userType = _15[1];
        var userTypePointer = "/user_types/".concat(userTypeId);
        pushEntry(state, userTypeId, userTypePointer, "user_type", undefined, {
            display: ((_f = (0, index_js_1.getString)(userType.display)) !== null && _f !== void 0 ? _f : userTypeId),
        });
        var fields = (0, index_js_1.getRecord)(userType.fields);
        if (fields) {
            for (var _16 = 0, _17 = Object.entries(fields); _16 < _17.length; _16++) {
                var _18 = _17[_16], fieldId = _18[0], fieldUnknown = _18[1];
                var field = (0, index_js_1.getRecord)(fieldUnknown);
                var invId = fieldId;
                var pointer = "".concat(userTypePointer, "/fields/").concat(fieldId);
                var fileSettings = (0, index_js_1.getRecord)(field === null || field === void 0 ? void 0 : field.file_settings);
                pushEntry(state, invId, pointer, "user_type.field", userTypeId, {
                    field_id: fieldId,
                    type: ((_g = (0, index_js_1.getString)(field === null || field === void 0 ? void 0 : field.type)) !== null && _g !== void 0 ? _g : null),
                    currency_code: ((_h = (0, index_js_1.getString)(field === null || field === void 0 ? void 0 : field.currency)) !== null && _h !== void 0 ? _h : null),
                    storage_path: ((_j = (0, index_js_1.getString)(fileSettings === null || fileSettings === void 0 ? void 0 : fileSettings.storage_path)) !== null && _j !== void 0 ? _j : null),
                    mime_type: ((_k = (0, index_js_1.getString)(fileSettings === null || fileSettings === void 0 ? void 0 : fileSettings.mime_type)) !== null && _k !== void 0 ? _k : null),
                });
            }
        }
        var roles = (0, index_js_1.getRecord)(userType.privacy_role);
        if (roles) {
            for (var _19 = 0, _20 = Object.entries(roles); _19 < _20.length; _19++) {
                var _21 = _20[_19], roleId = _21[0], roleUnknown = _21[1];
                var role = (0, index_js_1.getRecord)(roleUnknown);
                var invId = "privacy_role:".concat(userTypeId, ":").concat(roleId);
                var rawCondition = (_l = role === null || role === void 0 ? void 0 : role.condition) !== null && _l !== void 0 ? _l : null;
                var conditionTree = null;
                var conditionTypedAst = null;
                var conditionAstCoverage = null;
                var conditionAccessors = [];
                try {
                    conditionTree = (0, message_tree_js_1.decodeMessageTree)(rawCondition, {
                        strict: true,
                        runtimeAccessorCatalog: state.runtimeAccessorCatalog,
                    });
                    var typedAst = (0, message_tree_js_1.decodeMessageTreeTypedAst)(rawCondition, {
                        strict: true,
                        customNameToId: state.customNameToId,
                        runtimeAccessorCatalog: state.runtimeAccessorCatalog,
                    });
                    conditionTypedAst = typedAst;
                    conditionAstCoverage = (0, message_tree_js_1.summarizeMessageTreeAstCoverage)(typedAst);
                    conditionAccessors = (0, message_tree_js_1.decodeMessageTreeAccessors)(rawCondition, {
                        strict: true,
                        runtimeAccessorCatalog: state.runtimeAccessorCatalog,
                    }).map(function (accessor) {
                        return (0, accessor_js_1.accessorRefToJson)((0, accessor_js_1.decodeAccessor)(accessor, {
                            customNameToId: state.customNameToId,
                            runtimeAccessorCatalog: state.runtimeAccessorCatalog,
                            strict: true,
                        }));
                    });
                }
                catch (error) {
                    var detail = error instanceof Error ? error.message : String(error);
                    state.errors.push("privacy_role condition decode failed for ".concat(invId, ": ").concat(detail));
                }
                var coverageRecord = (0, index_js_1.isRecord)(conditionAstCoverage) ? conditionAstCoverage : null;
                if (coverageRecord &&
                    typeof coverageRecord.unknown_node_count === "number" &&
                    coverageRecord.unknown_node_count > 0) {
                    state.errors.push("privacy_role condition typed AST has unsupported nodes for ".concat(invId, " (unknown_node_count=").concat(String(coverageRecord.unknown_node_count), ")"));
                }
                if (conditionTree === null || conditionTypedAst === null || conditionAstCoverage === null) {
                    state.errors.push("privacy_role condition IR coverage incomplete for ".concat(invId));
                }
                pushEntry(state, invId, "".concat(userTypePointer, "/privacy_role/").concat(roleId), "privacy_role", userTypeId, {
                    condition: rawCondition,
                    condition_tree: conditionTree,
                    condition_typed_ast: conditionTypedAst,
                    condition_ast_coverage: conditionAstCoverage,
                    condition_accessors: conditionAccessors,
                });
            }
        }
    }
    var optionSets = (_m = root.option_sets) !== null && _m !== void 0 ? _m : {};
    for (var _22 = 0, _23 = Object.entries(optionSets); _22 < _23.length; _22++) {
        var _24 = _23[_22], optionSetId = _24[0], optionSet = _24[1];
        var pointer = "/option_sets/".concat(optionSetId);
        pushEntry(state, optionSetId, pointer, "option_set", undefined, {
            display: ((_o = (0, index_js_1.getString)(optionSet.display)) !== null && _o !== void 0 ? _o : optionSetId),
        });
        var values = (0, index_js_1.getRecord)(optionSet.values);
        if (!values) {
            continue;
        }
        for (var _25 = 0, _26 = Object.keys(values); _25 < _26.length; _25++) {
            var valueId = _26[_25];
            pushEntry(state, valueId, "".concat(pointer, "/values/").concat(valueId), "option_set.value", optionSetId, { option_set_id: optionSetId, value_key: valueId });
        }
    }
    var pages = (_p = root.pages) !== null && _p !== void 0 ? _p : {};
    for (var _27 = 0, _28 = Object.entries(pages); _27 < _28.length; _27++) {
        var _29 = _28[_27], pageKey = _29[0], page = _29[1];
        var pageId = (_q = page.id) !== null && _q !== void 0 ? _q : pageKey;
        var pagePointerParts = ["pages", pageKey];
        var pagePointer = (0, index_js_1.toPointer)(pagePointerParts);
        pushEntry(state, pageId, pagePointer, "page", undefined, {
            name: ((_r = (0, index_js_1.getString)(page.name)) !== null && _r !== void 0 ? _r : pageKey),
        });
        if (typeof page.style === "string" && page.style.length > 0) {
            pushEntry(state, "style_ref:".concat(pageId), "".concat(pagePointer, "/style"), "style_ref", pageId, { style_target: page.style });
        }
        var customStates = (0, index_js_1.getRecord)(page.custom_states);
        if (customStates) {
            for (var _30 = 0, _31 = Object.keys(customStates); _30 < _31.length; _30++) {
                var stateKey = _31[_30];
                pushEntry(state, "custom_state:".concat(pageId, ":").concat(stateKey), "".concat(pagePointer, "/custom_states/").concat(stateKey), "custom_state", pageId);
            }
        }
        walkWorkflowCollection(state, (0, index_js_1.getRecord)(page.workflows), __spreadArray(__spreadArray([], pagePointerParts, true), ["workflows"], false), pageId, "workflow", "workflow.action");
        walkElementTree(state, (0, index_js_1.getRecord)(page.elements), __spreadArray(__spreadArray([], pagePointerParts, true), ["elements"], false), pageId);
        walkTextExpressions(state, page, pagePointerParts, pageId);
    }
    var elementDefinitions = (_s = root.element_definitions) !== null && _s !== void 0 ? _s : {};
    for (var _32 = 0, _33 = Object.entries(elementDefinitions); _32 < _33.length; _32++) {
        var _34 = _33[_32], edefKey = _34[0], edef = _34[1];
        var defId = (_t = edef.id) !== null && _t !== void 0 ? _t : edefKey;
        var defPointerParts = ["element_definitions", edefKey];
        var defPointer = (0, index_js_1.toPointer)(defPointerParts);
        pushEntry(state, defId, defPointer, "element_definition");
        var fields = (0, index_js_1.getRecord)(edef.fields);
        if (fields) {
            for (var _35 = 0, _36 = Object.keys(fields); _35 < _36.length; _35++) {
                var fieldKey = _36[_35];
                pushEntry(state, "edef_field:".concat(defId, ":").concat(fieldKey), "".concat(defPointer, "/fields/").concat(fieldKey), "element_definition.field", defId);
            }
        }
        var states = (0, index_js_1.getRecord)(edef.states);
        if (states) {
            for (var _37 = 0, _38 = Object.keys(states); _37 < _38.length; _37++) {
                var stateKey = _38[_37];
                pushEntry(state, "edef_state:".concat(defId, ":").concat(stateKey), "".concat(defPointer, "/states/").concat(stateKey), "element_definition.state", defId);
            }
        }
        walkWorkflowCollection(state, (0, index_js_1.getRecord)(edef.workflows), __spreadArray(__spreadArray([], defPointerParts, true), ["workflows"], false), defId, "element_definition.workflow", "element_definition.action");
        walkElementTree(state, (0, index_js_1.getRecord)(edef.elements), __spreadArray(__spreadArray([], defPointerParts, true), ["elements"], false), defId);
        walkTextExpressions(state, edef, defPointerParts, defId);
    }
    var apiEvents = (_u = root.api) !== null && _u !== void 0 ? _u : {};
    for (var _39 = 0, _40 = Object.entries(apiEvents); _39 < _40.length; _39++) {
        var _41 = _40[_39], apiKey = _41[0], apiEvent = _41[1];
        var apiId = (_v = apiEvent.id) !== null && _v !== void 0 ? _v : apiKey;
        var pointerParts = ["api", apiKey];
        var pointer = (0, index_js_1.toPointer)(pointerParts);
        var apiProperties = (_w = (0, index_js_1.getRecord)(apiEvent.properties)) !== null && _w !== void 0 ? _w : {};
        var parameterDef = (0, index_js_1.getRecord)(apiProperties.parameter_def);
        var parameters = (0, index_js_1.getRecord)(apiProperties.parameters);
        var parameterCount = parameterDef !== undefined
            ? Object.keys(parameterDef).length
            : parameters !== undefined
                ? Object.keys(parameters).length
                : 0;
        pushEntry(state, apiId, pointer, "api_event", undefined, {
            event_type: ((_x = (0, index_js_1.getString)(apiEvent.type)) !== null && _x !== void 0 ? _x : null),
            data_type: ((_y = (0, index_js_1.getString)(apiProperties.data_type)) !== null && _y !== void 0 ? _y : null),
            expose: ((_z = getBoolean(apiProperties.expose)) !== null && _z !== void 0 ? _z : null),
            waiting_for_data: ((_0 = getBoolean(apiProperties.waiting_for_data)) !== null && _0 !== void 0 ? _0 : null),
            auth_unecessary: ((_1 = getBoolean(apiProperties.auth_unecessary)) !== null && _1 !== void 0 ? _1 : null),
            ignore_privacy_rules: ((_2 = getBoolean(apiProperties.ignore_privacy_rules)) !== null && _2 !== void 0 ? _2 : null),
            parameter_count: parameterCount,
        });
        var actions = (0, index_js_1.getRecord)(apiEvent.actions);
        if (actions) {
            for (var _42 = 0, _43 = Object.entries(actions); _42 < _43.length; _42++) {
                var _44 = _43[_42], actionKey = _44[0], actionUnknown = _44[1];
                var action = (0, index_js_1.getRecord)(actionUnknown);
                var actionId = (_3 = (0, index_js_1.getString)(action === null || action === void 0 ? void 0 : action.id)) !== null && _3 !== void 0 ? _3 : "".concat(apiId, ":action:").concat(actionKey);
                var actionProperties = (_4 = (0, index_js_1.getRecord)(action === null || action === void 0 ? void 0 : action.properties)) !== null && _4 !== void 0 ? _4 : {};
                var scheduleInSeconds = (_6 = (_5 = getFiniteNumber(actionProperties.time_span_for_schedule)) !== null && _5 !== void 0 ? _5 : getFiniteNumber(actionProperties.interval)) !== null && _6 !== void 0 ? _6 : getFiniteNumber(actionProperties.seconds);
                pushEntry(state, actionId, "".concat(pointer, "/actions/").concat(actionKey), "api_event.action", apiId, {
                    action_type: ((_7 = (0, index_js_1.getString)(action === null || action === void 0 ? void 0 : action.type)) !== null && _7 !== void 0 ? _7 : null),
                    scheduled_api_event_id: ((_8 = (0, index_js_1.getString)(actionProperties.api_event)) !== null && _8 !== void 0 ? _8 : null),
                    schedule_in_seconds: (scheduleInSeconds !== null && scheduleInSeconds !== void 0 ? scheduleInSeconds : null),
                });
            }
        }
    }
    var styles = (0, index_js_1.getRecord)(root.styles);
    if (styles) {
        for (var _45 = 0, _46 = Object.keys(styles); _45 < _46.length; _45++) {
            var styleId = _46[_45];
            pushEntry(state, styleId, "/styles/".concat(styleId), "style");
        }
    }
    var mobileViews = (0, index_js_1.getRecord)(root.mobile_views);
    if (mobileViews) {
        for (var _47 = 0, _48 = Object.entries(mobileViews); _47 < _48.length; _47++) {
            var _49 = _48[_47], mvKey = _49[0], mvValue = _49[1];
            var id = (0, index_js_1.isRecord)(mvValue) && typeof mvValue.id === "string" ? mvValue.id : "mobile_view:".concat(mvKey);
            pushEntry(state, id, "/mobile_views/".concat(mvKey), "mobile_view");
        }
    }
    var clientSafe = (0, index_js_1.getRecord)((_9 = root.settings) === null || _9 === void 0 ? void 0 : _9.client_safe);
    if (clientSafe) {
        var singletonKeys = [
            "app_language",
            "pw_length",
            "pw_protection",
            "pw_require_capital_letter",
            "pw_require_number",
            "pw_require_special_char",
            "have_pw_policy",
            "restricted_google",
        ];
        for (var _50 = 0, singletonKeys_1 = singletonKeys; _50 < singletonKeys_1.length; _50++) {
            var key = singletonKeys_1[_50];
            if (!Object.hasOwn(clientSafe, key)) {
                continue;
            }
            pushEntry(state, "settings_singleton:".concat(key), "/settings/client_safe/".concat(key), "settings_singleton");
        }
        var featureFlags = clientSafe.feature_flags;
        if (Array.isArray(featureFlags)) {
            featureFlags.forEach(function (_item, index) {
                pushEntry(state, "settings_singleton:feature_flags:".concat(index), "/settings/client_safe/feature_flags/".concat(index), "settings_singleton");
            });
        }
        var sitemapPages = clientSafe.sitemap_pages;
        if (Array.isArray(sitemapPages)) {
            sitemapPages.forEach(function (_item, index) {
                pushEntry(state, "settings_singleton:sitemap_pages:".concat(index), "/settings/client_safe/sitemap_pages/".concat(index), "settings_singleton");
            });
        }
        var plugins = (0, index_js_1.getRecord)(clientSafe.plugins);
        if (plugins) {
            for (var _51 = 0, _52 = Object.keys(plugins); _51 < _52.length; _51++) {
                var pluginId = _52[_51];
                pushEntry(state, "plugin:".concat(pluginId), "/settings/client_safe/plugins/".concat(pluginId), "plugin");
            }
        }
        var colorTokens = (0, index_js_1.getRecord)(clientSafe.color_tokens);
        if (colorTokens) {
            for (var _53 = 0, _54 = Object.keys(colorTokens); _53 < _54.length; _53++) {
                var key = _54[_53];
                pushEntry(state, "color_token:".concat(key), "/settings/client_safe/color_tokens/".concat(key), "color_token");
            }
        }
        var fontTokens = (0, index_js_1.getRecord)(clientSafe.font_tokens);
        if (fontTokens) {
            for (var _55 = 0, _56 = Object.keys(fontTokens); _55 < _56.length; _55++) {
                var key = _56[_55];
                pushEntry(state, "font_token:".concat(key), "/settings/client_safe/font_tokens/".concat(key), "font_token");
            }
        }
        parseExternalCalls(state, root, clientSafe);
        var publicKeyScan = (0, public_keys_js_1.scanPublicIntegrationKeys)(clientSafe, ["settings", "client_safe"]);
        suspiciousPublicKeys = publicKeyScan.suspicious_matches;
        for (var _57 = 0, _58 = publicKeyScan.matches; _57 < _58.length; _57++) {
            var match = _58[_57];
            var meta = {
                value: match.value,
                suffix: match.suffix,
                match_source: match.match_source,
            };
            if (match.plugin_id_ref !== undefined) {
                meta.plugin_id_ref = match.plugin_id_ref;
            }
            pushEntry(state, "public_key:".concat(match.key), match.pointer, "public_integration_key", undefined, meta);
        }
    }
    for (var _59 = 0, _60 = state.secureKeys; _59 < _60.length; _59++) {
        var secureKey = _60[_59];
        pushEntry(state, secureKey, "/settings/secure/".concat(secureKey), "secret_ref", undefined, { key_name: secureKey });
    }
    walkCustomStatesAny(state, root, []);
    walkGenericDataBindings(state, root, []);
    var presentIds = new Set(state.entries.map(function (entry) { return entry.id; }));
    var idToPath = (_11 = (_10 = root._index) === null || _10 === void 0 ? void 0 : _10.id_to_path) !== null && _11 !== void 0 ? _11 : {};
    for (var _61 = 0, _62 = Object.entries(idToPath); _61 < _62.length; _61++) {
        var _63 = _62[_61], indexId = _63[0], rawPath = _63[1];
        if (presentIds.has(indexId)) {
            continue;
        }
        var pointer = typeof rawPath === "string" ? normalizeIndexPath(rawPath) : "/__index/id_to_path/".concat(indexId);
        pushEntry(state, indexId, pointer, "index_only", undefined, { raw_path: rawPath });
    }
    if (state.errors.length > 0) {
        throw new Error("Inventory build failed with ".concat(state.errors.length, " error(s):\n").concat(state.errors.join("\n")));
    }
    var entryById = new Map(state.entries.map(function (entry) { return [entry.id, entry]; }));
    for (var _64 = 0, _65 = state.dataBindingByEntityId.entries(); _64 < _65.length; _64++) {
        var _66 = _65[_64], entityId = _66[0], fragment = _66[1];
        var entry = entryById.get(entityId);
        if (!entry) {
            continue;
        }
        entry.meta = __assign(__assign({}, ((_12 = entry.meta) !== null && _12 !== void 0 ? _12 : {})), { data_binding: fragment });
    }
    for (var _67 = 0, _68 = state.textExpressionsByEntityId.entries(); _67 < _68.length; _67++) {
        var _69 = _68[_67], entityId = _69[0], fragments = _69[1];
        var entry = entryById.get(entityId);
        if (!entry) {
            continue;
        }
        var sorted = __spreadArray([], fragments, true).sort(function (a, b) { return a.pointer.localeCompare(b.pointer); });
        entry.meta = __assign(__assign({}, ((_13 = entry.meta) !== null && _13 !== void 0 ? _13 : {})), { text_expressions: sorted });
    }
    state.entries.sort(function (a, b) {
        if (a.entity_class !== b.entity_class) {
            return a.entity_class.localeCompare(b.entity_class);
        }
        return a.id.localeCompare(b.id);
    });
    var inventory = {
        entries: state.entries,
        reserved_view_classes: VIEW_CLASS_RESERVATION,
    };
    var lint = {
        status: suspiciousPublicKeys.length > 0 ? "fail" : "pass",
        suspicious_public_integration_keys: suspiciousPublicKeys,
    };
    return {
        inventory: inventory,
        lint: lint,
    };
}
