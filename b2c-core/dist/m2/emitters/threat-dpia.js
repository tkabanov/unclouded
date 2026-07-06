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
exports.SECURITY_REVIEW_BANNER = void 0;
exports.emitThreatModelScaffold = emitThreatModelScaffold;
exports.emitDpiaScaffold = emitDpiaScaffold;
function stableJson(value) {
    return "".concat(JSON.stringify(value, null, 2), "\n");
}
exports.SECURITY_REVIEW_BANNER = "> **Review required:** deterministic scaffold generated from IR metadata; validate threat model and DPIA with a human security/privacy review.";
function renderThreatModel(views) {
    var lines = __spreadArray(__spreadArray(__spreadArray(__spreadArray([
        "# Threat Model Baseline",
        "",
        exports.SECURITY_REVIEW_BANNER,
        "",
        "## Actors",
        "",
        "| actor_id | privacy_role_refs |",
        "|---|---|"
    ], views.actors.map(function (actor) { return "| ".concat(actor.actor_id, " | ").concat(actor.privacy_role_refs.join(","), " |"); }), true), [
        "",
        "## Data Flows",
        "",
        "| flow_id | source_id |",
        "|---|---|"
    ], false), views.data_flows.map(function (flow) { return "| ".concat(flow.flow_id, " | ").concat(flow.source_id, " |"); }), true), [
        "",
    ], false);
    return "".concat(lines.join("\n"), "\n");
}
function renderDpia(views) {
    var lines = __spreadArray(__spreadArray(__spreadArray(__spreadArray([
        "# DPIA Lite Baseline",
        "",
        exports.SECURITY_REVIEW_BANNER,
        "",
        "## PII Categories",
        "",
        "| field_id | category |",
        "|---|---|"
    ], views.pii_categories.map(function (row) { return "| ".concat(row.field_id, " | ").concat(row.category, " |"); }), true), [
        "",
        "## Data Flows",
        "",
        "| flow_id | source_id |",
        "|---|---|"
    ], false), views.data_flows.map(function (flow) { return "| ".concat(flow.flow_id, " | ").concat(flow.source_id, " |"); }), true), [
        "",
    ], false);
    return "".concat(lines.join("\n"), "\n");
}
function emitThreatModelScaffold(views) {
    return [
        {
            path: "docs/security/threat-model.md",
            content: renderThreatModel(views),
        },
        {
            path: "agent/security/threat-index.json",
            content: stableJson({
                actors: views.actors,
                data_flows: views.data_flows,
            }),
        },
    ];
}
function emitDpiaScaffold(views) {
    return [
        {
            path: "docs/privacy/dpia-lite.md",
            content: renderDpia(views),
        },
        {
            path: "agent/security/dpia-index.json",
            content: stableJson({
                pii_categories: views.pii_categories,
                data_flows: views.data_flows,
            }),
        },
    ];
}
