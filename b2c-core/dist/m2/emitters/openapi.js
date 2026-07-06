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
exports.emitOpenApiScaffold = emitOpenApiScaffold;
var id_derivation_js_1 = require("../views/id-derivation.js");
function stableJson(value) {
    return "".concat(JSON.stringify(value, null, 2), "\n");
}
function toYamlValue(value) {
    if (value === null) {
        return "null";
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    return JSON.stringify(value);
}
function toYamlDoc(doc) {
    var _a, _b, _c;
    var lines = [
        "openapi: ".concat(JSON.stringify(doc.openapi)),
        "info:",
        "  title: ".concat(JSON.stringify(doc.info.title)),
        "  version: ".concat(JSON.stringify(doc.info.version)),
    ];
    if (doc.tags && doc.tags.length > 0) {
        lines.push("tags:");
        for (var _i = 0, _d = doc.tags; _i < _d.length; _i++) {
            var tag = _d[_i];
            lines.push("  - name: ".concat(JSON.stringify(tag.name)));
            lines.push("    description: ".concat(JSON.stringify(tag.description)));
        }
    }
    if (doc["x-b2c"]) {
        lines.push('"x-b2c":');
        lines.push("  generated_from: ".concat(JSON.stringify(doc["x-b2c"].generated_from)));
        lines.push("  operation_count: ".concat(doc["x-b2c"].operation_count));
    }
    lines.push("paths:");
    var pathKeys = Object.keys(doc.paths).sort(function (a, b) { return a.localeCompare(b); });
    for (var _e = 0, pathKeys_1 = pathKeys; _e < pathKeys_1.length; _e++) {
        var pathKey = pathKeys_1[_e];
        lines.push("  ".concat(JSON.stringify(pathKey), ":"));
        var methods = (_a = doc.paths[pathKey]) !== null && _a !== void 0 ? _a : {};
        var methodKeys = Object.keys(methods).sort(function (a, b) { return a.localeCompare(b); });
        for (var _f = 0, methodKeys_1 = methodKeys; _f < methodKeys_1.length; _f++) {
            var methodKey = methodKeys_1[_f];
            var operation = methods[methodKey];
            if (!operation) {
                continue;
            }
            lines.push("    ".concat(methodKey, ":"));
            lines.push("      operationId: ".concat(JSON.stringify(operation.operationId)));
            lines.push("      summary: ".concat(JSON.stringify(operation.summary)));
            lines.push("      tags:");
            for (var _g = 0, _h = operation.tags; _g < _h.length; _g++) {
                var tag = _h[_g];
                lines.push("        - ".concat(JSON.stringify(tag)));
            }
            lines.push("      responses:");
            var responseCodes = Object.keys(operation.responses).sort(function (a, b) { return a.localeCompare(b); });
            for (var _j = 0, responseCodes_1 = responseCodes; _j < responseCodes_1.length; _j++) {
                var responseCode = responseCodes_1[_j];
                lines.push("        ".concat(JSON.stringify(responseCode), ":"));
                lines.push("          description: ".concat(JSON.stringify((_c = (_b = operation.responses[responseCode]) === null || _b === void 0 ? void 0 : _b.description) !== null && _c !== void 0 ? _c : "")));
            }
            lines.push('      "x-b2c":');
            lines.push("        source_id: ".concat(JSON.stringify(operation["x-b2c"].source_id)));
            lines.push("        source_kind: ".concat(JSON.stringify(operation["x-b2c"].source_kind)));
            lines.push("        source_entity_class: ".concat(toYamlValue(operation["x-b2c"].source_entity_class)));
            lines.push("        source_pointer: ".concat(toYamlValue(operation["x-b2c"].source_pointer)));
        }
    }
    return "".concat(lines.join("\n"), "\n");
}
function sanitizePathSegment(value) {
    return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}
function operationPath(sourceId) {
    return "/ops/".concat(sanitizePathSegment(sourceId));
}
function operationMethod(method) {
    if (typeof method !== "string" || method.length === 0) {
        return "post";
    }
    return method === "delete_method" ? "delete" : method.toLowerCase();
}
function buildDoc(title, operations) {
    var _a;
    var paths = {};
    for (var _i = 0, operations_1 = operations; _i < operations_1.length; _i++) {
        var operation = operations_1[_i];
        var current = (_a = paths[operation.path]) !== null && _a !== void 0 ? _a : {};
        current[operation.method] = {
            operationId: operation.operationId,
            summary: "Operation for ".concat(operation.sourceId),
            tags: [operation.sourceKind],
            responses: {
                "200": {
                    description: "Deterministic baseline response",
                },
            },
            "x-b2c": {
                source_id: operation.sourceId,
                source_kind: operation.sourceKind,
                source_entity_class: operation.sourceEntityClass,
                source_pointer: operation.sourcePointer,
            },
        };
        paths[operation.path] = current;
    }
    return {
        openapi: "3.1.0",
        info: {
            title: title,
            version: "0.1.0-m2-baseline",
        },
        tags: [
            { name: "api_event", description: "Incoming API events mapped from inventory entries." },
            { name: "external_http_call", description: "Outgoing HTTP calls mapped from inventory entries." },
        ],
        "x-b2c": {
            generated_from: "inventory+views",
            operation_count: operations.length,
        },
        paths: paths,
    };
}
function emitOpenApiScaffold(views, byId) {
    var _a, _b, _c, _d;
    var incoming = views.openapi_operations
        .filter(function (operation) { return operation.source_kind === "api_event"; })
        .map(function (operation) {
        var _a, _b;
        var source = byId.get(operation.source_id);
        return {
            operationId: operation.operation_id,
            method: "post",
            path: operationPath(operation.source_id),
            sourceId: operation.source_id,
            sourceKind: operation.source_kind,
            sourceEntityClass: (_a = source === null || source === void 0 ? void 0 : source.entity_class) !== null && _a !== void 0 ? _a : null,
            sourcePointer: (_b = source === null || source === void 0 ? void 0 : source.pointer) !== null && _b !== void 0 ? _b : null,
        };
    })
        .sort(function (a, b) { return a.operationId.localeCompare(b.operationId); });
    var outgoing = views.openapi_operations
        .filter(function (operation) { return operation.source_kind === "external_http_call"; })
        .map(function (operation) {
        var _a, _b, _c;
        var source = byId.get(operation.source_id);
        return {
            operationId: operation.operation_id,
            method: operationMethod((_a = source === null || source === void 0 ? void 0 : source.meta) === null || _a === void 0 ? void 0 : _a.method),
            path: operationPath(operation.source_id),
            sourceId: operation.source_id,
            sourceKind: operation.source_kind,
            sourceEntityClass: (_b = source === null || source === void 0 ? void 0 : source.entity_class) !== null && _b !== void 0 ? _b : null,
            sourcePointer: (_c = source === null || source === void 0 ? void 0 : source.pointer) !== null && _c !== void 0 ? _c : null,
        };
    })
        .sort(function (a, b) { return a.operationId.localeCompare(b.operationId); });
    var incomingDoc = buildDoc("M2 Incoming API Baseline", incoming);
    var outgoingDoc = buildDoc("M2 Outgoing API Baseline", outgoing);
    var incomingByNamespace = new Map();
    for (var _i = 0, incoming_1 = incoming; _i < incoming_1.length; _i++) {
        var operation = incoming_1[_i];
        var namespace = (0, id_derivation_js_1.deriveOpenApiNamespaceSlug)("api_event", operation.sourceId);
        var bucket = (_a = incomingByNamespace.get(namespace)) !== null && _a !== void 0 ? _a : [];
        bucket.push(operation);
        incomingByNamespace.set(namespace, bucket);
    }
    var outgoingByNamespace = new Map();
    for (var _e = 0, outgoing_1 = outgoing; _e < outgoing_1.length; _e++) {
        var operation = outgoing_1[_e];
        var namespace = (0, id_derivation_js_1.deriveOpenApiNamespaceSlug)("external_http_call", operation.sourceId);
        var bucket = (_b = outgoingByNamespace.get(namespace)) !== null && _b !== void 0 ? _b : [];
        bucket.push(operation);
        outgoingByNamespace.set(namespace, bucket);
    }
    var artifacts = [
        {
            path: "agent/contracts/openapi-incoming.json",
            content: stableJson(incomingDoc),
        },
        {
            path: "agent/contracts/openapi-incoming.yaml",
            content: toYamlDoc(incomingDoc),
        },
        {
            path: "agent/contracts/openapi-outgoing.json",
            content: stableJson(outgoingDoc),
        },
        {
            path: "agent/contracts/openapi-outgoing.yaml",
            content: toYamlDoc(outgoingDoc),
        },
    ];
    for (var _f = 0, _g = __spreadArray([], incomingByNamespace.keys(), true).sort(function (a, b) { return a.localeCompare(b); }); _f < _g.length; _f++) {
        var namespace = _g[_f];
        artifacts.push({
            path: "agent/contracts/openapi-incoming/".concat(namespace, ".yaml"),
            content: toYamlDoc(buildDoc("M2 Incoming API Namespace: ".concat(namespace), (_c = incomingByNamespace.get(namespace)) !== null && _c !== void 0 ? _c : [])),
        });
    }
    for (var _h = 0, _j = __spreadArray([], outgoingByNamespace.keys(), true).sort(function (a, b) { return a.localeCompare(b); }); _h < _j.length; _h++) {
        var namespace = _j[_h];
        artifacts.push({
            path: "agent/contracts/openapi-outgoing/".concat(namespace, ".yaml"),
            content: toYamlDoc(buildDoc("M2 Outgoing API Namespace: ".concat(namespace), (_d = outgoingByNamespace.get(namespace)) !== null && _d !== void 0 ? _d : [])),
        });
    }
    return artifacts.sort(function (a, b) { return a.path.localeCompare(b.path); });
}
