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
exports.collectOpaqueInventoryIds = collectOpaqueInventoryIds;
exports.listRawIdLeaksInText = listRawIdLeaksInText;
exports.lintRawIdLeaksInDocTemplates = lintRawIdLeaksInDocTemplates;
var RAW_ID_TOKEN = /\b[A-Za-z][A-Za-z0-9]{4,12}\b/g;
function looksLikeOpaqueId(value) {
    if (value.length < 5) {
        return false;
    }
    var hasDigit = /\d/.test(value);
    var hasLower = /[a-z]/.test(value);
    var hasUpper = /[A-Z]/.test(value);
    return hasDigit || (hasLower && hasUpper);
}
function collectOpaqueInventoryIds(ids) {
    return new Set(ids.filter(function (id) {
        return /^[A-Za-z][A-Za-z0-9]{4,12}$/.test(id) &&
            !id.includes(":") &&
            !id.includes("_") &&
            looksLikeOpaqueId(id);
    }));
}
function listRawIdLeaksInText(text, opaqueIds) {
    var _a;
    var leaked = new Set();
    var matches = (_a = text.match(RAW_ID_TOKEN)) !== null && _a !== void 0 ? _a : [];
    for (var _i = 0, matches_1 = matches; _i < matches_1.length; _i++) {
        var token = matches_1[_i];
        if (opaqueIds.has(token)) {
            leaked.add(token);
        }
    }
    return __spreadArray([], leaked, true).sort(function (a, b) { return a.localeCompare(b); });
}
function isDocTemplatePath(path) {
    return path.startsWith("docs/") && path.endsWith(".md");
}
function isPhase5BucketDoc(path) {
    return /^docs\/[^/]+\/bucket_\d+\.md$/.test(path);
}
function lineHasExplicitMachineContext(line) {
    var trimmed = line.trim();
    if (trimmed.length === 0) {
        return true;
    }
    if (trimmed.startsWith("|")) {
        return true;
    }
    if (trimmed.startsWith("```")) {
        return true;
    }
    var machinePrefixes = [
        "id:",
        "entity_id:",
        "actor_id",
        "flow_id",
        "field_id",
        "source_id",
        "workflow_ref",
        "feature_path:",
        "Given workflow ",
        "- `",
        "## Entity `",
    ];
    return machinePrefixes.some(function (prefix) { return trimmed.startsWith(prefix); });
}
function lintRawIdLeaksInDocTemplates(artifacts, opaqueIds) {
    var _a, _b;
    var findings = [];
    for (var _i = 0, artifacts_1 = artifacts; _i < artifacts_1.length; _i++) {
        var artifact = artifacts_1[_i];
        if (!isDocTemplatePath(artifact.path)) {
            continue;
        }
        var lines = artifact.content.split("\n");
        if (isPhase5BucketDoc(artifact.path)) {
            var inProseSection = false;
            for (var index = 0; index < lines.length; index += 1) {
                var line = (_a = lines[index]) !== null && _a !== void 0 ? _a : "";
                var trimmed = line.trim();
                if (trimmed.startsWith("## ")) {
                    inProseSection = false;
                }
                if (trimmed === "- prose (human):") {
                    inProseSection = true;
                    continue;
                }
                if (!inProseSection) {
                    continue;
                }
                var leaks = listRawIdLeaksInText(line, opaqueIds);
                for (var _c = 0, leaks_1 = leaks; _c < leaks_1.length; _c++) {
                    var token = leaks_1[_c];
                    findings.push({
                        path: artifact.path,
                        line: index + 1,
                        token: token,
                        reason: "raw id in prose section",
                    });
                }
            }
            continue;
        }
        for (var index = 0; index < lines.length; index += 1) {
            var line = (_b = lines[index]) !== null && _b !== void 0 ? _b : "";
            if (lineHasExplicitMachineContext(line)) {
                continue;
            }
            var leaks = listRawIdLeaksInText(line, opaqueIds);
            for (var _d = 0, leaks_2 = leaks; _d < leaks_2.length; _d++) {
                var token = leaks_2[_d];
                findings.push({
                    path: artifact.path,
                    line: index + 1,
                    token: token,
                    reason: "raw id in human-facing line",
                });
            }
        }
    }
    return findings.sort(function (left, right) {
        if (left.path !== right.path) {
            return left.path.localeCompare(right.path);
        }
        if (left.line !== right.line) {
            return left.line - right.line;
        }
        return left.token.localeCompare(right.token);
    });
}
