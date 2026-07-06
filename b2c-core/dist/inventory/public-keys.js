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
exports.scanPublicIntegrationKeys = scanPublicIntegrationKeys;
var index_js_1 = require("../utils/index.js");
var SUFFIX_PATTERNS = [
    "_public_key_live",
    "_public_key_test",
    "_client_id_live",
    "_client_id_test",
    "_site_key",
    "_publishable_key",
];
var PREFIX_PATTERNS = [
    "stripe_",
    "facebook_meta_tag_",
    "recaptcha_",
    "google_maps_",
    "mapbox_",
];
var SUSPICIOUS_SUFFIXES = [
    "_secret",
    "_private",
    "_token",
    "_password",
    "_api_key",
    "_apikey",
    "_secret_key",
    "_signing_key",
];
var COSMETIC_SUFFIXES = [
    "_installed_version",
    "_checkout_image",
    "_checkout_name",
    "_checkout_version",
];
function deriveSuffix(key) {
    var index = key.lastIndexOf("_");
    return index >= 0 ? key.slice(index) : key;
}
function resolvePluginScope(key, pluginIds) {
    var sorted = __spreadArray([], pluginIds, true).sort(function (a, b) {
        if (a.length !== b.length) {
            return b.length - a.length;
        }
        return a.localeCompare(b);
    });
    for (var _i = 0, sorted_1 = sorted; _i < sorted_1.length; _i++) {
        var pluginId = sorted_1[_i];
        if (key.startsWith("".concat(pluginId, "_"))) {
            return pluginId;
        }
    }
    return null;
}
function scanPublicIntegrationKeys(clientSafe, pointerPrefix) {
    var _a;
    var plugins = (_a = (0, index_js_1.getRecord)(clientSafe.plugins)) !== null && _a !== void 0 ? _a : {};
    var pluginIds = Object.keys(plugins).sort();
    var matches = [];
    var suspiciousMatches = [];
    var _loop_1 = function (key) {
        var rawValue = clientSafe[key];
        if (typeof rawValue !== "string") {
            return "continue";
        }
        var pointer = (0, index_js_1.toPointer)(__spreadArray(__spreadArray([], pointerPrefix, true), [key], false));
        var pluginIdRef = resolvePluginScope(key, pluginIds);
        var denylisted = SUSPICIOUS_SUFFIXES.find(function (suffix) { return key.endsWith(suffix); });
        if (denylisted) {
            var issue = {
                key: key,
                pointer: pointer,
                reason: "denylisted_suffix",
                denylist_suffix: denylisted,
            };
            if (pluginIdRef !== null) {
                issue.plugin_id_ref = pluginIdRef;
            }
            suspiciousMatches.push(issue);
            return "continue";
        }
        if (COSMETIC_SUFFIXES.some(function (suffix) { return key.endsWith(suffix); })) {
            return "continue";
        }
        var bySuffix = SUFFIX_PATTERNS.some(function (suffix) { return key.endsWith(suffix); });
        var byPrefix = PREFIX_PATTERNS.some(function (prefix) { return key.startsWith(prefix); });
        var byPlugin = pluginIdRef !== null;
        if (!(bySuffix || byPrefix || byPlugin)) {
            return "continue";
        }
        var match = {
            key: key,
            pointer: pointer,
            value: rawValue,
            suffix: deriveSuffix(key),
            match_source: byPlugin ? "plugin_scoped" : bySuffix ? "suffix_pattern" : "prefix_pattern",
        };
        if (pluginIdRef !== null) {
            match.plugin_id_ref = pluginIdRef;
        }
        matches.push(match);
    };
    for (var _i = 0, _b = Object.keys(clientSafe).sort(); _i < _b.length; _i++) {
        var key = _b[_i];
        _loop_1(key);
    }
    return {
        matches: matches,
        suspicious_matches: suspiciousMatches,
    };
}
