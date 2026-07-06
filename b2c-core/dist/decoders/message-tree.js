"use strict";
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
exports.decodeMessageTree = decodeMessageTree;
exports.decodeMessageTreeAccessors = decodeMessageTreeAccessors;
exports.decodeMessageTreeTypedAst = decodeMessageTreeTypedAst;
exports.summarizeMessageTreeAstCoverage = summarizeMessageTreeAstCoverage;
var index_js_1 = require("../utils/index.js");
var accessor_js_1 = require("./accessor.js");
var KNOWN_OPS = new Set([
    "TextExpression",
    "GetDataFromAPI",
    "GetElement",
    "GetParamFromUrl",
    "PreviousStep",
    "Search",
    "ElementParent",
    "CurrentUser",
    "CurrentPageItem",
    "APIEventParameter",
    "OptionValue",
    "OneOptionValue",
    "AllOptionValue",
    "PageData",
    "Empty",
    "ArbitraryText",
    "Message",
    "InjectedValue",
    "ThisElement",
    "CurrentWorkflowItem",
]);
function decodeNode(value, strict, options) {
    var _a;
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return { kind: "literal", value: value };
    }
    if (Array.isArray(value)) {
        return {
            kind: "list",
            items: value.map(function (item) { return decodeNode(item, strict, options); }),
        };
    }
    if (!(0, index_js_1.isRecord)(value)) {
        if (strict && value !== undefined) {
            throw new Error("Malformed message-tree node: non-object value");
        }
        return { kind: "unknown", reason: "non-json-object", source_type: null };
    }
    var sourceType = typeof value.type === "string" ? value.type : null;
    var accessorName = typeof value.name === "string" ? value.name : null;
    if (sourceType) {
        if (!KNOWN_OPS.has(sourceType)) {
            if (strict) {
                throw new Error("Unknown message-tree op: ".concat(sourceType));
            }
            return {
                kind: "unknown",
                reason: "unknown-op:".concat(sourceType),
                source_type: sourceType,
            };
        }
        var args = [];
        if (sourceType === "Message") {
            if (!accessorName) {
                if (strict) {
                    throw new Error("Malformed Message node: name is required");
                }
            }
            else {
                if (strict) {
                    (0, accessor_js_1.decodeAccessor)(accessorName, {
                        runtimeAccessorCatalog: (_a = options.runtimeAccessorCatalog) !== null && _a !== void 0 ? _a : (0, accessor_js_1.sourceObservedRuntimeAccessorCatalog)(),
                        strict: true,
                    });
                }
                args.push({
                    kind: "accessor",
                    name: accessorName,
                    source_type: sourceType,
                });
            }
        }
        for (var _i = 0, _b = Object.entries(value).sort(function (_a, _b) {
            var left = _a[0];
            var right = _b[0];
            return left.localeCompare(right);
        }); _i < _b.length; _i++) {
            var _c = _b[_i], key = _c[0], child = _c[1];
            if (key === "type" || key === "name") {
                continue;
            }
            if (strict &&
                (sourceType === "Message" || sourceType === "InjectedValue") &&
                key === "next" &&
                child !== null &&
                !Array.isArray(child) &&
                !(0, index_js_1.isRecord)(child)) {
                throw new Error("Malformed ".concat(sourceType, " node: next must be object/array/null"));
            }
            args.push(decodeNode(child, strict, options));
        }
        return {
            kind: "operation",
            op: sourceType,
            args: args,
            source_type: sourceType,
        };
    }
    if (accessorName) {
        return {
            kind: "accessor",
            name: accessorName,
            source_type: sourceType,
        };
    }
    var fields = {};
    for (var _d = 0, _e = Object.keys(value).sort(function (a, b) { return a.localeCompare(b); }); _d < _e.length; _d++) {
        var key = _e[_d];
        fields[key] = decodeNode(value[key], strict, options);
    }
    return { kind: "object", fields: fields };
}
function collectAccessorNames(node, out) {
    if (node.kind === "accessor") {
        out.add(node.name);
        return;
    }
    if (node.kind === "list") {
        for (var _i = 0, _a = node.items; _i < _a.length; _i++) {
            var item = _a[_i];
            collectAccessorNames(item, out);
        }
        return;
    }
    if (node.kind === "object") {
        for (var _b = 0, _c = Object.values(node.fields); _b < _c.length; _b++) {
            var child = _c[_b];
            collectAccessorNames(child, out);
        }
        return;
    }
    if (node.kind === "operation") {
        for (var _d = 0, _e = node.args; _d < _e.length; _d++) {
            var child = _e[_d];
            collectAccessorNames(child, out);
        }
    }
}
function decodeMessageTree(rawValue, options) {
    if (options === void 0) { options = {}; }
    return decodeNode(rawValue, options.strict === true, options);
}
function decodeMessageTreeAccessors(rawValue, options) {
    if (options === void 0) { options = {}; }
    var decoded = decodeMessageTree(rawValue, options);
    var names = new Set();
    collectAccessorNames(decoded, names);
    return __spreadArray([], names, true).sort(function (a, b) { return a.localeCompare(b); });
}
function toTypedAstNode(node, options) {
    var _a, _b;
    if (node.kind === "literal") {
        return { kind: "literal", value: node.value };
    }
    if (node.kind === "list") {
        return {
            kind: "list",
            items: node.items.map(function (item) { return toTypedAstNode(item, options); }),
        };
    }
    if (node.kind === "object") {
        var fields = {};
        for (var _i = 0, _c = Object.entries(node.fields); _i < _c.length; _i++) {
            var _d = _c[_i], key = _d[0], value = _d[1];
            fields[key] = toTypedAstNode(value, options);
        }
        return { kind: "object", fields: fields };
    }
    if (node.kind === "accessor") {
        var accessor = (0, accessor_js_1.decodeAccessor)(node.name, {
            customNameToId: (_a = options.customNameToId) !== null && _a !== void 0 ? _a : null,
            runtimeAccessorCatalog: (_b = options.runtimeAccessorCatalog) !== null && _b !== void 0 ? _b : (0, accessor_js_1.sourceObservedRuntimeAccessorCatalog)(),
            strict: options.strict === true,
        });
        return {
            kind: "accessor",
            accessor: (0, accessor_js_1.accessorRefToJson)(accessor),
        };
    }
    if (node.kind === "operation") {
        return {
            kind: "operation",
            op: node.op,
            source_type: node.source_type,
            args: node.args.map(function (child) { return toTypedAstNode(child, options); }),
        };
    }
    if (options.strict) {
        throw new Error("Unknown message-tree node kind: ".concat(node.kind));
    }
    return {
        kind: "object",
        fields: {
            unsupported: {
                kind: "literal",
                value: "unknown:".concat(node.reason),
            },
        },
    };
}
function decodeMessageTreeTypedAst(rawValue, options) {
    if (options === void 0) { options = {}; }
    var decoded = decodeMessageTree(rawValue, options);
    return toTypedAstNode(decoded, options);
}
function summarizeMessageTreeAstCoverage(ast) {
    var opCounts = new Map();
    var accessorKindCounts = new Map();
    var nodeCount = 0;
    var maxDepth = 0;
    var operationCount = 0;
    var accessorCount = 0;
    var literalCount = 0;
    var listCount = 0;
    var objectCount = 0;
    var unknownNodeCount = 0;
    var walk = function (node, depth) {
        var _a, _b;
        nodeCount += 1;
        maxDepth = Math.max(maxDepth, depth);
        switch (node.kind) {
            case "literal":
                literalCount += 1;
                return;
            case "list":
                listCount += 1;
                for (var _i = 0, _c = node.items; _i < _c.length; _i++) {
                    var item = _c[_i];
                    walk(item, depth + 1);
                }
                return;
            case "object":
                objectCount += 1;
                for (var _d = 0, _e = Object.values(node.fields); _d < _e.length; _d++) {
                    var child = _e[_d];
                    walk(child, depth + 1);
                }
                return;
            case "accessor": {
                accessorCount += 1;
                var kind = node.accessor.kind;
                if (typeof kind === "string") {
                    accessorKindCounts.set(kind, ((_a = accessorKindCounts.get(kind)) !== null && _a !== void 0 ? _a : 0) + 1);
                    if (kind === "unknown") {
                        unknownNodeCount += 1;
                    }
                }
                else {
                    unknownNodeCount += 1;
                }
                return;
            }
            case "operation":
                operationCount += 1;
                opCounts.set(node.op, ((_b = opCounts.get(node.op)) !== null && _b !== void 0 ? _b : 0) + 1);
                for (var _f = 0, _g = node.args; _f < _g.length; _f++) {
                    var child = _g[_f];
                    walk(child, depth + 1);
                }
                return;
            default:
                unknownNodeCount += 1;
        }
    };
    walk(ast, 1);
    var normalizedAccessorKinds = [
        "external_api_field",
        "privacy_role_option",
        "custom_name_lookup",
        "custom_state_ref",
        "bubble_runtime_accessor",
        "unknown",
    ];
    return {
        schema: "b2c.message_tree_ast_coverage.v1",
        node_count: nodeCount,
        max_depth: maxDepth,
        operation_count: operationCount,
        accessor_count: accessorCount,
        literal_count: literalCount,
        list_count: listCount,
        object_count: objectCount,
        unknown_node_count: unknownNodeCount,
        op_counts: Object.fromEntries(__spreadArray([], opCounts.entries(), true).sort(function (_a, _b) {
            var left = _a[0];
            var right = _b[0];
            return left.localeCompare(right);
        })),
        accessor_kind_counts: Object.fromEntries(normalizedAccessorKinds.map(function (kind) { var _a; return [kind, (_a = accessorKindCounts.get(kind)) !== null && _a !== void 0 ? _a : 0]; })),
    };
}
