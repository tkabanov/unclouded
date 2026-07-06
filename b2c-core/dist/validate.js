"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateIndexSubset = validateIndexSubset;
exports.validateRefs = validateRefs;
exports.validateOAuthRefs = validateOAuthRefs;
exports.validateDeterministicSetEquality = validateDeterministicSetEquality;
var deterministic_js_1 = require("./cover/deterministic.js");
var index_js_1 = require("./utils/index.js");
function normalizePointer(rawPath) {
    var withSlash = rawPath.startsWith("/") ? rawPath : "/".concat(rawPath);
    var compact = withSlash.slice(1);
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
    return withSlash;
}
function validateIndexSubset(root, inventory) {
    var _a, _b, _c;
    var errors = [];
    var idToPath = (_b = (_a = root._index) === null || _a === void 0 ? void 0 : _a.id_to_path) !== null && _b !== void 0 ? _b : {};
    var pointersById = new Map();
    for (var _i = 0, _d = inventory.entries; _i < _d.length; _i++) {
        var entry = _d[_i];
        if (!pointersById.has(entry.id)) {
            pointersById.set(entry.id, new Set());
        }
        (_c = pointersById.get(entry.id)) === null || _c === void 0 ? void 0 : _c.add(entry.pointer);
    }
    for (var _e = 0, _f = Object.entries(idToPath); _e < _f.length; _e++) {
        var _g = _f[_e], id = _g[0], rawPath = _g[1];
        var pointers = pointersById.get(id);
        if (!pointers || pointers.size === 0) {
            errors.push("_index.id_to_path id missing in inventory: ".concat(id));
            continue;
        }
        if (typeof rawPath !== "string") {
            errors.push("_index.id_to_path has non-string path for id: ".concat(id));
            continue;
        }
        var expectedPointer = normalizePointer(rawPath);
        if (!pointers.has(expectedPointer)) {
            errors.push("_index.id_to_path pointer mismatch for ".concat(id, ": expected ").concat(expectedPointer, ", got ").concat(Array.from(pointers).join(", ")));
        }
    }
    return { errors: errors };
}
function validateRefs(inventory, refs) {
    var errors = [];
    var ids = new Set(inventory.entries.map(function (entry) { return entry.id; }));
    for (var _i = 0, refs_1 = refs; _i < refs_1.length; _i++) {
        var edge = refs_1[_i];
        if (!ids.has(edge.from_id)) {
            errors.push("Dangling edge.from_id: ".concat(edge.from_id));
        }
        if (!ids.has(edge.to_id)) {
            errors.push("Dangling edge.to_id: ".concat(edge.to_id));
        }
    }
    return { errors: errors };
}
function validateOAuthRefs(root, refs) {
    var _a, _b;
    var errors = [];
    var apiConnector = (0, index_js_1.getRecord)((_b = (_a = root.settings) === null || _a === void 0 ? void 0 : _a.client_safe) === null || _b === void 0 ? void 0 : _b.apiconnector2);
    if (!apiConnector) {
        return { errors: errors };
    }
    var _loop_1 = function (nsId, nsUnknown) {
        var ns = (0, index_js_1.getRecord)(nsUnknown);
        if (!ns || (0, index_js_1.getString)(ns.auth) !== "oauth2_user") {
            return "continue";
        }
        var hasKey = Object.hasOwn(ns, "oauth_user_data_call");
        var oauthCallUrl = (0, index_js_1.getString)(ns.oauth_user_data_call);
        if (!hasKey || !oauthCallUrl) {
            return "continue";
        }
        var fromId = "external_ns:".concat(nsId);
        var hasEdge = refs.some(function (edge) { return edge.edge_kind === "oauth_user_data_call" && edge.from_id === fromId; });
        if (!hasEdge) {
            errors.push("Missing oauth_user_data_call edge for namespace ".concat(nsId));
        }
    };
    for (var _i = 0, _c = Object.entries(apiConnector); _i < _c.length; _i++) {
        var _d = _c[_i], nsId = _d[0], nsUnknown = _d[1];
        _loop_1(nsId, nsUnknown);
    }
    return { errors: errors };
}
function validateDeterministicSetEquality(inventory, deterministicCoveredIds) {
    var expected = (0, deterministic_js_1.expectedDeterministicInventoryIds)(inventory);
    var expectedSet = new Set(expected);
    var gotSet = new Set(deterministicCoveredIds);
    var errors = [];
    for (var _i = 0, expectedSet_1 = expectedSet; _i < expectedSet_1.length; _i++) {
        var id = expectedSet_1[_i];
        if (!gotSet.has(id)) {
            errors.push("Deterministic cover missing id: ".concat(id));
        }
    }
    for (var _a = 0, gotSet_1 = gotSet; _a < gotSet_1.length; _a++) {
        var id = gotSet_1[_a];
        if (!expectedSet.has(id)) {
            errors.push("Deterministic cover has unexpected id: ".concat(id));
        }
    }
    return { errors: errors };
}
