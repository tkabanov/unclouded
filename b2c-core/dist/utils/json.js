"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRecord = isRecord;
exports.getRecord = getRecord;
exports.getString = getString;
exports.getNumber = getNumber;
exports.asArray = asArray;
exports.jsonPointerEscape = jsonPointerEscape;
exports.toPointer = toPointer;
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function getRecord(value) {
    return isRecord(value) ? value : undefined;
}
function getString(value) {
    return typeof value === "string" ? value : undefined;
}
function getNumber(value) {
    return typeof value === "number" ? value : undefined;
}
function asArray(value) {
    return Array.isArray(value) ? value : [];
}
function jsonPointerEscape(value) {
    return value.replaceAll("~", "~0").replaceAll("/", "~1");
}
function toPointer(parts) {
    if (parts.length === 0) {
        return "/";
    }
    return "/".concat(parts.map(jsonPointerEscape).join("/"));
}
