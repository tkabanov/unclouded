"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
exports.extractBodyTemplateRefs = extractBodyTemplateRefs;
exports.validateTemplateParams = validateTemplateParams;
exports.runM1Acceptance = runM1Acceptance;
var node_path_1 = require("node:path");
var ingest_js_1 = require("../ingest.js");
var accessor_js_1 = require("../decoders/accessor.js");
var data_source_js_1 = require("../decoders/data-source.js");
var message_tree_js_1 = require("../decoders/message-tree.js");
var text_expression_hosts_js_1 = require("../decoders/text-expression-hosts.js");
var public_keys_js_1 = require("../inventory/public-keys.js");
var url_decompose_js_1 = require("../m2/views/url-decompose.js");
var index_js_1 = require("../utils/index.js");
var hash_js_1 = require("../utils/hash.js");
var APPS = [
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
function countByClass(inventory, className) {
    if (className === "workflow_total") {
        return (inventory.entries.filter(function (entry) { return entry.entity_class === "workflow"; }).length +
            inventory.entries.filter(function (entry) { return entry.entity_class === "element_definition.workflow"; }).length);
    }
    if (className === "action_total") {
        return (inventory.entries.filter(function (entry) { return entry.entity_class === "workflow.action"; }).length +
            inventory.entries.filter(function (entry) { return entry.entity_class === "element_definition.action"; }).length +
            inventory.entries.filter(function (entry) { return entry.entity_class === "api_event.action"; }).length);
    }
    if (className === "data_binding") {
        return inventory.entries.filter(function (entry) { var _a; return (_a = entry.meta) === null || _a === void 0 ? void 0 : _a.data_binding; }).length;
    }
    if (className === "text_expression") {
        return inventory.entries.reduce(function (sum, entry) {
            var _a;
            var fragments = (_a = entry.meta) === null || _a === void 0 ? void 0 : _a.text_expressions;
            return sum + (Array.isArray(fragments) ? fragments.length : 0);
        }, 0);
    }
    return inventory.entries.filter(function (entry) { return entry.entity_class === className; }).length;
}
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
function assertThrows(action, message) {
    var threw = false;
    try {
        action();
    }
    catch (_a) {
        threw = true;
    }
    assert(threw, message);
}
function asRecord(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return null;
    }
    return value;
}
function assertM1Arms(inventory) {
    var _a, _b, _c, _d;
    var dataBindings = inventory.entries
        .filter(function (entry) { var _a; return (_a = entry.meta) === null || _a === void 0 ? void 0 : _a.data_binding; })
        .map(function (entry) { var _a; return asRecord((_a = entry.meta) === null || _a === void 0 ? void 0 : _a.data_binding); })
        .filter(function (binding) { return binding !== null; });
    var dataBindingKinds = new Set(dataBindings
        .map(function (binding) { return binding.kind; })
        .filter(function (kind) { return typeof kind === "string"; }));
    var requiredDataBindingKinds = [
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
    var allowedDataBindingKinds = new Set(requiredDataBindingKinds);
    for (var _i = 0, requiredDataBindingKinds_1 = requiredDataBindingKinds; _i < requiredDataBindingKinds_1.length; _i++) {
        var kind = requiredDataBindingKinds_1[_i];
        assert(dataBindingKinds.has(kind), "Missing DataSourceIR kind coverage: ".concat(kind));
    }
    for (var _e = 0, dataBindingKinds_1 = dataBindingKinds; _e < dataBindingKinds_1.length; _e++) {
        var kind = dataBindingKinds_1[_e];
        assert(allowedDataBindingKinds.has(kind), "Unexpected DataSourceIR kind: ".concat(kind));
    }
    var sourceTypes = new Set(dataBindings
        .map(function (binding) { return binding.source_type; })
        .filter(function (sourceType) {
        return typeof sourceType === "string" || sourceType === null;
    }));
    var requiredSourceTypes = [
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
    for (var _f = 0, requiredSourceTypes_1 = requiredSourceTypes; _f < requiredSourceTypes_1.length; _f++) {
        var sourceType = requiredSourceTypes_1[_f];
        assert(sourceTypes.has(sourceType), "Missing source_type coverage: ".concat(sourceType));
    }
    assert(sourceTypes.has(null), "Missing source_type null-arm coverage");
    var textHosts = new Set();
    for (var _g = 0, _h = inventory.entries; _g < _h.length; _g++) {
        var entry = _h[_g];
        var fragments = (_a = entry.meta) === null || _a === void 0 ? void 0 : _a.text_expressions;
        if (!Array.isArray(fragments)) {
            continue;
        }
        for (var _j = 0, fragments_1 = fragments; _j < fragments_1.length; _j++) {
            var fragment = fragments_1[_j];
            var record = asRecord(fragment);
            if (record && typeof record.host_class === "string") {
                textHosts.add(record.host_class);
            }
        }
    }
    for (var _k = 0, _l = [
        "render_prop",
        "formatting_utility",
        "workflow_api_substitution",
        "element_definition_opaque",
    ]; _k < _l.length; _k++) {
        var host = _l[_k];
        assert(textHosts.has(host), "Missing text host class coverage: ".concat(host));
    }
    var calls = inventory.entries.filter(function (entry) { return entry.entity_class === "external_http_call"; });
    var methods = new Set(calls.map(function (entry) { var _a; return (_a = entry.meta) === null || _a === void 0 ? void 0 : _a.method; }).filter(function (method) { return typeof method === "string"; }));
    var allowedMethods = new Set(["get", "post", "put", "patch", "delete_method"]);
    for (var _m = 0, allowedMethods_1 = allowedMethods; _m < allowedMethods_1.length; _m++) {
        var method = allowedMethods_1[_m];
        assert(methods.has(method), "Missing HttpMethod coverage: ".concat(method));
    }
    for (var _o = 0, methods_1 = methods; _o < methods_1.length; _o++) {
        var method = methods_1[_o];
        assert(allowedMethods.has(method), "Unexpected HttpMethod value: ".concat(method));
    }
    var bodyTypes = new Set(calls
        .map(function (entry) { var _a; return (_a = entry.meta) === null || _a === void 0 ? void 0 : _a.body_type; })
        .filter(function (body) { return typeof body === "string"; }));
    var allowedBodyTypes = new Set(["form_data", "json", "plain_text"]);
    for (var _p = 0, allowedBodyTypes_1 = allowedBodyTypes; _p < allowedBodyTypes_1.length; _p++) {
        var bodyType = allowedBodyTypes_1[_p];
        assert(bodyTypes.has(bodyType), "Missing body_type coverage: ".concat(bodyType));
    }
    for (var _q = 0, bodyTypes_1 = bodyTypes; _q < bodyTypes_1.length; _q++) {
        var bodyType = bodyTypes_1[_q];
        assert(allowedBodyTypes.has(bodyType), "Unexpected body_type value: ".concat(bodyType));
    }
    assert(calls.some(function (entry) { var _a; return ((_a = entry.meta) === null || _a === void 0 ? void 0 : _a.body_type) === null; }), "Missing body_type null-arm coverage");
    var dataTypes = new Set(calls
        .map(function (entry) { var _a; return (_a = entry.meta) === null || _a === void 0 ? void 0 : _a.data_type; })
        .filter(function (dataType) { return typeof dataType === "string"; }));
    var allowedDataTypes = new Set(["stream", "JSON", "file"]);
    for (var _r = 0, allowedDataTypes_1 = allowedDataTypes; _r < allowedDataTypes_1.length; _r++) {
        var dataType = allowedDataTypes_1[_r];
        assert(dataTypes.has(dataType), "Missing data_type coverage: ".concat(dataType));
    }
    for (var _s = 0, dataTypes_1 = dataTypes; _s < dataTypes_1.length; _s++) {
        var dataType = dataTypes_1[_s];
        assert(allowedDataTypes.has(dataType), "Unexpected data_type value: ".concat(dataType));
    }
    assert(calls.some(function (entry) { var _a; return ((_a = entry.meta) === null || _a === void 0 ? void 0 : _a.data_type) === null; }), "Missing data_type null-arm coverage");
    var responseSchemaFormats = new Set(calls
        .map(function (entry) { var _a; return (_a = entry.meta) === null || _a === void 0 ? void 0 : _a.response_schema_format; })
        .filter(function (format) { return typeof format === "string"; }));
    for (var _t = 0, _u = ["json_object", "missing"]; _t < _u.length; _t++) {
        var format = _u[_t];
        assert(responseSchemaFormats.has(format), "Missing response_schema_format coverage: ".concat(format));
    }
    for (var _v = 0, responseSchemaFormats_1 = responseSchemaFormats; _v < responseSchemaFormats_1.length; _v++) {
        var format = responseSchemaFormats_1[_v];
        assert(format === "json_object" || format === "missing", "Unexpected response_schema_format value: ".concat(format));
    }
    var authKinds = new Set(inventory.entries
        .filter(function (entry) { return entry.entity_class === "external_http_namespace"; })
        .map(function (entry) { var _a; return (_a = entry.meta) === null || _a === void 0 ? void 0 : _a.auth_kind; })
        .filter(function (auth) { return typeof auth === "string"; }));
    for (var _w = 0, _x = ["none", "api_key_header", "oauth2_user"]; _w < _x.length; _w++) {
        var authKind = _x[_w];
        assert(authKinds.has(authKind), "Missing AuthIR kind coverage: ".concat(authKind));
    }
    var privacyRoles = inventory.entries.filter(function (entry) { return entry.entity_class === "privacy_role"; });
    assert(privacyRoles.length > 0, "Missing privacy_role inventory coverage");
    for (var _y = 0, privacyRoles_1 = privacyRoles; _y < privacyRoles_1.length; _y++) {
        var privacyRole = privacyRoles_1[_y];
        var typedAst = (_b = privacyRole.meta) === null || _b === void 0 ? void 0 : _b.condition_typed_ast;
        var coverage = asRecord((_c = privacyRole.meta) === null || _c === void 0 ? void 0 : _c.condition_ast_coverage);
        assert(typedAst !== undefined && typedAst !== null, "privacy_role ".concat(privacyRole.id, " missing condition_typed_ast metadata"));
        assert(Array.isArray((_d = privacyRole.meta) === null || _d === void 0 ? void 0 : _d.condition_accessors), "privacy_role ".concat(privacyRole.id, " missing condition_accessors metadata"));
        assert(coverage !== null && coverage.schema === "b2c.message_tree_ast_coverage.v1", "privacy_role ".concat(privacyRole.id, " missing condition_ast_coverage schema"));
        assert(typeof (coverage === null || coverage === void 0 ? void 0 : coverage.unknown_node_count) === "number" && coverage.unknown_node_count === 0, "privacy_role ".concat(privacyRole.id, " typed AST must be fail-closed (unknown_node_count=0)"));
    }
}
function assertTeamappOAuthUserDataCallMapping(inventory, refs) {
    var _a;
    var oauthNamespaces = inventory.entries.filter(function (entry) { return entry.entity_class === "oauth_namespace"; });
    assert(oauthNamespaces.length > 0, "teamapp: expected at least one oauth_namespace entry");
    var oauthRefs = refs.filter(function (edge) { return edge.edge_kind === "oauth_user_data_call"; });
    var callIds = new Set(inventory.entries
        .filter(function (entry) { return entry.entity_class === "external_http_call"; })
        .map(function (entry) { return entry.id; }));
    var seenOAuthNamespaceWithUserDataCall = 0;
    var seenOAuthNamespaceWithNullUserDataCall = 0;
    var _loop_1 = function (oauthNamespace) {
        var oauthUserDataCall = (_a = oauthNamespace.meta) === null || _a === void 0 ? void 0 : _a.oauth_user_data_call;
        var namespaceRefs = oauthRefs.filter(function (edge) { return edge.from_id === oauthNamespace.parent_id; });
        if (typeof oauthUserDataCall === "string" && oauthUserDataCall.length > 0) {
            seenOAuthNamespaceWithUserDataCall += 1;
            assert(namespaceRefs.length > 0, "teamapp: missing oauth_user_data_call ref edge for namespace ".concat(oauthNamespace.id));
            for (var _c = 0, namespaceRefs_1 = namespaceRefs; _c < namespaceRefs_1.length; _c++) {
                var edge = namespaceRefs_1[_c];
                assert(callIds.has(edge.to_id), "teamapp: oauth_user_data_call edge target must resolve to external_http_call (".concat(edge.to_id, ")"));
            }
        }
        else if (oauthUserDataCall === null) {
            seenOAuthNamespaceWithNullUserDataCall += 1;
            assert(namespaceRefs.length === 0, "teamapp: oauth namespace ".concat(oauthNamespace.id, " with null oauth_user_data_call must not emit oauth_user_data_call refs"));
        }
    };
    for (var _i = 0, oauthNamespaces_1 = oauthNamespaces; _i < oauthNamespaces_1.length; _i++) {
        var oauthNamespace = oauthNamespaces_1[_i];
        _loop_1(oauthNamespace);
    }
    assert(seenOAuthNamespaceWithUserDataCall > 0, "teamapp: expected at least one oauth_namespace with non-null oauth_user_data_call");
    assert(seenOAuthNamespaceWithNullUserDataCall > 0, "teamapp: expected at least one oauth_namespace with normalized-null oauth_user_data_call path");
    var authSourceFallbackNamespaces = inventory.entries.filter(function (entry) {
        var _a, _b;
        return entry.entity_class === "external_http_namespace" &&
            (((_a = entry.meta) === null || _a === void 0 ? void 0 : _a.auth_source) === "absent" || ((_b = entry.meta) === null || _b === void 0 ? void 0 : _b.auth_source) === "null");
    });
    assert(authSourceFallbackNamespaces.length > 0, "teamapp: expected at least one external_http_namespace with auth_source absent/null normalization");
    var _loop_2 = function (namespaceEntry) {
        var namespaceRefs = oauthRefs.filter(function (edge) { return edge.from_id === namespaceEntry.id; });
        assert(namespaceRefs.length === 0, "teamapp: auth_source fallback namespace ".concat(namespaceEntry.id, " must not emit oauth_user_data_call refs"));
    };
    for (var _b = 0, authSourceFallbackNamespaces_1 = authSourceFallbackNamespaces; _b < authSourceFallbackNamespaces_1.length; _b++) {
        var namespaceEntry = authSourceFallbackNamespaces_1[_b];
        _loop_2(namespaceEntry);
    }
}
function assertFailClosedDecoderBehavior() {
    assertThrows(function () { return (0, message_tree_js_1.decodeMessageTree)({ type: "UnknownMessageTreeOperator" }, { strict: true }); }, "decodeMessageTree(strict=true) must throw on unknown operators");
    assertThrows(function () { return (0, message_tree_js_1.decodeMessageTree)({ type: "Message", name: "unknown@@message@@token" }, { strict: true }); }, "decodeMessageTree(strict=true) must reject malformed Message operator/accessor names");
    assertThrows(function () { return (0, message_tree_js_1.decodeMessageTree)({ type: "Message", name: "totally_valid_identifier_token" }, { strict: true }); }, "decodeMessageTree(strict=true) must reject identifier-shaped unknown Message operator/accessor names");
    var normalPrivacyCondition = {
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
    var decodedPrivacyCondition = (0, message_tree_js_1.decodeMessageTree)(normalPrivacyCondition, { strict: true });
    assert(decodedPrivacyCondition.kind === "operation" && decodedPrivacyCondition.op === "Message", "decodeMessageTree(strict=true) must support Message/InjectedValue nodes for privacy conditions");
    var privacyAccessors = (0, message_tree_js_1.decodeMessageTreeAccessors)(normalPrivacyCondition, { strict: true });
    assert(privacyAccessors.includes("role_option_admin"), "decodeMessageTreeAccessors(strict=true) must collect accessors nested in Message/InjectedValue args");
    assertThrows(function () { return (0, message_tree_js_1.decodeMessageTree)({ type: "Message", next: 42 }, { strict: true }); }, "decodeMessageTree(strict=true) must throw on malformed Message next nodes");
    var externalApi = (0, accessor_js_1.decodeAccessor)("_api_c2_customer_email", { strict: true });
    assert(externalApi.kind === "external_api_field" && externalApi.precedence === "_api_c2", "decodeAccessor must deterministically resolve _api_c2_* as external_api_field");
    var roleOption = (0, accessor_js_1.decodeAccessor)("role_option_admin", { strict: true });
    assert(roleOption.kind === "privacy_role_option" && roleOption.precedence === "role_option", "decodeAccessor must deterministically resolve role_option_* before fallback patterns");
    var customLookup = (0, accessor_js_1.decodeAccessor)("custom_state_dashboard", {
        strict: true,
        customNameToId: {
            custom_state_dashboard: {
                ref: "state_entry",
            },
        },
    });
    assert(customLookup.kind === "custom_name_lookup" && customLookup.precedence === "custom_name_to_id", "decodeAccessor must prioritize customNameToId lookup before custom_state suffix matching");
    var customState = (0, accessor_js_1.decodeAccessor)("custom_state_dashboard", { strict: true });
    assert(customState.kind === "custom_state_ref" && customState.precedence === "custom_state", "decodeAccessor must resolve custom_state_* suffixes when customNameToId misses");
    assertThrows(function () { return (0, accessor_js_1.decodeAccessor)("unknown@@accessor@@token", { strict: true }); }, "decodeAccessor(strict=true) must throw on unknown accessors");
    assertThrows(function () { return (0, accessor_js_1.decodeAccessor)("totally_valid_identifier_token", { strict: true }); }, "decodeAccessor(strict=true) must reject identifier-shaped unknown runtime accessors");
    assertThrows(function () { return (0, accessor_js_1.decodeAccessor)("role_option_", { strict: true }); }, "decodeAccessor(strict=true) must reject empty role_option suffix");
    var knownHostClass = (0, text_expression_hosts_js_1.resolveTextExpressionHostClass)("/pages/p1/elements/e1/properties/text", "text");
    assert(knownHostClass === "render_prop", "resolveTextExpressionHostClass must deterministically resolve known host keys");
    var formattingHostClass = (0, text_expression_hosts_js_1.resolveTextExpressionHostClass)("/pages/p1/elements/e1/properties/label", "label");
    assert(formattingHostClass === "formatting_utility", "resolveTextExpressionHostClass must resolve formatting utility hosts");
    var workflowSubstitutionHost = (0, text_expression_hosts_js_1.resolveTextExpressionHostClass)("/pages/p1/workflows/w1/actions/a1/properties/body_params_name", "body_params_name");
    assert(workflowSubstitutionHost === "workflow_api_substitution", "resolveTextExpressionHostClass must resolve workflow API substitution hosts");
    var opaqueElementDefinitionHost = (0, text_expression_hosts_js_1.resolveTextExpressionHostClass)("/element_definitions/ed1/properties/custom_dynamic_value", "custom_dynamic_value");
    assert(opaqueElementDefinitionHost === "element_definition_opaque", "resolveTextExpressionHostClass must resolve element definition opaque hosts");
    var unknownHostClass = (0, text_expression_hosts_js_1.resolveTextExpressionHostClass)("/pages/p1/elements/e1/properties/unknown_host", "zzz");
    assert(unknownHostClass === null, "resolveTextExpressionHostClass must fail closed on unknown host keys");
    assertThrows(function () { return assert(unknownHostClass !== null, "unknown TextExpression hosts must fail acceptance assertions"); }, "acceptance assertions must treat unknown TextExpression hosts as failure");
    for (var _i = 0, _a = [0, 1, true, false, null]; _i < _a.length; _i++) {
        var rawValue = _a[_i];
        var decoded = (0, data_source_js_1.decodeDataSource)(rawValue);
        assert(decoded.kind === "opaque_scalar" && decoded.isUnknown === false && decoded.sourceType === null, "decodeDataSource must classify number/bool/null as opaque_scalar");
    }
    for (var _b = 0, _c = ["plain-text", undefined, function () { return null; }]; _b < _c.length; _b++) {
        var rawValue = _c[_b];
        var decoded = (0, data_source_js_1.decodeDataSource)(rawValue);
        assert(decoded.kind === "unknown" && decoded.isUnknown === true, "decodeDataSource must classify unsupported non-object forms as unknown");
    }
}
function extractBodyTemplateRefs(template) {
    var refs = new Set();
    var pattern = /<([A-Za-z0-9_]+)>/g;
    var match = pattern.exec(template);
    while (match) {
        var name_1 = match[1];
        if (name_1) {
            refs.add(name_1);
        }
        match = pattern.exec(template);
    }
    return __spreadArray([], refs, true).sort(function (a, b) { return a.localeCompare(b); });
}
function validateTemplateParams(urlTemplate, bodyTemplate, declaredParams) {
    var declaredSet = new Set(declaredParams);
    var url = (0, url_decompose_js_1.decomposeUrlTemplate)(urlTemplate);
    var urlRefs = new Set(__spreadArray(__spreadArray([], url.pathParams, true), url.queryParams
        .filter(function (item) { return item.templated; })
        .map(function (item) { return item.name; }), true));
    for (var _i = 0, urlRefs_1 = urlRefs; _i < urlRefs_1.length; _i++) {
        var ref = urlRefs_1[_i];
        if (!declaredSet.has(ref)) {
            throw new Error("Dangling URL template ref: ".concat(ref));
        }
    }
    var bodyRefs = extractBodyTemplateRefs(bodyTemplate);
    for (var _a = 0, bodyRefs_1 = bodyRefs; _a < bodyRefs_1.length; _a++) {
        var ref = bodyRefs_1[_a];
        if (!declaredSet.has(ref)) {
            throw new Error("Dangling body template ref: ".concat(ref));
        }
    }
}
function assertTemplateAndPublicCredentialSyntheticTests() {
    validateTemplateParams("https://api.example.com/users/[user_id]/posts?status=[status]&sort=desc", "{\"user\":\"<user_id>\",\"status\":\"<status>\",\"limit\":\"<limit>\"}", ["user_id", "status", "limit"]);
    assertThrows(function () {
        return validateTemplateParams("https://api.example.com/users/[user_id]/posts?status=[status]", "{\"user\":\"<user_id>\",\"status\":\"<status>\",\"cursor\":\"<cursor>\"}", ["user_id", "status"]);
    }, "Template validator must fail on dangling URL/body refs");
    assertThrows(function () { return (0, url_decompose_js_1.decomposeUrlTemplate)("/relative/path/[id]"); }, "decomposeUrlTemplate must fail on malformed URL templates");
    var publicKeyScan = (0, public_keys_js_1.scanPublicIntegrationKeys)({
        plugins: {
            pluginfoo: true,
        },
        stripe_publishable_key: "pk_live_123",
        pluginfoo_site_key: "foo_site",
        pluginfoo_secret_token: "should_not_be_public",
        pluginfoo_installed_version: "1.2.3",
        unclassified_value: "noop",
    }, ["settings", "client_safe"]);
    var matchedKeys = new Set(publicKeyScan.matches.map(function (entry) { return entry.key; }));
    var suspiciousKeys = new Set(publicKeyScan.suspicious_matches.map(function (entry) { return entry.key; }));
    assert(matchedKeys.has("stripe_publishable_key"), "Expected prefix/suffix public key to be emitted");
    assert(matchedKeys.has("pluginfoo_site_key"), "Expected plugin-scoped public key to be emitted");
    assert(!matchedKeys.has("pluginfoo_installed_version"), "Cosmetic denylist key must not be emitted");
    assert(!matchedKeys.has("unclassified_value"), "Non-pattern key must not be emitted");
    assert(suspiciousKeys.has("pluginfoo_secret_token"), "Suspicious denylist suffix must route to suspicious bucket");
}
function hashOutputTree(rootPath) {
    return __awaiter(this, void 0, void 0, function () {
        var files, map, _i, files_1, file, text;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, index_js_1.listFilesRecursively)(rootPath)];
                case 1:
                    files = _a.sent();
                    map = new Map();
                    _i = 0, files_1 = files;
                    _a.label = 2;
                case 2:
                    if (!(_i < files_1.length)) return [3 /*break*/, 5];
                    file = files_1[_i];
                    return [4 /*yield*/, (0, index_js_1.readTextFile)(file)];
                case 3:
                    text = _a.sent();
                    map.set(file.replace("".concat(rootPath, "/"), ""), (0, hash_js_1.sha256Text)(text));
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/, map];
            }
        });
    });
}
function compareHashes(a, b) {
    assert(a.size === b.size, "Output file count changed between runs: ".concat(a.size, " vs ").concat(b.size));
    for (var _i = 0, _a = a.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], path = _b[0], hash = _b[1];
        var other = b.get(path);
        assert(other === hash, "Output hash mismatch for ".concat(path));
    }
}
function assertSliceConstraints(slices) {
    for (var _i = 0, slices_1 = slices; _i < slices_1.length; _i++) {
        var slice = slices_1[_i];
        assert(slice.tokens_estimate <= 48000, "Slice over budget: ".concat(slice.slice_id));
    }
}
function assertSmartqmsSliceRegression(slices) {
    var _a, _b;
    var bTbjuSlices = slices.filter(function (slice) { return slice.slice_id.startsWith("bTbju/"); });
    var expectedSliceIds = [
        "bTbju/__root",
        "bTbju/workflows/__part_A",
        "bTbju/workflows/__part_B",
        "bTbju/workflows/__part_C",
        "bTbju/elements/__remaining_children",
        "bTbju/elements/bUDUL/elements/__remaining_children",
        "bTbju/elements/bUDUL/elements/bUDUM/elements/__remaining_children",
    ].sort();
    var actualSliceIds = bTbjuSlices.map(function (slice) { return slice.slice_id; }).sort();
    assert(actualSliceIds.length === expectedSliceIds.length, "Expected ".concat(expectedSliceIds.length, " slices for bTbju, got ").concat(actualSliceIds.length));
    for (var index = 0; index < expectedSliceIds.length; index += 1) {
        var expected = expectedSliceIds[index];
        var actual = actualSliceIds[index];
        assert(actual === expected, "Unexpected bTbju slice tree entry at ".concat(index, ": ").concat(actual, " vs ").concat(expected));
    }
    var workflowSlices = bTbjuSlices.filter(function (slice) { return slice.slice_id.includes("/workflows/"); });
    assert(workflowSlices.length > 0, "Expected at least one workflow sub-slice for bTbju");
    for (var _i = 0, workflowSlices_1 = workflowSlices; _i < workflowSlices_1.length; _i++) {
        var slice = workflowSlices_1[_i];
        var envelope = (_a = slice.neighbour_context) === null || _a === void 0 ? void 0 : _a.trigger_envelope;
        assert(Boolean(envelope), "Missing trigger_envelope for workflow slice ".concat(slice.slice_id));
        assert(Boolean(envelope === null || envelope === void 0 ? void 0 : envelope.pointer), "Missing trigger pointer for ".concat(slice.slice_id));
        assert(((_b = envelope === null || envelope === void 0 ? void 0 : envelope.parent_chain.length) !== null && _b !== void 0 ? _b : 0) <= 3, "parent_chain > 3 for ".concat(slice.slice_id));
    }
}
function runM1Acceptance(workspaceRoot_1) {
    return __awaiter(this, arguments, void 0, function (workspaceRoot, outputDir) {
        var inputDir, pass1, pass2, _i, APPS_1, app, inputPath, out1, out2, first, second, _a, _b, expectation, count, hashA, hashB, unionEntries, _c, APPS_2, app, appName, inventoryPath, raw, _d, _e, unionInventory;
        if (outputDir === void 0) { outputDir = (0, node_path_1.join)(workspaceRoot, "b2c"); }
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    inputDir = (0, node_path_1.join)(workspaceRoot, "bubble-apps-metadata-examples");
                    pass1 = (0, node_path_1.join)(outputDir, "__run1");
                    pass2 = (0, node_path_1.join)(outputDir, "__run2");
                    return [4 /*yield*/, (0, index_js_1.removeDirIfExists)(pass1)];
                case 1:
                    _f.sent();
                    return [4 /*yield*/, (0, index_js_1.removeDirIfExists)(pass2)];
                case 2:
                    _f.sent();
                    _i = 0, APPS_1 = APPS;
                    _f.label = 3;
                case 3:
                    if (!(_i < APPS_1.length)) return [3 /*break*/, 9];
                    app = APPS_1[_i];
                    inputPath = (0, node_path_1.join)(inputDir, app.appFile);
                    out1 = (0, node_path_1.join)(pass1, app.appFile.replace(".bubble", ""));
                    out2 = (0, node_path_1.join)(pass2, app.appFile.replace(".bubble", ""));
                    return [4 /*yield*/, (0, ingest_js_1.runIngest)(inputPath, out1)];
                case 4:
                    first = _f.sent();
                    return [4 /*yield*/, (0, ingest_js_1.runIngest)(inputPath, out2)];
                case 5:
                    second = _f.sent();
                    for (_a = 0, _b = app.counts; _a < _b.length; _a++) {
                        expectation = _b[_a];
                        count = countByClass(first.inventory, expectation.className);
                        assert(count >= expectation.min, "".concat(app.appFile, ": ").concat(expectation.className, " expected >= ").concat(expectation.min, ", got ").concat(count));
                    }
                    assertSliceConstraints(first.slices);
                    if (app.appFile === "smartqms-33414.bubble") {
                        assertSmartqmsSliceRegression(first.slices);
                    }
                    if (app.appFile === "teamapp-75292.bubble") {
                        assertTeamappOAuthUserDataCallMapping(first.inventory, first.refs);
                    }
                    return [4 /*yield*/, hashOutputTree(out1)];
                case 6:
                    hashA = _f.sent();
                    return [4 /*yield*/, hashOutputTree(out2)];
                case 7:
                    hashB = _f.sent();
                    compareHashes(hashA, hashB);
                    // Check per-arm coverage on union by progressively merging inventories.
                    if (app.appFile === "barrow-no-temp.bubble") {
                        // deferred union check below after all runs
                    }
                    _f.label = 8;
                case 8:
                    _i++;
                    return [3 /*break*/, 3];
                case 9:
                    unionEntries = [];
                    _c = 0, APPS_2 = APPS;
                    _f.label = 10;
                case 10:
                    if (!(_c < APPS_2.length)) return [3 /*break*/, 13];
                    app = APPS_2[_c];
                    appName = app.appFile.replace(".bubble", "");
                    inventoryPath = (0, node_path_1.join)(pass1, appName, "index", "inventory.json");
                    _e = (_d = JSON).parse;
                    return [4 /*yield*/, (0, index_js_1.readTextFile)(inventoryPath)];
                case 11:
                    raw = _e.apply(_d, [_f.sent()]);
                    unionEntries.push.apply(unionEntries, raw.entries);
                    _f.label = 12;
                case 12:
                    _c++;
                    return [3 /*break*/, 10];
                case 13:
                    unionInventory = {
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
                    return [2 /*return*/];
            }
        });
    });
}
