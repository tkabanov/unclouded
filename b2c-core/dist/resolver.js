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
exports.buildResolver = buildResolver;
var index_js_1 = require("./utils/index.js");
function valueAtPointer(root, pointer) {
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
        if (!(0, index_js_1.getRecord)(cursor)) {
            return undefined;
        }
        cursor = cursor[part];
    }
    return cursor;
}
function computeRawDisplayName(root, pointer, id) {
    var node = valueAtPointer(root, pointer);
    var record = (0, index_js_1.getRecord)(node);
    if (!record) {
        return id;
    }
    var candidates = [
        (0, index_js_1.getString)(record.display),
        (0, index_js_1.getString)(record.name),
        (0, index_js_1.getString)(record.title),
        (0, index_js_1.getString)(record.id),
    ];
    for (var _i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
        var candidate = candidates_1[_i];
        if (candidate && candidate.trim().length > 0) {
            return candidate.trim();
        }
    }
    return id;
}
function buildResolver(root, inventory) {
    var _a;
    var provisional = inventory.entries.map(function (entry) { return ({
        id: entry.id,
        rawName: computeRawDisplayName(root, entry.pointer, entry.id),
    }); });
    var byName = new Map();
    for (var _i = 0, provisional_1 = provisional; _i < provisional_1.length; _i++) {
        var item = provisional_1[_i];
        var existing = (_a = byName.get(item.rawName)) !== null && _a !== void 0 ? _a : [];
        existing.push(item.id);
        byName.set(item.rawName, existing);
    }
    var entries = provisional.map(function (item) {
        var _a;
        var siblings = (_a = byName.get(item.rawName)) !== null && _a !== void 0 ? _a : [];
        var suffix = (0, index_js_1.shortHash)(item.id, 6);
        var displayName = siblings.length > 1 ? "".concat(item.rawName, "__").concat(suffix) : item.rawName;
        return {
            id: item.id,
            display_name: displayName,
            short_hash: suffix,
        };
    });
    entries.sort(function (a, b) { return a.id.localeCompare(b.id); });
    var collisions = {};
    for (var _b = 0, _c = byName.entries(); _b < _c.length; _b++) {
        var _d = _c[_b], name_1 = _d[0], ids = _d[1];
        if (ids.length > 1) {
            collisions[name_1] = __spreadArray([], ids, true).sort();
        }
    }
    return { entries: entries, collisions: collisions };
}
