"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveOperationId = deriveOperationId;
exports.deriveOpenApiNamespaceSlug = deriveOpenApiNamespaceSlug;
function normalizeSlug(value) {
    var slug = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return slug.length > 0 ? slug : "unknown";
}
function stableSuffix(value) {
    var hash = 0x811c9dc5;
    for (var index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(36);
}
function inferredNamespaceToken(sourceId) {
    var _a, _b, _c, _d, _e;
    var segments = sourceId.split(":").filter(function (segment) { return segment.length > 0; });
    if (sourceId.startsWith("external_call:") && segments.length >= 2) {
        return (_a = segments[1]) !== null && _a !== void 0 ? _a : "external";
    }
    if (sourceId.startsWith("api_event:") && segments.length >= 2) {
        return (_b = segments[1]) !== null && _b !== void 0 ? _b : "api";
    }
    if (segments.length >= 2) {
        return (_d = (_c = segments[1]) !== null && _c !== void 0 ? _c : segments[0]) !== null && _d !== void 0 ? _d : "default";
    }
    return (_e = segments[0]) !== null && _e !== void 0 ? _e : "default";
}
function deriveOperationId(sourceKind, sourceId) {
    var lane = sourceKind === "api_event" ? "incoming" : "outgoing";
    var base = normalizeSlug(sourceId);
    return "".concat(lane, "-").concat(base, "-").concat(stableSuffix(sourceId));
}
function deriveOpenApiNamespaceSlug(sourceKind, sourceId) {
    var lane = sourceKind === "api_event" ? "incoming" : "outgoing";
    var namespaceToken = normalizeSlug(inferredNamespaceToken(sourceId));
    return "".concat(lane, "-").concat(namespaceToken);
}
